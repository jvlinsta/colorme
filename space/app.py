"""
ColorMe coloring page generator — Hugging Face Space (Gradio, CPU-only).

Generates kawaii-style coloring pages from text prompts using SD-Turbo,
then post-processes into clean black-and-white outlines.
"""

import gradio as gr
import torch
from diffusers import StableDiffusionPipeline
from PIL import Image, ImageFilter

PROMPT_PREFIX = "kawaii cute simple "
PROMPT_SUFFIX = ", white background, centered, simple, flat colors, no detail"
NEGATIVE_PROMPT = (
    "detailed, realistic, photographic, complex background, scenery, "
    "texture, text, watermark, multiple objects, frame, border, pattern"
)

pipe = StableDiffusionPipeline.from_pretrained(
    "stabilityai/sd-turbo",
    torch_dtype=torch.float32,
)


def to_coloring_page(img: Image.Image) -> Image.Image:
    """Convert a colored cartoon into a clean B&W coloring page."""
    gray = img.convert("L")
    outline = gray.point(lambda x: 0 if x < 80 else 255, "L")
    outline = outline.filter(ImageFilter.MinFilter(3))
    outline = outline.filter(ImageFilter.MedianFilter(7))
    return outline.convert("RGB")


def generate(prompt: str) -> Image.Image:
    full_prompt = PROMPT_PREFIX + prompt + PROMPT_SUFFIX
    with torch.no_grad():
        result = pipe(
            prompt=full_prompt,
            negative_prompt=NEGATIVE_PROMPT,
            width=512,
            height=512,
            num_inference_steps=2,
            guidance_scale=0.0,
        )
    return to_coloring_page(result.images[0])


demo = gr.Interface(
    fn=generate,
    inputs=gr.Textbox(label="What should we draw?", placeholder="a happy dinosaur"),
    outputs=gr.Image(label="Coloring Page", type="pil"),
    title="ColorMe Generator",
    description="Generates kid-friendly coloring pages from text prompts. May take 30-60s on CPU.",
)

if __name__ == "__main__":
    demo.launch()
