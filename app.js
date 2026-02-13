// ============================================================
// ColorMe - Drawing & Coloring App for Kids
// ============================================================

import { AutoTokenizer } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3';

// ============ Constants ============
const COLORS = [
  '#FF0000', '#FF6B35', '#FFD700', '#7CFC00',
  '#00AA00', '#00CED1', '#4169E1', '#0000CD',
  '#8A2BE2', '#FF69B4', '#FF1493', '#FFB6C1',
  '#87CEEB', '#8B4513', '#D2691E', '#000000',
  '#808080', '#FFFFFF',
];

const MAX_UNDO = 30;

// ============ SD-Turbo Constants ============
const SD_TURBO_BASE = 'https://huggingface.co/schmuell/sd-turbo-ort-web/resolve/main';
const SD_TURBO_MODELS = {
  text_encoder: { url: 'text_encoder/model.onnx', size: 650 },
  unet: { url: 'unet/model.onnx', size: 1653 },
  vae_decoder: { url: 'vae_decoder/model.onnx', size: 94 },
};
const TOKENIZER_MODEL = 'Xenova/clip-vit-base-patch16';
const PROMPT_PREFIX = 'kawaii cute simple ';
const PROMPT_SUFFIX = ', white background, centered, simple, flat colors, no detail';
const NEGATIVE_PROMPT = 'detailed, realistic, photographic, complex background, scenery, texture, text, watermark, multiple objects, frame, border, pattern';
const TOTAL_MODEL_MB = 650 + 1653 + 94;

// SD-Turbo scheduler constants
const SIGMA = 14.6146;
const VAE_SCALING = 0.18215;

// ============ State ============
const state = {
  tool: 'draw',
  color: '#FF0000',
  brushSize: 12,
  isDrawing: false,
  lastX: 0,
  lastY: 0,
  strokes: [],
  currentStroke: null,
  hasSVG: false,
  hasRasterBG: false,
};

// ============ Model State ============
const sdSessions = {};
let sdTokenizer = null;
let sdInitPromise = null;
let hasWebGPU = false;

// ============ DOM Refs ============
let canvas, ctx, bgCanvas, bgCtx, svgContainer, emptyState;

