export interface CameraState {
  pan: number;       // -50 to 50
  tilt: number;      // -30 to 30
  zoom: number;      // 1 to 8 (magnification)
  exposure: number;  // 0.2 to 2.0 (brightness)
  focus: number;     // 0 to 100 (where 50 is perfect sharp, others are blur)
  focusMode: 'auto' | 'manual';
  wbStatus: 'default' | 'calibrating' | 'done';
  wbTint: string;    // CSS tint filter color, e.g. 'orange', 'cyan', 'transparent'
  customBgImage?: string; // Data URL for user-uploaded custom background image
}

// Module-level cache for scenario images
const imageCache: { [key: string]: HTMLImageElement } = {};

function getCachedImage(src: string): HTMLImageElement {
  if (!imageCache[src]) {
    const img = new Image();
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

function drawMaleCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  skinColor: string,
  suitColor: string,
  tieColor: string,
  hairColor: string,
  beardColor?: string,
  hasMicrophone?: boolean,
  hasBook?: boolean,
  badgeColor: string = '#ffffff'
) {
  // Suit / Torso (mid-shot, so we draw the suit jacket and trousers/torso)
  ctx.fillStyle = suitColor;
  ctx.beginPath();
  ctx.moveTo(x - 14, y + 25);
  ctx.lineTo(x + 14, y + 25);
  ctx.lineTo(x + 8, y - 20);
  ctx.lineTo(x - 8, y - 20);
  ctx.closePath();
  ctx.fill();

  // Pants (drawn down to bottom if mid-shot)
  ctx.fillRect(x - 14, y + 25, 28, 40);

  // Divider for legs
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + 25);
  ctx.lineTo(x, y + 65);
  ctx.stroke();

  // Shirt collar (White V)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x - 4, y - 20);
  ctx.lineTo(x + 4, y - 20);
  ctx.lineTo(x, y - 12);
  ctx.closePath();
  ctx.fill();

  // Tie
  ctx.fillStyle = tieColor;
  ctx.beginPath();
  ctx.moveTo(x - 1.5, y - 12);
  ctx.lineTo(x + 1.5, y - 12);
  ctx.lineTo(x + 2, y + 2);
  ctx.lineTo(x, y + 5);
  ctx.lineTo(x - 2, y + 2);
  ctx.closePath();
  ctx.fill();

  // Badge Card (Clipped on speaker's breast pocket, viewer's right)
  ctx.fillStyle = badgeColor;
  ctx.fillRect(x + 4, y - 11, 5, 3.5);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x + 4, y - 11, 5, 3.5);
  
  // Blue band representing name or lanyard on badge
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(x + 4.5, y - 10, 4, 1);

  // Head (Skin tone)
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(x, y - 28, 7, 0, Math.PI * 2);
  ctx.fill();

  // Beard (if present)
  if (beardColor) {
    ctx.fillStyle = beardColor;
    ctx.beginPath();
    ctx.arc(x, y - 24, 4.5, 0, Math.PI);
    ctx.fill();
    // mustache
    ctx.beginPath();
    ctx.ellipse(x, y - 24, 3, 1, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hair
  if (hairColor === 'bald') {
    // White/grey hair on sides
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.arc(x - 6.5, y - 26, 2.5, 0, Math.PI * 2);
    ctx.arc(x + 6.5, y - 26, 2.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyebrows
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 31);
    ctx.lineTo(x - 1, y - 31);
    ctx.moveTo(x + 1, y - 31);
    ctx.lineTo(x + 4, y - 31);
    ctx.stroke();
    
    // Mustache (if not beard)
    if (!beardColor) {
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.ellipse(x, y - 24, 3, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Normal hair
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.arc(x, y - 31, 7, Math.PI, 0); // top half
    ctx.fill();
  }

  // Eyes (black dots)
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(x - 2.5, y - 28, 0.8, 0, Math.PI * 2);
  ctx.arc(x + 2.5, y - 28, 0.8, 0, Math.PI * 2);
  ctx.fill();

  // Smile/Mouth
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(x, y - 23, 1.5, 0, Math.PI);
  ctx.stroke();

  // Hand holding book/mic
  if (hasBook) {
    // Draw hands holding a book
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(x - 3, y - 5, 3, 0, Math.PI * 2);
    ctx.arc(x + 3, y - 5, 3, 0, Math.PI * 2);
    ctx.fill();

    // Grey book / magazine
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 8);
    ctx.lineTo(x + 7, y - 8);
    ctx.lineTo(x + 5, y + 2);
    ctx.lineTo(x - 5, y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (hasMicrophone) {
    // Hand holding microphone
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(x, y - 5, 3, 0, Math.PI * 2);
    ctx.fill();

    // Microphone stem
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x, y - 14);
    ctx.stroke();

    // Microphone capsule
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(x, y - 14, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFemaleCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  skinColor: string,
  dressColor: string,
  hairColor: string,
  necklaceColor: string,
  badgeColor: string = '#ffffff'
) {
  // Hair (drawn behind back of head/neck first)
  ctx.fillStyle = hairColor;
  ctx.beginPath();
  ctx.arc(x, y - 28, 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 8.5, y - 28, 17, 30); // long hair down

  // Dress / Torso (V-neck dress)
  ctx.fillStyle = dressColor;
  ctx.beginPath();
  ctx.moveTo(x - 12, y + 25);
  ctx.lineTo(x + 12, y + 25);
  ctx.lineTo(x + 8, y - 18);
  ctx.lineTo(x - 8, y - 18);
  ctx.closePath();
  ctx.fill();

  // Skirt part
  ctx.fillRect(x - 12, y + 25, 24, 40);

  // V-neck skin reveal
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.moveTo(x - 3.5, y - 18);
  ctx.lineTo(x + 3.5, y - 18);
  ctx.lineTo(x, y - 10);
  ctx.closePath();
  ctx.fill();

  // Necklace (white pearls around neck)
  ctx.fillStyle = necklaceColor;
  for (let angle = 0.2; angle < Math.PI - 0.2; angle += 0.4) {
    const pearlX = x + Math.cos(angle) * 4.5;
    const pearlY = y - 15 + Math.sin(angle) * 3;
    ctx.beginPath();
    ctx.arc(pearlX, pearlY, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Head (Skin tone)
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(x, y - 28, 6.5, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (black dots)
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(x - 2.2, y - 28, 0.8, 0, Math.PI * 2);
  ctx.arc(x + 2.2, y - 28, 0.8, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(x, y - 23, 1.5, 0, Math.PI);
  ctx.stroke();

  // Badge Card (Clipped on breast pocket, viewer's right)
  ctx.fillStyle = badgeColor;
  ctx.fillRect(x + 3.5, y - 10, 4.5, 3);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x + 3.5, y - 10, 4.5, 3);

  // Lanyard accent
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(x + 4, y - 9, 3.5, 0.8);
}

export function drawStageToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cameraIdx: 1 | 2 | 3,
  state: CameraState,
  showWbPanel: boolean,
  sceneType?: 'none' | 'chairman' | 'interview' | 'watchtower' | 'stage' | 'demo',
  isAtem?: boolean
) {
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  ctx.save();

  // Apply high-quality image smoothing & image enhancement filters
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Apply camera filters (Exposure and Focus) with image enhancement (contrast/saturation boost for crisp broadcast quality)
  const isAtemScenario = isAtem && (sceneType === 'chairman' || sceneType === 'interview' || sceneType === 'watchtower');
  let blurAmount = 0;
  if (state.focusMode === 'manual' && !isAtemScenario) {
    // Blur is proportional to how far focus is from 50 (sweet spot)
    blurAmount = Math.abs(state.focus - 50) / 5;
  }
  
  const brightnessPercent = isAtemScenario ? 100 : Math.round(state.exposure * 100);
  
  // Apply visual enhancement filters: brightness, sharp contrast (104%), rich color saturation (106%), and focus blur
  ctx.filter = `brightness(${brightnessPercent}%) contrast(104%) saturate(106%) blur(${blurAmount}px)`;

  // Center coordinate of stage
  const centerX = width / 2;
  const centerY = height / 2;

  // Camera perspective shifting based on index (1=Right, 2=Center, 3=Left)
  let angleShift = 0;
  if (cameraIdx === 1) angleShift = -80; // Stage Right looking left-ish
  if (cameraIdx === 3) angleShift = 80;  // Stage Left looking right-ish

  // Pan and Tilt translations (scaled by zoom)
  const panOffset = -state.pan * 6 * state.zoom + angleShift;
  const tiltOffset = -state.tilt * 5 * state.zoom;

  // Apply transformations: Zoom from center, then translate
  // Apply filters via canvas context if supported
  ctx.filter = `brightness(${brightnessPercent}%) blur(${blurAmount}px)`;

  // --- HANDLE HIGH-FIDELITY SCENARIO IMAGES (UNTRANSFORMED DRAWING PATH) ---
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
      const camSrc = `/scenarios/${sceneFolder}/cam${cameraIdx}.png`;
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

  // Apply transformations: Zoom from center, then translate
  ctx.translate(centerX, centerY);
  ctx.scale(state.zoom, state.zoom);
  ctx.translate(-centerX + panOffset / state.zoom, -centerY + tiltOffset / state.zoom);

  // Position changes slightly based on camera index (perspective)
  let lecternX = centerX;
  if (cameraIdx === 1) lecternX = centerX + 15;
  if (cameraIdx === 3) lecternX = centerX - 15;

  let drawVectorStage = true;

  // --- DRAW BACKGROUND SCENARIO IMAGE ---
  let ptzBgSrc = '/scenarios/PTZ_Images/Stage.png';
  if (sceneType === 'watchtower') {
    ptzBgSrc = '/scenarios/PTZ_Images/StageWT.png';
  } else if (sceneType === 'demo') {
    ptzBgSrc = '/scenarios/PTZ_Images/StageDemo.png';
  }

  const scenarioBgImg = getCachedImage(ptzBgSrc);
  const fallbackStageImg = getCachedImage('/scenarios/stage.jpeg');

  if (state.customBgImage) {
    const customImg = getCachedImage(state.customBgImage);
    if (customImg.complete && customImg.naturalWidth > 0) {
      ctx.drawImage(customImg, 0, 0, width, height);
      drawVectorStage = false;
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, width, height);
      drawVectorStage = false;
    }
  } else if (scenarioBgImg.complete && scenarioBgImg.naturalWidth > 0) {
    ctx.drawImage(scenarioBgImg, 0, 0, width, height);
    drawVectorStage = false;
  } else if (fallbackStageImg.complete && fallbackStageImg.naturalWidth > 0) {
    ctx.drawImage(fallbackStageImg, 0, 0, width, height);
    drawVectorStage = false;
  } else {
    ctx.fillStyle = '#5a8cb3';
    ctx.fillRect(-width, -height, width * 3, height * 3);
  }

  if (drawVectorStage) {
    // --- DRAW STAGE FLOOR ---
    ctx.fillStyle = '#cbd5e1'; // Light grey stage floor per CO-160
    ctx.beginPath();
    ctx.moveTo(centerX - 300, centerY + 30);
    ctx.lineTo(centerX + 300, centerY + 30);
    ctx.lineTo(centerX + 400, height + 100);
    ctx.lineTo(centerX - 400, height + 100);
    ctx.closePath();
    ctx.fill();

    // Stage lip border (dark slate-grey lip)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(centerX - 300, centerY + 30);
    ctx.lineTo(centerX + 300, centerY + 30);
    ctx.stroke();
  }

  // Draw scene contents based on active scenario type
  if (drawVectorStage) {
  if (sceneType === 'interview') {
    // Stage Interview scenario scene (CO-160 page 22 top example)
    if (cameraIdx === 2) {
      // Wide/Mid view showing both Host and Interviewee
      drawMaleCharacter(ctx, centerX - 35, centerY - 10, '#fed7aa', '#1e293b', '#a855f7', '#000000', undefined, true, false);
      drawFemaleCharacter(ctx, centerX + 35, centerY - 10, '#fed7aa', '#0ea5e9', '#000000', '#ffffff');
    } else if (cameraIdx === 1) {
      // Camera 1 (Stage Right) focuses on the Host (man)
      drawMaleCharacter(ctx, centerX, centerY - 10, '#fed7aa', '#1e293b', '#a855f7', '#000000', undefined, true, false);
    } else if (cameraIdx === 3) {
      // Camera 3 (Stage Left) focuses on the Interviewee (woman)
      drawFemaleCharacter(ctx, centerX, centerY - 10, '#fed7aa', '#0ea5e9', '#000000', '#ffffff');
    }
  } else if (sceneType === 'watchtower') {
    // Watchtower Summary scenario scene (CO-160 page 22 bottom example)
    if (cameraIdx === 1) {
      // Camera 1 (Stage Right / Wide): Conductor on the left, Reader on the right
      drawMaleCharacter(ctx, centerX - 35, centerY - 10, '#78350f', '#1e293b', '#eab308', 'bald', '#000000', false, true);
      drawMaleCharacter(ctx, centerX + 35, centerY - 10, '#fed7aa', '#64748b', '#a855f7', '#000000', undefined, true, false);
    } else if (cameraIdx === 2) {
      // Camera 2 (Center): Medium Close-up of Conductor
      drawMaleCharacter(ctx, centerX, centerY - 10, '#78350f', '#1e293b', '#eab308', 'bald', '#000000', false, true);
    } else if (cameraIdx === 3) {
      // Camera 3 (Stage Left): Medium Close-up of Reader
      drawMaleCharacter(ctx, centerX, centerY - 10, '#fed7aa', '#64748b', '#a855f7', '#000000', undefined, true, false);
    }
  } else {
    // DEFAULT / CHAIRMAN SCENE (CO-160 default stage setup)
    // --- DRAW SECOND MICROPHONE STAND (extra stage equipment per CO-160 page 21) ---
      let standX = centerX - 60;
      if (cameraIdx === 1) standX = centerX - 60;
      if (cameraIdx === 3) standX = centerX + 60;

      // Base
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.ellipse(standX, centerY + 30, 8, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Vertical pole
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(standX, centerY + 30);
      ctx.lineTo(standX, centerY - 15);
      ctx.stroke();

      // Boom joint and clip
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(standX, centerY - 15);
      ctx.lineTo(standX - 4, centerY - 22);
      ctx.stroke();

      // Microphone head
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(standX - 4, centerY - 22, 2, 0, Math.PI * 2);
      ctx.fill();

      // --- DRAW LECTERN ---
      // (lecternX is defined at the top level)
      // Lectern base & body
      ctx.fillStyle = '#451a03'; // dark brown mahogany
      ctx.beginPath();
      ctx.moveTo(lecternX - 15, centerY + 30);
      ctx.lineTo(lecternX + 15, centerY + 30);
      ctx.lineTo(lecternX + 12, centerY - 20);
      ctx.lineTo(lecternX - 12, centerY - 20);
      ctx.closePath();
      ctx.fill();
      
      // Lectern top panel
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(lecternX - 18, centerY - 20);
      ctx.lineTo(lecternX + 18, centerY - 20);
      ctx.lineTo(lecternX + 14, centerY - 28);
      ctx.lineTo(lecternX - 14, centerY - 28);
      ctx.closePath();
      ctx.fill();

      // Microphone on lectern (Correct positioning: placed below the mouth/chin per CO-160)
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lecternX - 4, centerY - 25);
      ctx.quadraticCurveTo(lecternX - 8, centerY - 30, lecternX - 5, centerY - 33);
      ctx.stroke();
      
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(lecternX - 5, centerY - 33, 2, 0, Math.PI * 2);
      ctx.fill();

      // --- DRAW SPEAKER (Standing behind lectern) ---
      const speakerX = lecternX;
      const speakerY = centerY - 15; // slightly offset up

      // Suit / Torso (grey suit matching CO-160 Close-up)
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(speakerX - 14, speakerY + 15);
      ctx.lineTo(speakerX + 14, speakerY + 15);
      ctx.lineTo(speakerX + 8, speakerY - 20);
      ctx.lineTo(speakerX - 8, speakerY - 20);
      ctx.closePath();
      ctx.fill();

      // Shirt collar (White V)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(speakerX - 4, speakerY - 20);
      ctx.lineTo(speakerX + 4, speakerY - 20);
      ctx.lineTo(speakerX, speakerY - 12);
      ctx.closePath();
      ctx.fill();

      // Tie (Teal/Blue tie matching CO-160 Close-up)
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(speakerX - 1.5, speakerY - 12);
      ctx.lineTo(speakerX + 1.5, speakerY - 12);
      ctx.lineTo(speakerX + 2, speakerY + 2);
      ctx.lineTo(speakerX, speakerY + 5);
      ctx.lineTo(speakerX - 2, speakerY + 2);
      ctx.closePath();
      ctx.fill();

      // Badge Card (Clipped on speaker's breast pocket, viewer's right)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(speakerX + 4, speakerY - 11, 5, 3.5);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(speakerX + 4, speakerY - 11, 5, 3.5);
      
      // Blue band representing name or lanyard on badge
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(speakerX + 4.5, speakerY - 10, 4, 1);

      // Head (Skin tone)
      ctx.fillStyle = '#fed7aa'; // Peachy skin tone matching CO-160
      ctx.beginPath();
      ctx.arc(speakerX, speakerY - 28, 7, 0, Math.PI * 2);
      ctx.fill();

      // Hair (Bald on top, white/grey hair on the sides)
      ctx.fillStyle = '#f1f5f9'; // White/grey hair
      // Left side hair arc
      ctx.beginPath();
      ctx.arc(speakerX - 6.5, speakerY - 26, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Right side hair arc
      ctx.beginPath();
      ctx.arc(speakerX + 6.5, speakerY - 26, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Eyebrows (white/grey)
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(speakerX - 4, speakerY - 31);
      ctx.lineTo(speakerX - 1, speakerY - 31);
      ctx.moveTo(speakerX + 1, speakerY - 31);
      ctx.lineTo(speakerX + 4, speakerY - 31);
      ctx.stroke();

      // Eyes (black dots)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(speakerX - 2.5, speakerY - 28, 0.8, 0, Math.PI * 2);
      ctx.arc(speakerX + 2.5, speakerY - 28, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Mustache (white/grey)
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.ellipse(speakerX, speakerY - 24, 3, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Smile/Mouth
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
    ctx.arc(speakerX, speakerY - 23, 1.5, 0, Math.PI);
    ctx.stroke();
    }
  }

  // --- DRAW COLLAPSIBLE WHITE BALANCE PANEL ---
  // Positioned near the speaker's head (as if held by someone standing next to them)
  if (showWbPanel) {
    const speakerX = lecternX;
    const speakerY = centerY - 15;
    const wbX = speakerX - 28;
    const wbY = speakerY - 28;

    // Draw helper arm holding the panel
    ctx.strokeStyle = '#fbcfe8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(wbX - 10, wbY + 30);
    ctx.lineTo(wbX, wbY);
    ctx.stroke();

    // Draw white balance panel outer black ring
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(wbX, wbY, 15, 0, Math.PI * 2);
    ctx.fill();

    // Draw white balance inner white surface
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(wbX, wbY, 13, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw crosshair on white balance panel
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(wbX - 10, wbY);
    ctx.lineTo(wbX + 10, wbY);
    ctx.moveTo(wbX, wbY - 10);
    ctx.lineTo(wbX, wbY + 10);
    ctx.stroke();
  }

  ctx.restore();

  // Apply White Balance Color Tint overlay
  if (state.wbStatus !== 'done' && state.wbTint && state.wbTint !== 'transparent') {
    ctx.fillStyle = state.wbTint;
    ctx.globalCompositeOperation = 'color';
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
  }
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
  playbackTime: number,
  activeScenario?: 'none' | 'chairman' | 'interview' | 'watchtower'
) {
  // Determine media source path
  let mediaSrc = '';
  if (activeScenario === 'chairman') {
    mediaSrc = type === 'media1' 
      ? '/scenarios/ChairmainIntroduction/media1.mp4' 
      : '/scenarios/ChairmainIntroduction/media2.png';
  } else if (activeScenario === 'interview') {
    mediaSrc = type === 'media1' 
      ? '/scenarios/Demonstration/media1.mp4' 
      : '/scenarios/Demonstration/media2.png';
  } else if (activeScenario === 'watchtower') {
    mediaSrc = type === 'media1' 
      ? '/scenarios/Watchtower/media1.png' 
      : '/scenarios/Watchtower/media2.png';
  }

  if (mediaSrc) {
    drawMediaFile(ctx, mediaSrc, width, height);
    return;
  }

  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, width, height);

  if (type === 'media1') {
    // Simulated Media Player 1 Video Screen
    // Draw sky/clouds backdrop
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(1, '#0c4a6e');
    ctx.fillStyle = grad;
    ctx.fillRect(5, 5, width - 10, height - 30);

    // Draw a big white logo or play shape
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.moveTo(width / 2 - 15, height / 2 - 20);
    ctx.lineTo(width / 2 + 20, height / 2 - 5);
    ctx.lineTo(width / 2 - 15, height / 2 + 10);
    ctx.closePath();
    ctx.fill();

    // Floating text caption
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Media 1', width / 2, height - 20); // adjusted y offset
  } else {
    // Simulated VLC Backup screen
    ctx.fillStyle = '#1e1b4b'; // Dark violet
    ctx.fillRect(5, 5, width - 10, height - 30);

    // VLC Cone orange icon
    const coneX = width / 2;
    const coneY = height / 2 - 10;
    
    ctx.fillStyle = '#ea580c'; // orange
    ctx.beginPath();
    ctx.moveTo(coneX - 15, coneY + 20);
    ctx.lineTo(coneX + 15, coneY + 20);
    ctx.lineTo(coneX + 4, coneY - 15);
    ctx.lineTo(coneX - 4, coneY - 15);
    ctx.closePath();
    ctx.fill();

    // White stripes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(coneX - 9, coneY + 5, 18, 4);
    ctx.fillRect(coneX - 6, coneY - 5, 12, 4);

    ctx.fillStyle = '#ea580c';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Media 2', width / 2, height - 20); // adjusted y offset
  }
}
