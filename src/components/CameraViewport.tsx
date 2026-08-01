import React, { useEffect, useRef } from 'react';
import type { CameraState } from '../utils/canvasRenderer';
import { drawStageToCanvas, addImageLoadListener } from '../utils/canvasRenderer';

interface CameraViewportProps {
  cameraIdx: 1 | 2 | 3;
  cameraState: CameraState;
  isLive?: boolean;
  activeScenario?: 'stage' | 'watchtower' | 'demo';
  bgImageLoaded?: boolean;
}

export const CameraViewport: React.FC<CameraViewportProps> = ({
  cameraIdx,
  cameraState,
  isLive: _isLive,
  activeScenario = 'stage',
  bgImageLoaded,
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
    </div>
  );
};
export default CameraViewport;