// ============ Built-in Templates ============
const TEMPLATES = [
  {
    name: 'House',
    svg: `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="450" width="800" height="150" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <rect x="250" y="250" width="300" height="200" fill="white" stroke="black" stroke-width="3" class="colorable"/>
      <polygon points="230,250 400,120 570,250" fill="white" stroke="black" stroke-width="3" class="colorable"/>
      <rect x="360" y="340" width="80" height="110" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <circle cx="425" cy="400" r="6" fill="black"/>
      <rect x="280" y="290" width="55" height="50" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <line x1="307.5" y1="290" x2="307.5" y2="340" stroke="black" stroke-width="1.5"/>
      <line x1="280" y1="315" x2="335" y2="315" stroke="black" stroke-width="1.5"/>
      <rect x="465" y="290" width="55" height="50" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <line x1="492.5" y1="290" x2="492.5" y2="340" stroke="black" stroke-width="1.5"/>
      <line x1="465" y1="315" x2="520" y2="315" stroke="black" stroke-width="1.5"/>
      <rect x="480" y="140" width="40" height="80" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <circle cx="680" cy="100" r="50" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <line x1="680" y1="38" x2="680" y2="20" stroke="black" stroke-width="2"/>
      <line x1="680" y1="162" x2="680" y2="180" stroke="black" stroke-width="2"/>
      <line x1="618" y1="100" x2="600" y2="100" stroke="black" stroke-width="2"/>
      <line x1="742" y1="100" x2="760" y2="100" stroke="black" stroke-width="2"/>
      <ellipse cx="150" cy="90" rx="70" ry="30" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <ellipse cx="100" cy="85" rx="35" ry="22" fill="white" stroke="black" stroke-width="1.5" class="colorable"/>
      <rect x="80" y="350" width="30" height="100" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <circle cx="95" cy="310" r="55" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <path d="M620,450 Q640,410 660,430 Q680,400 700,440 Q720,415 740,450" fill="white" stroke="black" stroke-width="2" class="colorable"/>
    </svg>`
  },
  {
    name: 'Fish',
    svg: `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="360" cy="300" rx="180" ry="110" fill="white" stroke="black" stroke-width="3" class="colorable"/>
      <polygon points="540,300 660,200 660,400" fill="white" stroke="black" stroke-width="3" class="colorable"/>
      <path d="M310,190 Q360,110 410,190" fill="white" stroke="black" stroke-width="2.5" class="colorable"/>
      <path d="M320,410 Q355,480 400,410" fill="white" stroke="black" stroke-width="2.5" class="colorable"/>
      <circle cx="265" cy="275" r="28" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <circle cx="272" cy="272" r="12" fill="black"/>
      <circle cx="276" cy="268" r="4" fill="white"/>
      <path d="M195,320 Q215,355 195,360" fill="none" stroke="black" stroke-width="2.5"/>
      <path d="M310,250 Q340,300 310,350" fill="none" stroke="black" stroke-width="1.5"/>
      <path d="M370,235 Q400,300 370,365" fill="none" stroke="black" stroke-width="1.5"/>
      <path d="M430,250 Q460,300 430,350" fill="none" stroke="black" stroke-width="1.5"/>
      <circle cx="150" cy="200" r="18" fill="white" stroke="black" stroke-width="1.5" class="colorable"/>
      <circle cx="120" cy="155" r="12" fill="white" stroke="black" stroke-width="1.5" class="colorable"/>
      <circle cx="165" cy="135" r="14" fill="white" stroke="black" stroke-width="1.5" class="colorable"/>
      <path d="M50,520 Q100,480 150,520 Q200,480 250,520 Q300,480 350,520 Q400,480 450,520 Q500,480 550,520 Q600,480 650,520 Q700,480 750,520" fill="none" stroke="black" stroke-width="2"/>
      <path d="M50,560 Q100,520 150,560 Q200,520 250,560 Q300,520 350,560 Q400,520 450,560 Q500,520 550,560 Q600,520 650,560 Q700,520 750,560" fill="none" stroke="black" stroke-width="2"/>
    </svg>`
  },
  {
    name: 'Flower',
    svg: `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
      <polygon points="325,580 475,580 455,465 345,465" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <rect x="315" y="450" width="170" height="25" rx="5" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <rect x="390" y="260" width="20" height="195" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <ellipse cx="345" cy="385" rx="50" ry="18" transform="rotate(-30, 345, 385)" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <ellipse cx="460" cy="350" rx="50" ry="18" transform="rotate(25, 460, 350)" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <ellipse cx="400" cy="130" rx="38" ry="62" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <ellipse cx="330" cy="165" rx="38" ry="62" transform="rotate(-60, 330, 165)" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <ellipse cx="338" cy="245" rx="38" ry="62" transform="rotate(-120, 338, 245)" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <ellipse cx="400" cy="280" rx="38" ry="62" transform="rotate(180, 400, 280)" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <ellipse cx="465" cy="245" rx="38" ry="62" transform="rotate(120, 465, 245)" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <ellipse cx="470" cy="165" rx="38" ry="62" transform="rotate(60, 470, 165)" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <circle cx="400" cy="205" r="42" fill="white" stroke="black" stroke-width="2" class="colorable"/>
    </svg>`
  },
  {
    name: 'Butterfly',
    svg: `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="400" cy="310" rx="18" ry="95" fill="white" stroke="black" stroke-width="3" class="colorable"/>
      <circle cx="400" cy="195" r="24" fill="white" stroke="black" stroke-width="2.5" class="colorable"/>
      <circle cx="393" cy="190" r="5" fill="black"/>
      <circle cx="407" cy="190" r="5" fill="black"/>
      <path d="M387,175 Q345,110 325,90" fill="none" stroke="black" stroke-width="2.5"/>
      <circle cx="322" cy="87" r="9" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <path d="M413,175 Q455,110 475,90" fill="none" stroke="black" stroke-width="2.5"/>
      <circle cx="478" cy="87" r="9" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <path d="M382,235 Q200,110 175,270 Q195,320 382,290" fill="white" stroke="black" stroke-width="3" class="colorable"/>
      <path d="M418,235 Q600,110 625,270 Q605,320 418,290" fill="white" stroke="black" stroke-width="3" class="colorable"/>
      <path d="M382,315 Q210,340 215,430 Q280,470 382,385" fill="white" stroke="black" stroke-width="3" class="colorable"/>
      <path d="M418,315 Q590,340 585,430 Q520,470 418,385" fill="white" stroke="black" stroke-width="3" class="colorable"/>
      <circle cx="275" cy="245" r="28" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <circle cx="525" cy="245" r="28" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <circle cx="295" cy="380" r="20" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <circle cx="505" cy="380" r="20" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <circle cx="240" cy="290" r="12" fill="white" stroke="black" stroke-width="1.5" class="colorable"/>
      <circle cx="560" cy="290" r="12" fill="white" stroke="black" stroke-width="1.5" class="colorable"/>
    </svg>`
  },
  {
    name: 'Rocket',
    svg: `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
      <rect x="345" y="150" width="110" height="280" rx="12" fill="white" stroke="black" stroke-width="3" class="colorable"/>
      <path d="M345,165 Q400,40 455,165" fill="white" stroke="black" stroke-width="3" class="colorable"/>
      <circle cx="400" cy="255" r="35" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <circle cx="400" cy="255" r="18" fill="white" stroke="black" stroke-width="1.5" class="colorable"/>
      <rect x="370" y="340" width="60" height="20" rx="4" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <rect x="370" y="375" width="60" height="20" rx="4" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <polygon points="345,380 275,480 345,430" fill="white" stroke="black" stroke-width="2.5" class="colorable"/>
      <polygon points="455,380 525,480 455,430" fill="white" stroke="black" stroke-width="2.5" class="colorable"/>
      <path d="M360,430 Q380,530 400,545 Q420,530 440,430" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <path d="M375,430 Q400,510 425,430" fill="white" stroke="black" stroke-width="1.5" class="colorable"/>
      <polygon points="150,100 158,125 185,125 163,140 170,165 150,150 130,165 137,140 115,125 142,125" fill="white" stroke="black" stroke-width="1.5" class="colorable"/>
      <polygon points="670,180 678,205 705,205 683,220 690,245 670,230 650,245 657,220 635,205 662,205" fill="white" stroke="black" stroke-width="1.5" class="colorable"/>
      <polygon points="180,420 186,438 205,438 190,448 195,467 180,457 165,467 170,448 155,438 174,438" fill="white" stroke="black" stroke-width="1.5" class="colorable"/>
      <circle cx="660" cy="80" r="40" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <circle cx="645" cy="72" r="14" fill="white" stroke="black" stroke-width="1" class="colorable"/>
      <circle cx="670" cy="95" r="8" fill="white" stroke="black" stroke-width="1" class="colorable"/>
    </svg>`
  },
  {
    name: 'Star',
    svg: `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
      <polygon points="400,50 458,215 635,215 492,325 545,490 400,385 255,490 308,325 165,215 342,215" fill="white" stroke="black" stroke-width="3" class="colorable"/>
      <polygon points="400,155 428,240 510,240 443,292 465,375 400,330 335,375 357,292 290,240 372,240" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <polygon points="130,80 138,105 165,105 143,118 150,143 130,130 110,143 117,118 95,105 122,105" fill="white" stroke="black" stroke-width="1.5" class="colorable"/>
      <polygon points="670,80 678,105 705,105 683,118 690,143 670,130 650,143 657,118 635,105 662,105" fill="white" stroke="black" stroke-width="1.5" class="colorable"/>
      <polygon points="130,470 138,495 165,495 143,508 150,533 130,520 110,533 117,508 95,495 122,495" fill="white" stroke="black" stroke-width="1.5" class="colorable"/>
      <polygon points="670,470 678,495 705,495 683,508 690,533 670,520 650,533 657,508 635,495 662,495" fill="white" stroke="black" stroke-width="1.5" class="colorable"/>
      <circle cx="250" cy="110" r="28" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <circle cx="550" cy="110" r="28" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <circle cx="680" cy="310" r="35" fill="white" stroke="black" stroke-width="2" class="colorable"/>
      <circle cx="120" cy="310" r="35" fill="white" stroke="black" stroke-width="2" class="colorable"/>
    </svg>`
  },
];

