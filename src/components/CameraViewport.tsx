import React, { useEffect, useRef } from 'react';
import type { CameraState } from '../utils/canvasRenderer';
import { drawStageToCanvas } from '../utils/canvasRenderer';
import { Camera, Focus, Sun, RefreshCw } from 'lucide-react';

interface CameraViewportProps {
  cameraIdx: 1 | 2 | 3;
  cameraState: CameraState;
  showWbPanel: boolean;
  isLive: boolean;
  bgImageLoaded?: boolean;
}

export const CameraViewport: React.FC<CameraViewportProps> = ({
  cameraIdx,
  cameraState,
  showWbPanel,
  isLive,
  bgImageLoaded,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawStageToCanvas(ctx, canvas.width, canvas.height, cameraIdx, cameraState, showWbPanel);
  }, [cameraIdx, cameraState, showWbPanel, bgImageLoaded]);

  // Focus quality status text
  const getFocusStatus = () => {
    if (cameraState.focusMode === 'auto') return 'AUTO FOCUS';
    const delta = Math.abs(cameraState.focus - 50);
    if (delta === 0) return 'MANUAL - SHARP';
    if (delta < 15) return 'MANUAL - SOFT';
    return 'MANUAL - OUT OF FOCUS';
  };

  return (
    <div className="bg-black border-4 border-[#1c1e29] rounded-xl overflow-hidden relative shadow-2xl aspect-video w-full scanlines">
      {/* Tally / Live status header */}
      <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-20 pointer-events-none">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur border border-white/10 rounded px-2.5 py-1 text-[11px] font-semibold text-white tracking-wide lcd-font">
          <Camera className="w-3.5 h-3.5 text-sky-400" />
          <span>CAM {cameraIdx}</span>
          <span className="text-gray-500">•</span>
          <span className="text-gray-400">192.168.1.15{cameraIdx}</span>
        </div>

        {isLive && (
          <div className="flex items-center gap-2 bg-red-600/90 backdrop-blur rounded px-2.5 py-1 text-[11px] font-bold text-white tracking-widest uppercase led-pulse shadow-lg">
            <span className="w-2 h-2 rounded-full bg-white inline-block"></span>
            LIVE
          </div>
        )}
      </div>

      {/* Crosshair Overlay (simulates view finder help) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="w-10 h-10 border border-white rounded-full flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
        <div className="absolute w-16 h-[1px] bg-white"></div>
        <div className="absolute h-16 w-[1px] bg-white"></div>
      </div>

      {/* Screen HUD Indicators (Bottom overlay) */}
      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center z-20 pointer-events-none text-[10px] font-mono text-white/80 bg-black/50 backdrop-blur border border-white/5 rounded p-2 select-text">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Focus className="w-3 h-3 text-sky-400" />
            <span className={cameraState.focusMode === 'auto' ? 'text-green-400' : 'text-amber-400'}>
              {getFocusStatus()}
            </span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Sun className="w-3 h-3 text-yellow-400" />
            <span>IRIS: F{Number(cameraState.exposure * 2.8).toFixed(1)}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span>ZOOM: x{cameraState.zoom.toFixed(1)}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <RefreshCw className={`w-3 h-3 ${cameraState.wbStatus === 'calibrating' ? 'animate-spin text-amber-400' : 'text-sky-400'}`} />
            <span className={
              cameraState.wbStatus === 'done' ? 'text-green-400' : 
              cameraState.wbStatus === 'calibrating' ? 'text-amber-400' : 'text-gray-400'
            }>
              WB: {cameraState.wbStatus.toUpperCase()}
            </span>
          </span>
        </div>
      </div>

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
