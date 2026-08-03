export interface CameraState {
  pan: number;       // -50 to 50
  tilt: number;      // -30 to 30
  zoom: number;      // 1 to 8 (magnification)
  exposure: number;  // 0.2 to 2.0 (brightness)
  focus: number;     // 0 to 100
  focusMode: 'auto' | 'manual';
  customBgImage?: string; // Data URL for user-uploaded custom background image
}

// Module-level cache for scenario images
const imageCache: { [key: string]: HTMLImageElement } = {};
const loadListeners: Array<() => void> = [];

export function addImageLoadListener(listener: () => void) {
  loadListeners.push(listener);
  return () => {
    const idx = loadListeners.indexOf(listener);
    if (idx !== -1) loadListeners.splice(idx, 1);
  };
}

function getCachedImage(src: string): HTMLImageElement {
  if (!imageCache[src]) {
    const img = new Image();
    img.onload = () => {
      loadListeners.forEach((fn) => fn());
    };
    img.src = src;
    imageCache[src] = img;
  }
  return imageCache[src];
}

const videoCache: { [key: string]: HTMLVideoElement } = {};

export function getCachedVideo(src: string): HTMLVideoElement {
  if (!videoCache[src]) {
    const video = document.createElement('video');
    video.src = src;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('webkit-playsinline', 'true');
    video.preload = 'auto';
    
    // Media 1 video files should not loop or autoplay
    if (src.includes('media1.mp4')) {
      video.loop = false;
      video.autoplay = false;
      video.load();
    } else {
      video.loop = true;
      video.autoplay = true;
      video.play().catch((err) => {
        console.warn("Video play failed:", err);
      });
    }
    videoCache[src] = video;
  }
  return videoCache[src];
}

function drawMediaFile(ctx: CanvasRenderingContext2D, src: string, w: number, h: number) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (src.endsWith('.mp4')) {
    const video = getCachedVideo(src);
    ctx.drawImage(video, 0, 0, w, h);
  } else {
    const img = getCachedImage(src);
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
    }
  }
}

export function drawStageToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cameraIdx: 1 | 2 | 3,
  state: CameraState,
  sceneType?: 'none' | 'chairman' | 'interview' | 'watchtower' | 'stage' | 'demo',
  isAtem?: boolean
) {
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  ctx.save();

  // Apply high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.filter = 'none';

  // --- HANDLE HIGH-FIDELITY SCENARIO IMAGES (UNTRANSFORMED DRAWING PATH) ---
  const isAtemScenario = isAtem && (sceneType === 'chairman' || sceneType === 'interview' || sceneType === 'watchtower');
  if (isAtemScenario) {
    let imageDrawn = false;
    let sceneFolder = '';
    if (sceneType === 'chairman') {
      sceneFolder = 'ChairmainIntroduction';
    } else if (sceneType === 'interview') {
      sceneFolder = 'Demonstration';
    } else if (sceneType === 'watchtower') {
      sceneFolder = 'Watchtower';
    }

    if (sceneFolder) {
      const camSrc = `/scenarios/${sceneFolder}/cam${cameraIdx}.webp`;
      const img = getCachedImage(camSrc);
      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, 0, 0, width, height);
        imageDrawn = true;
      }
    }

    if (imageDrawn) {
      ctx.restore();
      return;
    }
  }

  // Center coordinate of stage
  const centerX = width / 2;
  const centerY = height / 2;

  // Camera perspective shifting based on index (1=Right, 2=Center, 3=Left)
  let angleShift = 0;
  if (cameraIdx === 1) angleShift = -100; // Stage Right looking left-ish
  if (cameraIdx === 3) angleShift = 100;  // Stage Left looking right-ish

  // Apply camera perspective angle offset first, then zoom true-center, then pan/tilt
  ctx.translate(centerX + angleShift, centerY);
  ctx.scale(state.zoom, state.zoom);
  ctx.translate(-centerX - state.pan * 18, -centerY - state.tilt * 14);

  // --- DRAW BACKGROUND SCENARIO IMAGE ---
  let ptzBgSrc = '/scenarios/PTZ_Images/Stage.webp';
  if (sceneType === 'watchtower') {
    ptzBgSrc = '/scenarios/PTZ_Images/StageWT.webp';
  } else if (sceneType === 'demo') {
    ptzBgSrc = '/scenarios/PTZ_Images/StageDemo.webp';
  }

  const scenarioBgImg = getCachedImage(ptzBgSrc);

  if (state.customBgImage) {
    const customImg = getCachedImage(state.customBgImage);
    if (customImg.complete && customImg.naturalWidth > 0) {
      ctx.drawImage(customImg, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, width, height);
    }
  } else if (scenarioBgImg.complete && scenarioBgImg.naturalWidth > 0) {
    ctx.drawImage(scenarioBgImg, 0, 0, width, height);
  } else {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-width, -height, width * 3, height * 3);
  }

  ctx.restore();
}