// ============ Initialization ============
document.addEventListener('DOMContentLoaded', init);

async function init() {
  canvas = document.getElementById('drawing-canvas');
  ctx = canvas.getContext('2d');
  bgCanvas = document.getElementById('background-canvas');
  bgCtx = bgCanvas.getContext('2d');
  svgContainer = document.getElementById('coloring-svg');
  emptyState = document.getElementById('empty-state');

  setupCanvas();
  setupPalette();
  setupToolbar();
  setupModals();

  hasWebGPU = await checkWebGPU();
  if (!hasWebGPU) {
    const hint = document.querySelector('#ai-section .hint');
    if (hint) hint.textContent = 'AI generation requires Chrome 121+ with WebGPU. Use templates instead.';
  }
}

async function checkWebGPU() {
  if (typeof ort === 'undefined') return false;
  if (!navigator.gpu) return false;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch { return false; }
}

// ============ Canvas Setup ============
function setupCanvas() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);

  canvas.addEventListener('touchstart', startDrawing, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDrawing);
  canvas.addEventListener('touchcancel', stopDrawing);
}

function resizeCanvas() {
  const container = document.getElementById('canvas-container');
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  bgCanvas.width = rect.width * dpr;
  bgCanvas.height = rect.height * dpr;

  ctx.scale(dpr, dpr);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  redrawAllStrokes();
  redrawBackground();
}

// ============ Drawing ============
function getEventPos(e) {
  const rect = canvas.getBoundingClientRect();
  if (e.touches && e.touches.length > 0) {
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    };
  }
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

