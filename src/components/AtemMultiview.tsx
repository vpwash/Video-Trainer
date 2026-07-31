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
  // We need refs for the large viewports (Preview, Program) to redraw them on updates
  const viewportRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});

  const buttonLabels: { [key: number]: string } = {
    1: 'Cam 1',
    2: 'Cam 2',
    3: 'Cam 3',
    4: 'Med 1',
    5: 'Med 2',
    6: 'Stream',
    7: 'Color Bars',
    8: 'BLACK',
  };

  const drawFeed = (canvas: HTMLCanvasElement, sourceIdx: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    if (sourceIdx >= 1 && sourceIdx <= 3) {
      const state = cameraStates[sourceIdx];
      drawStageToCanvas(ctx, w, h, sourceIdx as 1 | 2 | 3, state, showWbPanel, activeScenario, true);
    } else if (sourceIdx === 4) {
      drawMediaPlayerScreen(ctx, w, h, 'media1', playbackTime, activeScenario);
    } else if (sourceIdx === 5) {
      drawMediaPlayerScreen(ctx, w, h, 'vlc', playbackTime, activeScenario);
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
    // Redraw the 8 small inputs
    Object.keys(canvasRefs.current).forEach((key) => {
      const idx = parseInt(key);
      const canvas = canvasRefs.current[idx];
      if (canvas) {
        drawFeed(canvas, idx);
      }
    });

    // Redraw the large viewports
    Object.keys(viewportRefs.current).forEach((key) => {
      const canvas = viewportRefs.current[key];
      if (canvas) {
        const parts = key.split('-');
        const sourceIdx = parseInt(parts[parts.length - 1]);
        if (!isNaN(sourceIdx)) {
          drawFeed(canvas, sourceIdx);
        }
      }
    });
  }, [cameraStates, playbackTime, showWbPanel, bgImageLoaded, transitionProgress]);

  // Render a specific source view (re-creates canvas context locally for Program/Preview)
  const renderViewport = (sourceIdx: number, idSuffix: string) => {
    const key = `${idSuffix}-${sourceIdx}`;
    return (
      <canvas
        id={`multiview-canvas-${sourceIdx}-${idSuffix}`}
        ref={(el) => {
          if (el) {
            viewportRefs.current[key] = el;
            drawFeed(el, sourceIdx);
          } else {
            delete viewportRefs.current[key];
          }
        }}
        width={320}
        height={180}
        className="w-full h-full object-cover block"
      />
    );
  };

  return (
    <div className="bg-[#0f1016] border-4 border-[#1e202b] rounded-lg p-3 shadow-2xl w-full">
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
        {/* PREVIEW WINDOW (Large Left) */}
        <div className="col-span-6 border-4 border-green-600 rounded overflow-hidden relative shadow-md aspect-video bg-black">
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20 text-white font-bold text-xs uppercase tracking-wider drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)] font-sans text-center whitespace-nowrap">
            Preview
          </div>
          <div className="w-full h-full">
            {renderViewport(previewSource, 'prev')}
          </div>
        </div>

        {/* PROGRAM WINDOW (Large Right) */}
        <div className="col-span-6 border-4 border-red-600 rounded overflow-hidden relative shadow-md aspect-video bg-black">
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20 text-white font-bold text-xs uppercase tracking-wider drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)] font-sans text-center whitespace-nowrap">
            Program
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

        {/* Inputs Grid (Small Windows rearranged: Cam 1-3, Media 1-2, Stream, Bars, Black) */}
        <div className="col-span-12 grid grid-cols-4 gap-2 mt-1">
          {[1, 2, 3, 7, 4, 5, 6, 8].map((idx) => {
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
                {/* Center Bottom White Text Label Only */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20 text-white font-bold text-[9px] uppercase tracking-wider drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.9)] font-sans text-center whitespace-nowrap">
                  {buttonLabels[idx]}
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