// Draw SMTPE Color Bars
export function drawColorBars(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const barWidth = width / 7;
  const colors = [
    '#ffffff', // White
    '#eeee00', // Yellow
    '#00eeee', // Cyan
    '#00ee00', // Green
    '#ee00ee', // Magenta
    '#ee0000', // Red
    '#0000ee', // Blue
  ];

  // Draw main bars
  colors.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(i * barWidth, 0, barWidth, height * 0.75);
  });

  // Draw lower section (I, Q, White, Black)
  const lowerColors = [
    '#0022ee', // Blue
    '#111111', // Black
    '#ee00ee', // Magenta
    '#111111', // Black
    '#00eeee', // Cyan
    '#111111', // Black
    '#ffffff', // White
  ];

  lowerColors.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(i * barWidth, height * 0.75, barWidth, height * 0.25);
  });
}

// Draw Media Player screen
export function drawMediaPlayerScreen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  type: 'media1' | 'vlc',
  _playbackTime: number,
  activeScenario?: 'none' | 'chairman' | 'interview' | 'watchtower'
) {
  // Determine media source path
  let mediaSrc = '';
  if (activeScenario === 'chairman') {
    mediaSrc = type === 'media1' 
      ? '/scenarios/ChairmainIntroduction/media1.mp4' 
      : '/scenarios/ChairmainIntroduction/media2.webp';
  } else if (activeScenario === 'interview') {
    mediaSrc = type === 'media1' 
      ? '/scenarios/Demonstration/media1.mp4' 
      : '/scenarios/Demonstration/media2.webp';
  } else if (activeScenario === 'watchtower') {
    mediaSrc = type === 'media1' 
      ? '/scenarios/Watchtower/media1.webp' 
      : '/scenarios/Watchtower/media2.webp';
  }

  if (mediaSrc) {
    drawMediaFile(ctx, mediaSrc, width, height);
    return;
  }

  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, width, height);

  if (type === 'media1') {
    // Simulated Media Player 1 Video Screen
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(1, '#0c4a6e');
    ctx.fillStyle = grad;
    ctx.fillRect(5, 5, width - 10, height - 30);

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.moveTo(width / 2 - 15, height / 2 - 20);
    ctx.lineTo(width / 2 + 20, height / 2 - 5);
    ctx.lineTo(width / 2 - 15, height / 2 + 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Media 1', width / 2, height - 20);
  } else {
    // Simulated VLC Backup screen
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(5, 5, width - 10, height - 30);

    const coneX = width / 2;
    const coneY = height / 2 - 10;
    
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(coneX - 15, coneY + 20);
    ctx.lineTo(coneX + 15, coneY + 20);
    ctx.lineTo(coneX + 4, coneY - 15);
    ctx.lineTo(coneX - 4, coneY - 15);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(coneX - 9, coneY + 5, 18, 4);
    ctx.fillRect(coneX - 6, coneY - 5, 12, 4);

    ctx.fillStyle = '#ea580c';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Media 2', width / 2, height - 20);
  }
}