function startDrawing(e) {
  if (state.tool === 'fill') {
    if (state.hasRasterBG) {
      e.preventDefault();
      const pos = getEventPos(e);
      rasterFloodFill(pos.x, pos.y, state.color);
    }
    return;
  }
  if (e.touches && e.touches.length > 1) return;
  e.preventDefault();

  state.isDrawing = true;
  const pos = getEventPos(e);
  state.lastX = pos.x;
  state.lastY = pos.y;

  const isEraser = state.tool === 'eraser';
  state.currentStroke = {
    points: [pos],
    color: isEraser ? null : state.color,
    size: isEraser ? state.brushSize * 2.5 : state.brushSize,
    isEraser: isEraser,
  };

  ctx.save();
  if (isEraser) {
    ctx.globalCompositeOperation = 'destination-out';
  }
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, state.currentStroke.size / 2, 0, Math.PI * 2);
  ctx.fillStyle = isEraser ? 'rgba(0,0,0,1)' : state.color;
  ctx.fill();
  ctx.restore();

  hideEmptyState();
}

function draw(e) {
  if (!state.isDrawing || !state.currentStroke) return;
  if (e.touches && e.touches.length > 1) return;
  e.preventDefault();

  const pos = getEventPos(e);
  state.currentStroke.points.push(pos);

  ctx.save();
  if (state.currentStroke.isEraser) {
    ctx.globalCompositeOperation = 'destination-out';
  }
  ctx.beginPath();
  ctx.moveTo(state.lastX, state.lastY);
  ctx.lineTo(pos.x, pos.y);
  ctx.strokeStyle = state.currentStroke.isEraser ? 'rgba(0,0,0,1)' : state.currentStroke.color;
  ctx.lineWidth = state.currentStroke.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();

  state.lastX = pos.x;
  state.lastY = pos.y;
}

function stopDrawing() {
  if (state.currentStroke && state.currentStroke.points.length > 0) {
    state.strokes.push(state.currentStroke);
    if (state.strokes.length > MAX_UNDO) {
      state.strokes = state.strokes.slice(-MAX_UNDO);
    }
  }
  state.currentStroke = null;
  state.isDrawing = false;
}

function redrawAllStrokes() {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;
  ctx.clearRect(0, 0, w, h);

  state.strokes.forEach(stroke => drawFullStroke(stroke));
}

function drawFullStroke(stroke) {
  if (stroke.points.length === 0) return;

  ctx.save();
  if (stroke.isEraser) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.fillStyle = 'rgba(0,0,0,1)';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
  }
  ctx.lineWidth = stroke.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (stroke.points.length === 1) {
    ctx.beginPath();
    ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ============ Undo ============
function undo() {
  if (state.strokes.length === 0) return;
  state.strokes.pop();
  redrawAllStrokes();
  if (state.strokes.length === 0 && !state.hasSVG && !state.hasRasterBG) {
    showEmptyState();
  }
}

// ============ Clear ============
function clearCanvas() {
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  state.strokes = [];
  state.currentStroke = null;
}

function clearAll() {
  clearCanvas();
  svgContainer.innerHTML = '';
  svgContainer.removeAttribute('viewBox');
  state.hasSVG = false;

  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  state.hasRasterBG = false;
  state._rasterImageData = null;

  showEmptyState();
}

// ============ Tool Selection ============
function setTool(tool) {
  state.tool = tool;

  document.querySelectorAll('#btn-draw, #btn-fill, #btn-eraser').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(`btn-${tool}`).classList.add('active');

  if (tool === 'fill') {
    if (state.hasSVG) {
      canvas.style.pointerEvents = 'none';
      svgContainer.style.pointerEvents = 'auto';
      canvas.style.cursor = 'default';
    } else if (state.hasRasterBG) {
      canvas.style.pointerEvents = 'auto';
      svgContainer.style.pointerEvents = 'none';
      canvas.style.cursor = 'crosshair';
    } else {
      setTool('draw');
      return;
    }
  } else {
    canvas.style.pointerEvents = 'auto';
    svgContainer.style.pointerEvents = 'none';
    canvas.style.cursor = tool === 'eraser' ? 'cell' : 'crosshair';
  }
}

// ============ Empty State ============
function showEmptyState() {
  if (emptyState) emptyState.classList.remove('hidden');
}

function hideEmptyState() {
  if (emptyState) emptyState.classList.add('hidden');
}

// ============ SVG Loading ============
function loadSVG(svgString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');

  if (!svg) {
    alert('Could not load coloring page. Please try again.');
    return;
  }

  svg.querySelectorAll('script').forEach(el => el.remove());
  svg.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
    });
  });

  if (!svg.getAttribute('viewBox')) {
    svg.setAttribute('viewBox', '0 0 800 600');
  }

  const shapes = svg.querySelectorAll('path, circle, rect, ellipse, polygon, polyline');
  shapes.forEach((shape, i) => {
    if (!shape.classList.contains('colorable')) {
      const fill = shape.getAttribute('fill');
      if (fill && fill !== 'none' && fill !== 'transparent') {
        shape.classList.add('colorable');
      }
    }
    if (!shape.id) shape.id = `region-${i}`;
  });

  svgContainer.innerHTML = '';
  svgContainer.setAttribute('viewBox', svg.getAttribute('viewBox'));

  while (svg.firstChild) {
    svgContainer.appendChild(svg.firstChild);
  }

  svgContainer.querySelectorAll('.colorable').forEach(shape => {
    shape.addEventListener('click', handleSVGFill);
  });

  state.hasSVG = true;
  clearCanvas();
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  state.hasRasterBG = false;
  state._rasterImageData = null;
  hideEmptyState();
}

