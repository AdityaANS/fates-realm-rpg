/**
 * Map Renderer - Visual display of the procedurally generated map
 */

let mapCanvas;
let mapCtx;
let mapScale = 1;
let mapOffsetX = 0;
let mapOffsetY = 0;
let mapClickBound = false;
let mapWheelBound = false;
let mapDragBound = false;
let mapTooltip;
let isDraggingMap = false;
let dragStart = { x: 0, y: 0 };
let offsetStart = { x: 0, y: 0 };

const MAP_VIEW = {
  minScale: 0.4,
  maxScale: 2.5,
  hoverNodeId: null
};

function ensureMapTooltip() {
  if (mapTooltip) return;
  mapTooltip = document.createElement('div');
  mapTooltip.className = 'map-tooltip';
  mapTooltip.style.display = 'none';
  document.getElementById('map-mode')?.appendChild(mapTooltip);
}

function setCanvasSizeForDPR() {
  if (!mapCanvas || !mapCtx) return;
  const rect = mapCanvas.getBoundingClientRect();
  const cssWidth = Math.round(rect.width);
  const cssHeight = Math.round(rect.height);
  if (cssWidth < 20 || cssHeight < 20) return;
  const dpr = window.devicePixelRatio || 1;

  mapCanvas.width = Math.round(cssWidth * dpr);
  mapCanvas.height = Math.round(cssHeight * dpr);
  mapCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function worldToScreen(x, y) {
  return {
    x: x * mapScale + mapOffsetX,
    y: y * mapScale + mapOffsetY
  };
}

function screenToWorld(x, y) {
  return {
    x: (x - mapOffsetX) / mapScale,
    y: (y - mapOffsetY) / mapScale
  };
}

function getWorldBounds() {
  const nodes = GAME_STATE.map.nodes || [];
  if (!nodes.length) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x);
    maxY = Math.max(maxY, node.y);
  }

  return { minX, minY, maxX, maxY };
}

function fitMapToView() {
  if (!mapCanvas || !GAME_STATE.map.nodes?.length) return;

  const bounds = getWorldBounds();
  const width = Math.max(mapCanvas.clientWidth, 1);
  const height = Math.max(mapCanvas.clientHeight, 1);
  const padding = 60;

  const worldWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const worldHeight = Math.max(bounds.maxY - bounds.minY, 1);
  const fitScaleX = (width - padding * 2) / worldWidth;
  const fitScaleY = (height - padding * 2) / worldHeight;
  mapScale = Math.max(MAP_VIEW.minScale, Math.min(MAP_VIEW.maxScale, Math.min(fitScaleX, fitScaleY)));

  const worldCenterX = (bounds.minX + bounds.maxX) / 2;
  const worldCenterY = (bounds.minY + bounds.maxY) / 2;
  mapOffsetX = width / 2 - worldCenterX * mapScale;
  mapOffsetY = height / 2 - worldCenterY * mapScale;
}

function getNodeAtCanvasPoint(canvasX, canvasY) {
  const world = screenToWorld(canvasX, canvasY);
  const { nodes } = GAME_STATE.map;
  let bestNode = null;
  let bestDistance = Infinity;

  for (const node of nodes) {
    const d = Math.hypot(world.x - node.x, world.y - node.y);
    if (d < bestDistance) {
      bestDistance = d;
      bestNode = node;
    }
  }

  const clickRadius = Math.max(8, 13 / mapScale);
  if (bestNode && bestDistance <= clickRadius) {
    return bestNode;
  }
  return null;
}

function hideMapTooltip() {
  if (!mapTooltip) return;
  mapTooltip.style.display = 'none';
}

function showMapTooltip(node, x, y) {
  ensureMapTooltip();
  if (!mapTooltip) return;

  mapTooltip.innerHTML = `
    <strong>${node.name}</strong><br>
    ${node.structure || node.type} | ${node.region || node.biome}<br>
    Danger ${node.danger}/5 ${node.hasShop ? '| Shop' : ''}<br>
    <em>${node.lore}</em>
  `;
  mapTooltip.style.left = `${x + 12}px`;
  mapTooltip.style.top = `${y + 12}px`;
  mapTooltip.style.display = 'block';
}

function handleMapMove(event) {
  if (!mapCanvas) return;

  const rect = mapCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (isDraggingMap) {
    mapOffsetX = offsetStart.x + (x - dragStart.x);
    mapOffsetY = offsetStart.y + (y - dragStart.y);
    renderMap();
    return;
  }

  const node = getNodeAtCanvasPoint(x, y);
  MAP_VIEW.hoverNodeId = node?.id || null;
  mapCanvas.style.cursor = node ? 'pointer' : 'grab';

  if (node) {
    showMapTooltip(node, x, y);
  } else {
    hideMapTooltip();
  }

  renderMap();
}

