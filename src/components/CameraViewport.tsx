import React, { useEffect, useRef } from 'react';
import type { CameraState } from '../utils/canvasRenderer';
import { drawStageToCanvas, addImageLoadListener } from '../utils/canvasRenderer';

interface CameraViewportProps {
  cameraIdx: 1 | 2 | 3;
  cameraState: CameraState;
  isLive?: boolean;
  activeScenario?: 'stage' | 'watchtower' | 'demo';
  bgImageLoaded?: boolean;
  showGuides?: boolean;
}

export const CameraViewport: React.FC<CameraViewportProps> = ({
  cameraIdx,
  cameraState,
  isLive: _isLive,
  activeScenario = 'stage',
  bgImageLoaded,
  showGuides = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      drawStageToCanvas(ctx, canvas.width, canvas.height, cameraIdx, cameraState, activeScenario);
    };

    render();
    const unsubscribe = addImageLoadListener(render);
    return () => unsubscribe();
  }, [cameraIdx, cameraState, activeScenario, bgImageLoaded]);

  return (
    <div className="bg-black border-2 border-[#1c1e29] rounded-xl overflow-hidden relative shadow-md aspect-video w-full">
      {/* Drawing Viewport Canvas (High-Definition 1080p Resolution) */}
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        className="w-full h-full object-cover block"
      />

      {/* Frame Framing & Alignment Guides Overlay */}
      {showGuides && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Headroom 5% White Guide Line */}
          <div className="absolute top-[5%] left-0 right-0 border-t border-dashed border-white/80 shadow-[0_0_4px_rgba(255,255,255,0.6)]">
            <span className="absolute left-2 -top-3 text-[9px] font-mono font-bold text-white bg-black/70 px-1 rounded border border-white/30">HEADROOM</span>
          </div>

          {/* Center Crosshair (White) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center">
            {/* Horizontal Crosshair Bar */}
            <div className="absolute w-full h-[1.5px] bg-white/90 shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
            {/* Vertical Crosshair Bar */}
            <div className="absolute h-full w-[1.5px] bg-white/90 shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
            {/* Center Reticle Circle */}
            <div className="w-3 h-3 rounded-full border-1.5 border-white/90 shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
          </div>
        </div>
      )}
    </div>
  );
};
export default CameraViewport;