function handleSVGFill(e) {
  if (state.tool !== 'fill') return;
  e.preventDefault();
  e.stopPropagation();
  const target = e.currentTarget;
  if (target.classList.contains('colorable')) {
    target.setAttribute('fill', state.color);
  }
}

// ============ Background Canvas (Raster Coloring Pages) ============
function displayColoringPage(imageData) {
  state._rasterImageData = imageData;
  state.hasRasterBG = true;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  tempCanvas.getContext('2d').putImageData(imageData, 0, 0);

  bgCtx.setTransform(1, 0, 0, 1, 0, 0);
  bgCtx.drawImage(tempCanvas, 0, 0, bgCanvas.width, bgCanvas.height);

  svgContainer.innerHTML = '';
  svgContainer.removeAttribute('viewBox');
  state.hasSVG = false;

  clearCanvas();
  hideEmptyState();
}

function redrawBackground() {
  if (!state._rasterImageData) return;
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = state._rasterImageData.width;
  tempCanvas.height = state._rasterImageData.height;
  tempCanvas.getContext('2d').putImageData(state._rasterImageData, 0, 0);
  bgCtx.setTransform(1, 0, 0, 1, 0, 0);
  bgCtx.drawImage(tempCanvas, 0, 0, bgCanvas.width, bgCanvas.height);
}

// ============ Raster Flood Fill ============
function rasterFloodFill(x, y, fillColor) {
  const dpr = window.devicePixelRatio || 1;
  const px = Math.floor(x * dpr);
  const py = Math.floor(y * dpr);
  const w = canvas.width;
  const h = canvas.height;

  if (px < 0 || px >= w || py < 0 || py >= h) return;

  const bgData = bgCtx.getImageData(0, 0, w, h);
  const fgData = ctx.getImageData(0, 0, w, h);

  // Build boundary map: 1 = boundary (dark bg pixel or opaque fg pixel)
  const boundary = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const bgLum = (bgData.data[i * 4] + bgData.data[i * 4 + 1] + bgData.data[i * 4 + 2]) / 3;
    const fgA = fgData.data[i * 4 + 3];
    boundary[i] = (bgLum < 128 || fgA > 128) ? 1 : 0;
  }

  const startIdx = py * w + px;
  if (boundary[startIdx] === 1) return;

  const fc = hexToRGBA(fillColor);
  const visited = new Uint8Array(w * h);
  const stack = [px, py];
  visited[startIdx] = 1;

  while (stack.length > 0) {
    const cy = stack.pop();
    const cx = stack.pop();

    let left = cx;
    while (left > 0 && boundary[cy * w + left - 1] === 0 && !visited[cy * w + left - 1]) {
      left--;
      visited[cy * w + left] = 1;
    }

    let right = cx;
    while (right < w - 1 && boundary[cy * w + right + 1] === 0 && !visited[cy * w + right + 1]) {
      right++;
      visited[cy * w + right] = 1;
    }

    for (let i = left; i <= right; i++) {
      const idx = (cy * w + i) * 4;
      fgData.data[idx] = fc.r;
      fgData.data[idx + 1] = fc.g;
      fgData.data[idx + 2] = fc.b;
      fgData.data[idx + 3] = 255;

      if (cy > 0 && boundary[(cy - 1) * w + i] === 0 && !visited[(cy - 1) * w + i]) {
        visited[(cy - 1) * w + i] = 1;
        stack.push(i, cy - 1);
      }
      if (cy < h - 1 && boundary[(cy + 1) * w + i] === 0 && !visited[(cy + 1) * w + i]) {
        visited[(cy + 1) * w + i] = 1;
        stack.push(i, cy + 1);
      }
    }
  }

  ctx.putImageData(fgData, 0, 0);
  hideEmptyState();
}

