// ============================================================
// ColorMe - Drawing & Coloring App for Kids
// ============================================================

// ============ Constants ============
const COLORS = [
  '#FF0000', '#FF6B35', '#FFD700', '#7CFC00',
  '#00AA00', '#00CED1', '#4169E1', '#0000CD',
  '#8A2BE2', '#FF69B4', '#FF1493', '#FFB6C1',
  '#87CEEB', '#8B4513', '#D2691E', '#000000',
  '#808080', '#FFFFFF',
];

const BRUSH_SIZES = [4, 12, 24];
const MAX_UNDO = 30;

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
  apiKey: localStorage.getItem('colorme-api-key') || '',
};

// ============ DOM Refs ============
let canvas, ctx, svgContainer, emptyState;

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
      <line x1="345" y1="385" x2="345" y2="385" stroke="black" stroke-width="0"/>
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

function init() {
  canvas = document.getElementById('drawing-canvas');
  ctx = canvas.getContext('2d');
  svgContainer = document.getElementById('coloring-svg');
  emptyState = document.getElementById('empty-state');

  setupCanvas();
  setupPalette();
  setupToolbar();
  setupModals();
  checkApiKey();
}

// ============ Canvas Setup ============
function setupCanvas() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Mouse events
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);

  // Touch events
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

  ctx.scale(dpr, dpr);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  redrawAllStrokes();
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
  if (state.tool === 'fill') return;
  if (e.touches && e.touches.length > 1) return; // ignore multi-touch
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

  // Draw initial dot
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
    // Trim undo history
    if (state.strokes.length > MAX_UNDO) {
      // Flatten oldest strokes into a background image
      flattenOldStrokes();
    }
  }
  state.currentStroke = null;
  state.isDrawing = false;
}

function flattenOldStrokes() {
  // Keep only the last MAX_UNDO strokes, flatten older ones
  if (state.strokes.length <= MAX_UNDO) return;
  // For simplicity, just keep the last MAX_UNDO strokes
  state.strokes = state.strokes.slice(-MAX_UNDO);
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
  if (state.strokes.length === 0 && !state.hasSVG) {
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
  showEmptyState();
}

// ============ Tool Selection ============
function setTool(tool) {
  state.tool = tool;

  // Update active button
  document.querySelectorAll('#btn-draw, #btn-fill, #btn-eraser').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(`btn-${tool}`).classList.add('active');

  // Toggle pointer events between canvas and SVG
  if (tool === 'fill' && state.hasSVG) {
    canvas.style.pointerEvents = 'none';
    svgContainer.style.pointerEvents = 'auto';
    canvas.style.cursor = 'default';
  } else if (tool === 'fill' && !state.hasSVG) {
    // No SVG loaded - fall back to draw tool
    setTool('draw');
    return;
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

  // Sanitize: remove scripts and event handlers
  svg.querySelectorAll('script').forEach(el => el.remove());
  const allEls = svg.querySelectorAll('*');
  allEls.forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });

  // Ensure viewBox
  if (!svg.getAttribute('viewBox')) {
    svg.setAttribute('viewBox', '0 0 800 600');
  }

  // Make all shape elements colorable
  const shapes = svg.querySelectorAll('path, circle, rect, ellipse, polygon, polyline');
  shapes.forEach((shape, i) => {
    if (!shape.classList.contains('colorable')) {
      // Only add colorable to filled shapes
      const fill = shape.getAttribute('fill');
      if (fill && fill !== 'none' && fill !== 'transparent') {
        shape.classList.add('colorable');
      }
    }
    if (!shape.id) shape.id = `region-${i}`;
  });

  // Clear existing SVG
  svgContainer.innerHTML = '';

  // Copy viewBox
  svgContainer.setAttribute('viewBox', svg.getAttribute('viewBox'));

  // Copy children
  while (svg.firstChild) {
    svgContainer.appendChild(svg.firstChild);
  }

  // Attach click handlers to colorable elements (use click only; touchend
  // would double-fire because browsers synthesize a click after touchend)
  svgContainer.querySelectorAll('.colorable').forEach(shape => {
    shape.addEventListener('click', handleSVGFill);
  });

  state.hasSVG = true;
  clearCanvas();
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

// ============ Palette Setup ============
function setupPalette() {
  const colorsDiv = document.getElementById('colors');

  COLORS.forEach((color, i) => {
    const swatch = document.createElement('button');
    swatch.className = 'color-swatch' + (i === 0 ? ' active' : '');
    swatch.style.backgroundColor = color;
    if (color === '#FFFFFF') {
      swatch.classList.add('white-swatch');
    }
    swatch.setAttribute('title', color);

    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      state.color = color;
    });

    colorsDiv.appendChild(swatch);
  });

  // Brush sizes
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
  document.getElementById('btn-settings').addEventListener('click', () => showModal('settings-modal'));
}