function handleMapMouseDown(event) {
  const rect = mapCanvas.getBoundingClientRect();
  isDraggingMap = true;
  dragStart = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
  offsetStart = { x: mapOffsetX, y: mapOffsetY };
  mapCanvas.style.cursor = 'grabbing';
}

function handleMapMouseUp() {
  isDraggingMap = false;
  mapCanvas.style.cursor = 'grab';
}

function handleMapWheel(event) {
  event.preventDefault();
  if (!mapCanvas) return;

  const rect = mapCanvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  const before = screenToWorld(mouseX, mouseY);

  const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
  const nextScale = Math.max(MAP_VIEW.minScale, Math.min(MAP_VIEW.maxScale, mapScale * zoomFactor));
  if (nextScale === mapScale) return;
  mapScale = nextScale;

  const after = worldToScreen(before.x, before.y);
  mapOffsetX += mouseX - after.x;
  mapOffsetY += mouseY - after.y;
  renderMap();
}

/**
 * Initialize map canvas
 */
function initMapCanvas() {
  mapCanvas = document.getElementById('map-canvas');
  if (!mapCanvas) {
    console.error('Map canvas not found');
    return false;
  }

  mapCtx = mapCanvas.getContext('2d');
  setCanvasSizeForDPR();
  ensureMapTooltip();

  if (!mapClickBound) {
    mapCanvas.addEventListener('click', handleMapClick);
    mapClickBound = true;
  }

  if (!mapWheelBound) {
    mapCanvas.addEventListener('wheel', handleMapWheel, { passive: false });
    mapWheelBound = true;
  }

  if (!mapDragBound) {
    mapCanvas.addEventListener('mousedown', handleMapMouseDown);
    mapCanvas.addEventListener('mousemove', handleMapMove);
    mapCanvas.addEventListener('mouseleave', () => {
      MAP_VIEW.hoverNodeId = null;
      hideMapTooltip();
      if (!isDraggingMap) mapCanvas.style.cursor = 'grab';
      renderMap();
    });
    window.addEventListener('mouseup', handleMapMouseUp);
    mapDragBound = true;
  }

  if (!GAME_STATE.map._viewInitialized) {
    fitMapToView();
    GAME_STATE.map._viewInitialized = true;
  }

  mapCanvas.style.cursor = 'grab';
  return true;
}

/**
 * Render the full map
 */
function renderMap() {
  if (!mapCtx || !GAME_STATE.map.mapGenerated) {
    return;
  }

  setCanvasSizeForDPR();
  const width = mapCanvas.clientWidth;
  const height = mapCanvas.clientHeight;

  mapCtx.fillStyle = '#0a0a14';
  mapCtx.fillRect(0, 0, width, height);

  drawEdges();
  drawNodes();
  drawLegend();
}

function drawEdges() {
  const { nodes, edges, visitedLocations } = GAME_STATE.map;
  mapCtx.lineWidth = Math.max(1, 2 * mapScale);

  edges.forEach((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);
    if (!sourceNode || !targetNode) return;

    const bothVisited = visitedLocations.includes(edge.source) && visitedLocations.includes(edge.target);
    mapCtx.strokeStyle = bothVisited ? '#44495f' : 'rgba(48, 52, 71, 0.45)';

    const a = worldToScreen(sourceNode.x, sourceNode.y);
    const b = worldToScreen(targetNode.x, targetNode.y);
    mapCtx.beginPath();
    mapCtx.moveTo(a.x, a.y);
    mapCtx.lineTo(b.x, b.y);
    mapCtx.stroke();
  });
}