function hexToRGBA(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

// ============ Palette Setup ============
function setupPalette() {
  const colorsDiv = document.getElementById('colors');

  COLORS.forEach((color, i) => {
    const swatch = document.createElement('button');
    swatch.className = 'color-swatch' + (i === 0 ? ' active' : '');
    swatch.style.backgroundColor = color;
    if (color === '#FFFFFF') swatch.classList.add('white-swatch');
    swatch.setAttribute('title', color);

    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      state.color = color;
    });

    colorsDiv.appendChild(swatch);
  });

  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.brushSize = parseInt(btn.dataset.size, 10);
    });
  });
}

// ============ Toolbar Setup ============
function setupToolbar() {
  document.getElementById('btn-draw').addEventListener('click', () => setTool('draw'));
  document.getElementById('btn-fill').addEventListener('click', () => setTool('fill'));
  document.getElementById('btn-eraser').addEventListener('click', () => setTool('eraser'));
  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-clear').addEventListener('click', clearAll);
  document.getElementById('btn-create').addEventListener('click', () => showModal('create-modal'));
  document.getElementById('btn-export').addEventListener('click', exportToPNG);
}

// ============ Modal Management ============
function setupModals() {
  document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal;
      if (modalId) hideModal(modalId);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', () => {
      const modal = overlay.closest('.modal');
      if (modal) hideModal(modal.id);
    });
  });

  setupTemplates();

  const generateBtn = document.getElementById('btn-generate');
  const promptInput = document.getElementById('prompt-input');

  generateBtn.addEventListener('click', () => {
    const prompt = promptInput.value.trim();
    if (prompt) generateColoringPage(prompt);
  });

  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const prompt = promptInput.value.trim();
      if (prompt) generateColoringPage(prompt);
    }
  });
}

function showModal(id) {
  document.getElementById(id).classList.remove('hidden');
  if (id === 'create-modal') {
    document.getElementById('prompt-input').value = '';
    document.getElementById('prompt-input').focus();
  }
}

function hideModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ============ Templates ============
function setupTemplates() {
  const grid = document.getElementById('template-grid');

  TEMPLATES.forEach((template) => {
    const btn = document.createElement('button');
    btn.className = 'template-btn';

    const preview = document.createElement('div');
    preview.className = 'template-preview';
    preview.innerHTML = template.svg;

    const label = document.createElement('span');
    label.textContent = template.name;

    btn.appendChild(preview);
    btn.appendChild(label);

    btn.addEventListener('click', () => {
      loadSVG(template.svg);
      hideModal('create-modal');
    });

    grid.appendChild(btn);
  });
}

// ============ SD-Turbo Model Loading ============
function updateLoading(text, progress) {
  const loadingText = document.getElementById('loading-text');
  const progressBar = document.getElementById('progress-bar');

  if (loadingText) loadingText.textContent = text;

  if (progressBar) {
    if (progress === null || progress === undefined) {
      progressBar.classList.add('indeterminate');
      progressBar.style.width = '30%';
    } else {
      progressBar.classList.remove('indeterminate');
      progressBar.style.width = Math.round(progress) + '%';
    }
  }
}

async function fetchModelCached(modelUrl, sizeMB, onProgress) {
  const cache = await caches.open('colorme-sd-turbo');

  const cached = await cache.match(modelUrl);
  if (cached) {
    onProgress(sizeMB, sizeMB);
    return await cached.arrayBuffer();
  }

  const response = await fetch(modelUrl);
  const reader = response.body.getReader();
  const contentLength = +response.headers.get('Content-Length') || sizeMB * 1024 * 1024;
  let received = 0;
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(received / (1024 * 1024), sizeMB);
  }

  const blob = new Blob(chunks);
  await cache.put(modelUrl, new Response(blob));
  return await blob.arrayBuffer();
}

async function areModelsCached() {
  try {
    const cache = await caches.open('colorme-sd-turbo');
    for (const model of Object.values(SD_TURBO_MODELS)) {
      const url = `${SD_TURBO_BASE}/${model.url}`;
      if (!(await cache.match(url))) return false;
    }
    return true;
  } catch { return false; }
}