// ============ Modal Management ============
function setupModals() {
  // Close buttons
  document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal;
      if (modalId) hideModal(modalId);
    });
  });

  // Overlay clicks
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', () => {
      const modal = overlay.closest('.modal');
      if (modal) hideModal(modal.id);
    });
  });

  // Template grid
  setupTemplates();

  // AI generation
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

  // Settings
  document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
  document.getElementById('api-key-input').value = state.apiKey;

  // Link to settings from create modal
  const openSettingsBtn = document.getElementById('btn-open-settings');
  if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', () => {
      hideModal('create-modal');
      showModal('settings-modal');
    });
  }
}

function showModal(id) {
  document.getElementById(id).classList.remove('hidden');
  if (id === 'create-modal') {
    checkApiKey();
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

// ============ API Key ============
function checkApiKey() {
  const hint = document.getElementById('api-hint');
  if (!state.apiKey) {
    hint.classList.remove('hidden');
  } else {
    hint.classList.add('hidden');
  }
}

function saveSettings() {
  const input = document.getElementById('api-key-input');
  state.apiKey = input.value.trim();
  localStorage.setItem('colorme-api-key', state.apiKey);
  hideModal('settings-modal');
  checkApiKey();
}

// ============ AI Generation ============
async function generateColoringPage(prompt) {
  if (!state.apiKey) {
    document.getElementById('api-hint').classList.remove('hidden');
    return;
  }

  const inputRow = document.querySelector('#ai-section .input-row');
  const templateSection = document.getElementById('template-section');
  const loading = document.getElementById('loading');

  inputRow.style.display = 'none';
  templateSection.style.display = 'none';
  loading.classList.remove('hidden');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': state.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `Generate a simple SVG coloring page of: "${prompt}"

Requirements:
- SVG with viewBox="0 0 800 600" and xmlns="http://www.w3.org/2000/svg"
- Use basic SVG elements: <path>, <circle>, <rect>, <ellipse>, <polygon>
- Each distinct colorable region must be a separate element with class="colorable"
- All colorable regions: fill="white" stroke="black" stroke-width="2"
- Non-colorable detail lines use fill="none" stroke="black"
- Simple, cute design with large clearly-defined regions for young children to color
- Between 10-25 colorable regions total
- Center the main subject in the viewBox
- No <text>, <script>, <style>, <image>, or <foreignObject> elements
- No inline styles, no CSS
- Output ONLY the raw SVG code. No markdown fences, no backticks, no explanation.`
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    let svgText = data.content[0].text;

    // Extract SVG if wrapped in other text
    const svgMatch = svgText.match(/<svg[\s\S]*?<\/svg>/);
    if (svgMatch) {
      loadSVG(svgMatch[0]);
      hideModal('create-modal');
    } else {
      throw new Error('No valid SVG found in response');
    }
  } catch (error) {
    console.error('Generation error:', error);
    alert('Could not create coloring page: ' + error.message);
  } finally {
    loading.classList.add('hidden');
    inputRow.style.display = '';
    templateSection.style.display = '';
  }
}

// ============ Export to PNG ============
async function exportToPNG() {
  const container = document.getElementById('canvas-container');
  const cw = container.offsetWidth;
  const ch = container.offsetHeight;
  const scale = 2; // Export at 2x for quality

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = cw * scale;
  exportCanvas.height = ch * scale;
  const exportCtx = exportCanvas.getContext('2d');
  exportCtx.scale(scale, scale);

  // White background
  exportCtx.fillStyle = '#FFFFFF';
  exportCtx.fillRect(0, 0, cw, ch);

  // Draw SVG layer
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
          // Fallback: try data URL approach
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

  // Draw freehand canvas layer on top
  exportCtx.drawImage(canvas, 0, 0, cw, ch);

  // Trigger download
  const link = document.createElement('a');
  link.download = 'colorme-drawing.png';
  link.href = exportCanvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