function drawNodes() {
  const { nodes, visitedLocations, currentLocation } = GAME_STATE.map;

  nodes.forEach((node) => {
    const isVisited = visitedLocations.includes(node.id);
    const isCurrent = currentLocation && currentLocation.id === node.id;
    const isNeighbor = isNeighborOfCurrent(node);
    const isVisible = true;
    if (!isVisible) return;

    const p = worldToScreen(node.x, node.y);
    const radius = (isCurrent ? 11 : 7) * mapScale;
    const isHover = MAP_VIEW.hoverNodeId === node.id;

    mapCtx.beginPath();
    mapCtx.arc(p.x, p.y, radius + (isHover ? 2 : 0), 0, Math.PI * 2);

    if (isCurrent) {
      mapCtx.fillStyle = '#d4af37';
      mapCtx.shadowColor = '#f2d87b';
      mapCtx.shadowBlur = 12;
    } else if (isVisited) {
      mapCtx.fillStyle = node.color || '#7cb342';
      mapCtx.shadowBlur = 0;
    } else if (isNeighbor) {
      mapCtx.fillStyle = '#83899a';
      mapCtx.shadowBlur = 0;
    } else {
      mapCtx.fillStyle = 'rgba(102, 106, 115, 0.38)';
      mapCtx.shadowBlur = 0;
    }

    mapCtx.fill();
    mapCtx.shadowBlur = 0;
    mapCtx.strokeStyle = isCurrent ? '#f5e6c8' : '#2f3341';
    mapCtx.lineWidth = Math.max(1, 2 * mapScale);
    mapCtx.stroke();

    if (isVisited && node.danger > 2) {
      mapCtx.fillStyle = '#d23636';
      mapCtx.font = `bold ${Math.max(10, 10 * mapScale)}px Arial`;
      mapCtx.fillText('!', p.x + radius + 4, p.y - radius - 2);
    }

    if (isVisited && node.hasShop) {
      mapCtx.fillStyle = '#d4af37';
      mapCtx.font = `bold ${Math.max(11, 11 * mapScale)}px Arial`;
      mapCtx.fillText('$', p.x - radius - 10, p.y - radius - 2);
    }

    if (isVisited || isCurrent || isHover || isNeighbor) {
      mapCtx.fillStyle = '#f5e6c8';
      mapCtx.font = `${Math.max(11, 12 * mapScale)}px "Crimson Text", serif`;
      mapCtx.textAlign = 'center';
      mapCtx.fillText(node.name, p.x, p.y + radius + 16);
    }
  });

  mapCtx.textAlign = 'left';
}

function isNeighborOfCurrent(node) {
  if (!GAME_STATE.map.currentLocation) return false;
  const currentId = GAME_STATE.map.currentLocation.id;
  return GAME_STATE.map.edges.some(
    (edge) => (edge.source === currentId && edge.target === node.id) ||
      (edge.target === currentId && edge.source === node.id)
  );
}

function drawLegend() {
  const width = mapCanvas.clientWidth;
  const legendWidth = 185;
  const legendHeight = 118;
  const x = width - legendWidth - 12;
  const y = 12;

  mapCtx.fillStyle = 'rgba(20, 22, 35, 0.86)';
  mapCtx.fillRect(x, y, legendWidth, legendHeight);
  mapCtx.strokeStyle = '#d4af37';
  mapCtx.lineWidth = 1.5;
  mapCtx.strokeRect(x, y, legendWidth, legendHeight);

  mapCtx.fillStyle = '#d4af37';
  mapCtx.font = 'bold 13px "Cinzel", serif';
  mapCtx.fillText('Map Legend', x + 10, y + 16);

  const items = [
    ['#d4af37', 'Current'],
    ['#7cb342', 'Visited'],
    ['#666a73', 'Undiscovered'],
    ['#d23636', 'Danger'],
    ['#d4af37', 'Shop']
  ];

  items.forEach((item, index) => {
    const cy = y + 32 + index * 16;
    mapCtx.fillStyle = item[0];
    mapCtx.beginPath();
    mapCtx.arc(x + 14, cy, 4.5, 0, Math.PI * 2);
    mapCtx.fill();
    mapCtx.fillStyle = '#f5e6c8';
    mapCtx.font = '12px "Crimson Text", serif';
    mapCtx.fillText(item[1], x + 24, cy + 4);
  });
}

function handleMapClick(event) {
  if (!mapCanvas || isDraggingMap) return;
  const rect = mapCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const clickedNode = getNodeAtCanvasPoint(x, y);
  if (!clickedNode) return;

  const { currentLocation } = GAME_STATE.map;
  if (currentLocation && clickedNode.id === currentLocation.id) {
    showLocationDetails(clickedNode);
    return;
  }

  if (isNeighborOfCurrent(clickedNode)) {
    travelToLocation(clickedNode);
  } else {
    showNotification('You can only travel to connected locations.', 'warning');
  }
}

function travelToLocation(location) {
  changeLocation(location.id);
  const structure = location.structure || location.type;
  const region = location.region || location.biome;
  addStoryMessage('system', `You travel to ${location.name}, a ${structure} in the ${region}. ${location.lore}`);
  setUIMode('story');
  if (typeof handleLocationArrival === 'function') {
    handleLocationArrival(location);
  }
}

function showLocationDetails(location) {
  const structure = location.structure || location.type;
  showNotification(`${location.name} | ${structure} | Danger ${location.danger}/5`, 'info');
}

function centerMapOnCurrent() {
  if (!GAME_STATE.map.currentLocation || !mapCanvas) return;
  const width = mapCanvas.clientWidth;
  const height = mapCanvas.clientHeight;
  const current = GAME_STATE.map.currentLocation;
  mapOffsetX = width / 2 - current.x * mapScale;
  mapOffsetY = height / 2 - current.y * mapScale;
  renderMap();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initMapCanvas,
    renderMap,
    centerMapOnCurrent,
    travelToLocation
  };
}