async function initSDTurbo() {
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.simd = true;

  sdTokenizer = await AutoTokenizer.from_pretrained(TOKENIZER_MODEL);

  let downloadedMB = 0;

  const sessionOpts = {
    executionProviders: ['webgpu'],
    enableMemPattern: false,
    enableCpuMemArena: false,
    extra: {
      session: {
        disable_prepacking: '1',
        use_device_allocator_for_initializers: '1',
        use_ort_model_bytes_directly: '1',
        use_ort_model_bytes_for_initializers: '1',
      }
    },
  };

  for (const [name, model] of Object.entries(SD_TURBO_MODELS)) {
    const url = `${SD_TURBO_BASE}/${model.url}`;
    const bytes = await fetchModelCached(url, model.size, (fileMB) => {
      const pct = ((downloadedMB + fileMB) / TOTAL_MODEL_MB) * 100;
      updateLoading(`Downloading model... ${Math.round(pct)}%`, pct);
    });
    downloadedMB += model.size;

    updateLoading(`Loading ${name}...`, null);
    sdSessions[name] = await ort.InferenceSession.create(bytes, sessionOpts);
  }
}

async function ensureSDModel() {
  if (sdSessions.unet) return;
  if (!sdInitPromise) {
    sdInitPromise = initSDTurbo();
  }
  await sdInitPromise;
}

// ============ SD-Turbo Inference ============
function generateLatentNoise() {
  const size = 1 * 4 * 64 * 64;
  const data = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const u = Math.random(), v = Math.random();
    data[i] = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * SIGMA;
  }
  return new ort.Tensor('float32', data, [1, 4, 64, 64]);
}

function scaleModelInput(tensor) {
  const divi = Math.sqrt(SIGMA * SIGMA + 1);
  const out = new Float32Array(tensor.data.length);
  for (let i = 0; i < tensor.data.length; i++) {
    out[i] = tensor.data[i] / divi;
  }
  return new ort.Tensor('float32', out, tensor.dims);
}

function eulerStep(modelOutput, sample) {
  const out = new Float32Array(modelOutput.data.length);
  for (let i = 0; i < modelOutput.data.length; i++) {
    const predOriginal = sample.data[i] - SIGMA * modelOutput.data[i];
    const derivative = (sample.data[i] - predOriginal) / SIGMA;
    const dt = 0 - SIGMA;
    out[i] = (sample.data[i] + derivative * dt) / VAE_SCALING;
  }
  return new ort.Tensor('float32', out, modelOutput.dims);
}

async function runSDTurbo(prompt) {
  const fullPrompt = PROMPT_PREFIX + prompt + PROMPT_SUFFIX;

  // 1. Tokenize
  const tokens = await sdTokenizer(fullPrompt, {
    padding: 'max_length',
    max_length: 77,
    truncation: true,
  });

  // 2. Text encode
  const inputIds = new ort.Tensor('int32', Int32Array.from(tokens.input_ids.data), [1, 77]);
  const encoderResult = await sdSessions.text_encoder.run({ input_ids: inputIds });
  const hiddenStates = encoderResult.last_hidden_state;

  // 3. Generate random latent noise
  const latent = generateLatentNoise();
  const scaledLatent = scaleModelInput(latent);

  // 4. UNet denoise (single step for Turbo)
  const timestep = new ort.Tensor('int64', BigInt64Array.from([999n]), [1]);
  const unetResult = await sdSessions.unet.run({
    sample: scaledLatent,
    timestep: timestep,
    encoder_hidden_states: hiddenStates,
  });
  const noisePred = unetResult.out_sample;

  // 5. Euler step → denoised latent
  const denoised = eulerStep(noisePred, latent);

  // 6. VAE decode
  const vaeResult = await sdSessions.vae_decoder.run({ latent_sample: denoised });
  const decoded = vaeResult.sample;

  // 7. Convert tensor to ImageData (NCHW → RGBA)
  const [, , imgH, imgW] = decoded.dims;
  const imageData = new ImageData(imgW, imgH);
  const pixels = decoded.data;
  for (let y = 0; y < imgH; y++) {
    for (let x = 0; x < imgW; x++) {
      const srcIdx = y * imgW + x;
      const dstIdx = (y * imgW + x) * 4;
      const r = Math.round(Math.min(255, Math.max(0, (pixels[0 * imgH * imgW + srcIdx] / 2 + 0.5) * 255)));
      const g = Math.round(Math.min(255, Math.max(0, (pixels[1 * imgH * imgW + srcIdx] / 2 + 0.5) * 255)));
      const b = Math.round(Math.min(255, Math.max(0, (pixels[2 * imgH * imgW + srcIdx] / 2 + 0.5) * 255)));
      imageData.data[dstIdx] = r;
      imageData.data[dstIdx + 1] = g;
      imageData.data[dstIdx + 2] = b;
      imageData.data[dstIdx + 3] = 255;
    }
  }

  return imageData;
}

