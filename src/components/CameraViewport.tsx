import React, { useEffect, useRef } from 'react';
import type { CameraState } from '../utils/canvasRenderer';
import { drawStageToCanvas, addImageLoadListener } from '../utils/canvasRenderer';
import { RefreshCw } from 'lucide-react';

interface CameraViewportProps {
  cameraIdx: 1 | 2 | 3;
  cameraState: CameraState;
  showWbPanel: boolean;
  isLive: boolean;
  activeScenario?: 'stage' | 'watchtower' | 'demo';
  bgImageLoaded?: boolean;
}

export const CameraViewport: React.FC<CameraViewportProps> = ({
  cameraIdx,
  cameraState,
  showWbPanel,
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
      drawStageToCanvas(ctx, canvas.width, canvas.height, cameraIdx, cameraState, showWbPanel, activeScenario);
    };

    render();
    const unsubscribe = addImageLoadListener(render);
    return () => unsubscribe();
  }, [cameraIdx, cameraState, showWbPanel, activeScenario, bgImageLoaded]);

  return (
    <div className="bg-black border-2 border-[#1c1e29] rounded-xl overflow-hidden relative shadow-md aspect-video w-full">
      {/* Tally / Live status header */}

      {/* Calibration Progress Alert Overlay */}
      {cameraState.wbStatus === 'calibrating' && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-15 backdrop-blur-xs">
          <div className="bg-[#1c1811] border border-amber-500/50 rounded-lg p-4 flex flex-col items-center gap-3 shadow-2xl max-w-xs text-center select-text">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
            <div>
              <h4 className="text-white font-bold text-xs font-mono uppercase tracking-wide">White Balancing...</h4>
              <p className="text-[10px] text-gray-400 mt-1">Calibrating sensor temperature against reference panel.</p>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-amber-500 h-1.5 animate-[pulse_1s_infinite] w-full"></div>
            </div>
          </div>
        </div>
      )}

      {/* Drawing Viewport Canvas */}
      <canvas
        ref={canvasRef}
        width={640}
        height={360}
        className="w-full h-full object-cover block"
      />
    </div>
  );
};
export default CameraViewport;
