#!/usr/bin/env python3
"""
Test script for coloring page image generation.
Uses SD-Turbo to generate kawaii-style colored cartoons,
then extracts outlines via dark-pixel thresholding + cleanup.

Usage:
    source .venv/bin/activate
    python test_generation.py                    # Run all test prompts
    python test_generation.py --prompt "a cat"   # Test specific prompt
"""

import argparse
import time
from pathlib import Path

import torch
from PIL import Image, ImageFilter, ImageOps

OUTPUT_DIR = Path("test_outputs")
OUTPUT_DIR.mkdir(exist_ok=True)

# Detect best device
if torch.cuda.is_available():
    DEVICE = "cuda"
elif torch.backends.mps.is_available():
    DEVICE = "mps"
else:
    DEVICE = "cpu"

DTYPE = torch.float16 if DEVICE != "cpu" else torch.float32

print(f"Device: {DEVICE}, dtype: {DTYPE}")

# --- Prompts ---
COLORING_PROMPTS = [
    "a dinosaur",
    "a butterfly",
    "a house",
    "a cat",
    "a rocket ship",
    "a flower",
    "a fish",
    "a unicorn",
]

# Best prompt template: kawaii colored cartoon → extract outlines
PROMPT_PREFIX = "kawaii cute simple "
PROMPT_SUFFIX = ", white background, centered, simple, flat colors, no detail"
NEGATIVE_PROMPT = "detailed, realistic, photographic, complex background, scenery, texture, text, watermark, multiple objects, frame, border, pattern"


def load_pipeline():
    """Load SD-Turbo pipeline."""
    from diffusers import AutoPipelineForText2Image

    pipe = AutoPipelineForText2Image.from_pretrained(
        "stabilityai/sd-turbo",
        torch_dtype=DTYPE,
        variant="fp16" if DTYPE == torch.float16 else None,
    )
    pipe = pipe.to(DEVICE)
    return pipe


def to_coloring_page(img: Image.Image) -> Image.Image:
    """Convert a colored cartoon into a clean B&W coloring page.

    Pipeline:
    1. Grayscale
    2. Keep only dark pixels (< 80) as black outlines
    3. MinFilter(3) to thicken lines
    4. MedianFilter(7) to remove small noise/background dots
    """
    gray = img.convert("L")
    # Keep only the darkest pixels (actual drawn outlines)
    outline = gray.point(lambda x: 0 if x < 80 else 255, "L")
    # Thicken the outlines
    outline = outline.filter(ImageFilter.MinFilter(3))
    # Remove small scattered noise (background dots, speckles)
    outline = outline.filter(ImageFilter.MedianFilter(7))
    return outline


def generate(pipe, prompt: str, idx: int):
    """Generate one coloring page and save raw + processed versions."""
    full_prompt = PROMPT_PREFIX + prompt + PROMPT_SUFFIX

    print(f"  [{idx}] {prompt}...")
    start = time.time()

    with torch.no_grad():
        result = pipe(
            prompt=full_prompt,
            negative_prompt=NEGATIVE_PROMPT,
            width=512,
            height=512,
            num_inference_steps=2,
            guidance_scale=0.0,
        )

    elapsed = time.time() - start
    img = result.images[0]

    slug = prompt.replace(" ", "_")[:30]
    base = f"{idx}_{slug}"

    # Save raw colored output
    img.save(OUTPUT_DIR / f"{base}_raw.png")

    # Convert to coloring page and save
    coloring = to_coloring_page(img)
    coloring.save(OUTPUT_DIR / f"{base}_coloring.png")

    print(f"      Done in {elapsed:.1f}s -> {base}_*.png")
    return elapsed


def main():
    parser = argparse.ArgumentParser(description="Test coloring page generation")
    parser.add_argument(
        "--prompt", type=str, default=None,
        help="Custom prompt (otherwise uses built-in list)",
    )
    args = parser.parse_args()

    print("Loading SD-Turbo...")
    start = time.time()
    pipe = load_pipeline()
    print(f"Model loaded in {time.time() - start:.1f}s")

    prompts = [args.prompt] if args.prompt else COLORING_PROMPTS

    total_time = 0
    for i, prompt in enumerate(prompts):
        total_time += generate(pipe, prompt, i)

    print(f"\n{len(prompts)} images in {total_time:.1f}s ({total_time/len(prompts):.1f}s avg)")
    print(f"Results: {OUTPUT_DIR.absolute()}/")


if __name__ == "__main__":
    main()