// ============ Post-processing: Raster → Coloring Page ============
function toColoringPage(imageData) {
  const { width, height } = imageData;
  const { data } = imageData;

  // 1. Grayscale
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    gray[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
  }

  // 2. Threshold: keep only dark outlines (< 80)
  const binary = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    binary[i] = gray[i] < 80 ? 0 : 255;
  }

  // 3. MinFilter(3): thicken lines (black expands)
  const thick = minFilter(binary, width, height, 3);

  // 4. MedianFilter(7): remove noise (majority vote on binary)
  const clean = medianFilter(thick, width, height, 7);

  // Convert back to RGBA ImageData
  const result = new ImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    result.data[i * 4] = clean[i];
    result.data[i * 4 + 1] = clean[i];
    result.data[i * 4 + 2] = clean[i];
    result.data[i * 4 + 3] = 255;
  }
  return result;
}

function minFilter(data, width, height, size) {
  const out = new Uint8Array(data.length);
  const half = Math.floor(size / 2);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let min = 255;
      for (let dy = -half; dy <= half; dy++) {
        const ny = Math.min(height - 1, Math.max(0, y + dy));
        for (let dx = -half; dx <= half; dx++) {
          const nx = Math.min(width - 1, Math.max(0, x + dx));
          const v = data[ny * width + nx];
          if (v < min) min = v;
        }
      }
      out[y * width + x] = min;
    }
  }
  return out;
}

function medianFilter(data, width, height, size) {
  const out = new Uint8Array(data.length);
  const half = Math.floor(size / 2);
  const total = size * size;
  const majority = total >> 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let zeros = 0;
      for (let dy = -half; dy <= half; dy++) {
        const ny = Math.min(height - 1, Math.max(0, y + dy));
        for (let dx = -half; dx <= half; dx++) {
          const nx = Math.min(width - 1, Math.max(0, x + dx));
          if (data[ny * width + nx] === 0) zeros++;
        }
      }
      out[y * width + x] = zeros > majority ? 0 : 255;
    }
  }
  return out;
}

// ============ Generate Coloring Page ============
async function generateColoringPage(prompt) {
  if (!hasWebGPU) {
    alert('AI image generation requires a browser with WebGPU support (Chrome 121+).');
    return;
  }

  const inputRow = document.querySelector('#ai-section .input-row');
  const aiHint = document.querySelector('#ai-section .hint');
  const templateSection = document.getElementById('template-section');
  const loading = document.getElementById('loading');

  inputRow.style.display = 'none';
  if (aiHint) aiHint.style.display = 'none';
  templateSection.style.display = 'none';
  loading.classList.remove('hidden');

  const cached = await areModelsCached();
  if (cached) {
    updateLoading('Loading AI model...', null);
  } else {
    updateLoading('Downloading AI model (~2.4 GB)... first time only', 0);
  }

  try {
    await ensureSDModel();

    updateLoading('Generating image...', null);
    const rawImage = await runSDTurbo(prompt);

    updateLoading('Processing coloring page...', null);
    const coloringPage = toColoringPage(rawImage);

    displayColoringPage(coloringPage);
    hideModal('create-modal');
  } catch (error) {
    console.error('Generation error:', error);
    alert('Could not create coloring page: ' + error.message);
  } finally {
    loading.classList.add('hidden');
    inputRow.style.display = '';
    if (aiHint) aiHint.style.display = '';
    templateSection.style.display = '';
  }
}

// ============ Export to PNG ============
async function exportToPNG() {
  const container = document.getElementById('canvas-container');
  const cw = container.offsetWidth;
  const ch = container.offsetHeight;
  const scale = 2;

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = cw * scale;
  exportCanvas.height = ch * scale;
  const exportCtx = exportCanvas.getContext('2d');
  exportCtx.scale(scale, scale);

  exportCtx.fillStyle = '#FFFFFF';
  exportCtx.fillRect(0, 0, cw, ch);

  // Layer 1: raster coloring page background
  if (state.hasRasterBG && bgCanvas) {
    exportCtx.drawImage(bgCanvas, 0, 0, cw, ch);
  }

  // Layer 2: SVG template
  if (state.hasSVG) {
    try {
      const svgClone = svgContainer.cloneNode(true);
      svgClone.setAttribute('width', cw);
      svgClone.setAttribute('height', ch);

      const svgData = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          exportCtx.drawImage(img, 0, 0, cw, ch);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          const svgB64 = btoa(unescape(encodeURIComponent(svgData)));
          const img2 = new Image();
          img2.onload = () => {
            exportCtx.drawImage(img2, 0, 0, cw, ch);
            resolve();
          };
          img2.onerror = reject;
          img2.src = 'data:image/svg+xml;base64,' + svgB64;
        };
        img.src = url;
      });
    } catch (err) {
      console.error('SVG export error:', err);
    }
  }

  // Layer 3: drawing canvas
  exportCtx.drawImage(canvas, 0, 0, cw, ch);

  const link = document.createElement('a');
  link.download = 'colorme-drawing.png';
  link.href = exportCanvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
