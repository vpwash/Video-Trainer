import React, { useEffect, useRef } from 'react';
import type { CameraState } from '../utils/canvasRenderer';
import { drawStageToCanvas, drawColorBars, drawMediaPlayerScreen } from '../utils/canvasRenderer';

interface AtemMultiviewProps {
  programSource: number;  // 1-8
  previewSource: number;   // 1-8
  transitionProgress: number; // 0 to 1
  transitionType: 'mix' | 'wipe' | 'diss';
  wipePattern: number;
  cameraStates: { [key: number]: CameraState };
  showWbPanel?: boolean;
  playbackTime: number;
  isLive?: boolean;
  activeScenario?: 'none' | 'chairman' | 'interview' | 'watchtower';
  bgImageLoaded?: boolean;
}

export const AtemMultiview: React.FC<AtemMultiviewProps> = ({
  programSource,
  previewSource,
  transitionProgress,
  transitionType,
  wipePattern,
  cameraStates,
  showWbPanel = false,
  playbackTime,
  isLive = true,
  activeScenario = 'none',
  bgImageLoaded,
}) => {
  // We need refs for the 8 input canvases
  const canvasRefs = useRef<{ [key: number]: HTMLCanvasElement | null }>({});

  const sourceLabels: { [key: number]: string } = {
    1: 'CAM 1 - STAGE R',
    2: 'CAM 2 - CENTER PTZ',
    3: 'CAM 3 - STAGE L',
    4: 'MEDIA 1',
    5: 'MEDIA 2 - VLC',
    6: 'STREAM - PC',
    7: 'COLOR BARS',
    8: 'BLACK',
  };

  const drawFeed = (canvas: HTMLCanvasElement, sourceIdx: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    if (sourceIdx >= 1 && sourceIdx <= 3) {
      const state = cameraStates[sourceIdx];
      drawStageToCanvas(ctx, w, h, sourceIdx as 1 | 2 | 3, state, showWbPanel, activeScenario);
    } else if (sourceIdx === 4) {
      drawMediaPlayerScreen(ctx, w, h, 'media1', playbackTime);
    } else if (sourceIdx === 5) {
      drawMediaPlayerScreen(ctx, w, h, 'vlc', playbackTime);
    } else if (sourceIdx === 6) {
      // Stream PC (could be live broadcast laptop screen or black)
      ctx.fillStyle = '#06060c';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#10b981';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('STREAM OUT: OK', w / 2, h / 2 - 10);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Stream Server', w / 2, h / 2 + 10);
    } else if (sourceIdx === 7) {
      drawColorBars(ctx, w, h);
    } else if (sourceIdx === 8) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
    }
  };

  // Redraw canvases on updates
  useEffect(() => {
    Object.keys(canvasRefs.current).forEach((key) => {
      const idx = parseInt(key);
      const canvas = canvasRefs.current[idx];
      if (canvas) {
        drawFeed(canvas, idx);
      }
    });
  }, [cameraStates, playbackTime, showWbPanel, bgImageLoaded]);

  // Render a specific source view (re-creates canvas context locally for Program/Preview)
  const renderViewport = (sourceIdx: number, idSuffix: string) => {
    return (
      <canvas
        id={`multiview-canvas-${sourceIdx}-${idSuffix}`}
        ref={(el) => {
          if (el) drawFeed(el, sourceIdx);
        }}
        width={320}
        height={180}
        className="w-full h-full object-cover block"
      />
    );
  };

  return (
    <div className="bg-[#0f1016] border-4 border-[#1e202b] rounded-lg p-3 shadow-2xl w-full scanlines">
      {/* Header Info */}
      <div className="flex justify-between items-center text-xs text-gray-500 mb-2 border-b border-gray-800 pb-1 lcd-font">
        <span>MULTIVIEW MONITOR - PRODUCTION SWITCHER</span>
        <div className="flex items-center gap-2">
          {isLive && (
            <>
              <span className="w-2 h-2 rounded-full led-red led-pulse inline-block"></span>
              <span className="text-red-500 font-bold">LIVE ON STREAM</span>
            </>
          )}
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-12 gap-3">
        {/* PROGRAM WINDOW (Large Left) */}
        <div className="col-span-6 border-4 border-red-600 rounded overflow-hidden relative shadow-md aspect-video bg-black">
          <div className="absolute top-1 left-2 z-20 bg-red-600 text-white font-bold text-xs px-2 py-0.5 rounded shadow">
            PROGRAM
          </div>
          <div className="absolute bottom-1 right-2 z-20 text-red-400 font-bold text-[10px] bg-black/75 px-1.5 py-0.5 rounded border border-red-900/50 lcd-font">
            {sourceLabels[programSource]}
          </div>

          {/* Render with transitions */}
          <div className="relative w-full h-full">
            {transitionProgress > 0 && transitionProgress < 1 ? (
              transitionType === 'wipe' && wipePattern === 1 ? (
                // Split screen wipe transition
                // Left/Top is Program, Right/Bottom is Preview (50/50 at fader 0.5)
                <>
                  <div
                    className="absolute inset-0 w-full h-full transition-all duration-75"
                    style={{
                      clipPath: `polygon(0 0, 100% 0, 100% ${100 - transitionProgress * 100}%, 0 ${100 - transitionProgress * 100}%)`,
                    }}
                  >
                    {renderViewport(programSource, 'prog-split-1')}
                  </div>
                  <div
                    className="absolute inset-0 w-full h-full transition-all duration-75"
                    style={{
                      clipPath: `polygon(0 ${100 - transitionProgress * 100}%, 100% ${100 - transitionProgress * 100}%, 100% 100%, 0 100%)`,
                    }}
                  >
                    {renderViewport(previewSource, 'prog-split-2')}
                  </div>
                </>
              ) : (
                // Mix / Dissolve
                <>
                  <div className="absolute inset-0 w-full h-full" style={{ opacity: 1 - transitionProgress }}>
                    {renderViewport(programSource, 'prog-mix-1')}
                  </div>
                  <div className="absolute inset-0 w-full h-full" style={{ opacity: transitionProgress }}>
                    {renderViewport(previewSource, 'prog-mix-2')}
                  </div>
                </>
              )
            ) : (
              // Clean Program view
              renderViewport(programSource, 'prog')
            )}
          </div>
        </div>

        {/* PREVIEW WINDOW (Large Right) */}
        <div className="col-span-6 border-4 border-green-600 rounded overflow-hidden relative shadow-md aspect-video bg-black">
          <div className="absolute top-1 left-2 z-20 bg-green-600 text-white font-bold text-xs px-2 py-0.5 rounded shadow">
            PREVIEW
          </div>
          <div className="absolute bottom-1 right-2 z-20 text-green-400 font-bold text-[10px] bg-black/75 px-1.5 py-0.5 rounded border border-green-900/50 lcd-font">
            {sourceLabels[previewSource]}
          </div>
          <div className="w-full h-full">
            {renderViewport(previewSource, 'prev')}
          </div>
        </div>

        {/* Inputs Grid (1-8 Small Windows) */}
        <div className="col-span-12 grid grid-cols-4 gap-2 mt-1">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => {
            const isProg = programSource === idx && transitionProgress === 0;
            const isPrev = previewSource === idx;
            const isSplitProg = transitionProgress > 0 && programSource === idx;
            const isSplitPrev = transitionProgress > 0 && previewSource === idx;

            let borderStyle = 'border-2 border-gray-700';
            if (isProg || isSplitProg) {
              borderStyle = 'border-2 border-red-500 ring-2 ring-red-500/30';
            } else if (isPrev || isSplitPrev) {
              borderStyle = 'border-2 border-green-500 ring-2 ring-green-500/30';
            }

            return (
              <div
                key={idx}
                className={`rounded overflow-hidden relative bg-black aspect-video flex flex-col ${borderStyle} transition-all duration-150`}
              >
                {/* Labels */}
                <div className="absolute top-0.5 left-1 z-20 bg-black/75 text-gray-300 font-semibold text-[8px] px-1 rounded border border-gray-800">
                  {idx}
                </div>
                <div className="absolute bottom-0.5 right-1 z-20 bg-black/75 text-gray-400 font-medium text-[8px] px-1 rounded border border-gray-800 lcd-font">
                  {sourceLabels[idx]}
                </div>
                {/* Active Program/Preview indicator dot */}
                <div className="absolute top-1 right-1 z-20 flex gap-1">
                  {(isProg || isSplitProg) && (
                    <span className="w-1.5 h-1.5 rounded-full led-red"></span>
                  )}
                  {(isPrev || isSplitPrev) && (
                    <span className="w-1.5 h-1.5 rounded-full led-green"></span>
                  )}
                </div>

                <div className="w-full h-full flex-grow relative">
                  <canvas
                    id={`multiview-input-${idx}`}
                    ref={(el) => {
                      canvasRefs.current[idx] = el;
                    }}
                    width={160}
                    height={90}
                    className="w-full h-full object-cover block"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default AtemMultiview;
