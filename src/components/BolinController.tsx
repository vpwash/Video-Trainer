import React, { useState, useEffect, useRef } from 'react';
import { useAudio } from '../hooks/useAudio';
import type { CameraState } from '../utils/canvasRenderer';
import { RefreshCw, Play, Save, ChevronUp, ChevronDown } from 'lucide-react';

interface BolinControllerProps {
  activeCameraIdx: 1 | 2 | 3;
  cameraState: CameraState;
  onSelectCamera: (idx: 1 | 2 | 3) => void;
  onJoystickMove: (dx: number, dy: number) => void; // -1 to 1
  onJoystickRelease: () => void;
  onZoomPress: (dir: number) => void; // -1, 0, 1
  onKnobChange: (param: 'speed' | 'zoomSpeed' | 'exposure' | 'focus', val: number) => void;
  onToggleFocusMode: () => void;
  onOnePushWb: () => void;
  onKeypadPress: (num: number) => void;
  onPresetModeToggle: () => void;
  onCallModeToggle: () => void;
  presetMode: 'none' | 'store' | 'call';
  joystickSpeed: number; // Current PT speed knob setting
  zoomSpeedVal: number;  // Current zoom speed knob setting
  presetMessage: string;
  invertTilt: boolean;
  onToggleInvertTilt: () => void;
}

export const BolinController: React.FC<BolinControllerProps> = ({
  activeCameraIdx,
  cameraState,
  onSelectCamera,
  onJoystickMove,
  onJoystickRelease,
  onZoomPress,
  onKnobChange,
  onToggleFocusMode,
  onOnePushWb,
  onKeypadPress,
  onPresetModeToggle,
  onCallModeToggle,
  presetMode,
  joystickSpeed,
  zoomSpeedVal,
  presetMessage,
  invertTilt,
  onToggleInvertTilt,
}) => {
  const { playClick, startMotorHum, stopMotorHum } = useAudio();

  // Joystick state
  const [isDragging, setIsDragging] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);

  // Handle joystick dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!baseRef.current) return;
      const rect = baseRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = e.clientX - centerX;
      let dy = e.clientY - centerY;

      const maxRadius = 45;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > maxRadius) {
        dx = (dx / distance) * maxRadius;
        dy = (dy / distance) * maxRadius;
      }

      setJoystickPos({ x: dx, y: dy });

      // Calculate relative speed (-1 to 1)
      const relX = dx / maxRadius;
      const relY = (invertTilt ? dy : -dy) / maxRadius; // Invert Y so up is positive tilt (or flip if inverted)
      onJoystickMove(relX, relY);

      // Start audio hum based on speed
      const totalSpeed = Math.sqrt(relX * relX + relY * relY);
      startMotorHum(totalSpeed);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setJoystickPos({ x: 0, y: 0 });
      onJoystickRelease();
      stopMotorHum();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, invertTilt]);

  const handleJoystickMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    playClick();
    setIsDragging(true);
  };

  // Zoom Tele/Wide click and hold
  const handleZoomStart = (dir: number) => {
    playClick();
    onZoomPress(dir);
    startMotorHum(0.6);
  };

  const handleZoomStop = () => {
    onZoomPress(0);
    stopMotorHum();
  };

  const handleCameraBtn = (idx: 1 | 2 | 3) => {
    playClick();
    onSelectCamera(idx);
  };

  const handlePresetModeClick = () => {
    playClick();
    onPresetModeToggle();
  };

  const handleCallModeClick = () => {
    playClick();
    onCallModeToggle();
  };

  const handleNumKey = (num: number) => {
    playClick();
    onKeypadPress(num);
  };

  return (
    <div className="bg-[#1f212d] border-4 border-[#313546] rounded-xl p-5 shadow-2xl w-full text-gray-300 font-sans select-none relative">
      {/* Top panel divider stripe */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-[#313546] rounded-t-lg"></div>

      <div className="flex flex-col gap-6 mt-1">
        {/* Labeled Header */}
        <div className="flex justify-between items-center bg-[#0d0e14] p-3 rounded-lg border border-gray-800">
          <div className="flex flex-col">
            <span className="text-white text-xs font-bold tracking-wider uppercase">PTZ Controller</span>
            <span className="text-[10px] text-gray-500 font-mono">HARDWARE CONTROLLER • IP CONTROL</span>
          </div>

          {/* LCD Status Screen */}
          <div className="bg-[#0b141a] border border-cyan-900/60 rounded px-4 py-1.5 w-72 text-left lcd-font text-cyan-400 text-xs shadow-inner">
            <div className="flex justify-between border-b border-cyan-900/30 pb-0.5 text-[9px] text-cyan-600/80 select-text">
              <span>CAMERA SELECT</span>
              <span>STATE: {cameraState.wbStatus === 'calibrating' ? 'CALIBRATING' : 'READY'}</span>
            </div>
            <div className="pt-1 flex flex-col font-bold select-text">
              <div className="flex justify-between">
                <span className="lcd-glow-blue">CAM 0{activeCameraIdx}</span>
                <span className="text-gray-500 text-[10px]">192.168.1.15{activeCameraIdx}</span>
                <span className="text-emerald-400 font-bold text-[9px] px-1 border border-emerald-900/50 rounded bg-emerald-950/20">
                  {cameraState.wbStatus === 'done' ? 'LINK OK' : 'LINK OK'}
                </span>
              </div>
              <div className="text-[9px] text-amber-500 mt-0.5 uppercase tracking-wide min-h-4">
                {presetMessage || (presetMode === 'store' ? 'STORE PRESET: SELECT KEY' : presetMode === 'call' ? 'CALL PRESET: SELECT KEY' : 'STANDBY')}
              </div>
            </div>
          </div>
        </div>

        {/* Controller Control Grid */}
        <div className="grid grid-cols-12 gap-5 items-stretch">
          {/* LEFT SECTION: Knobs, Focus, WB (6 columns) */}
          <div className="col-span-12 md:col-span-6 bg-[#161720] p-4 rounded-lg border border-gray-800/80 flex flex-col gap-4">
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block border-b border-gray-850 pb-1">
              CAMERA SETTINGS & DIALS
            </span>

            {/* Dials Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Pan/Tilt Speed Knob */}
              <div className="flex flex-col items-center bg-[#1d1f2b] p-2.5 rounded border border-gray-800">
                <span className="text-[10px] font-bold text-gray-400 mb-1.5 font-mono">P/T SPEED</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={joystickSpeed}
                  onChange={(e) => onKnobChange('speed', parseInt(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <span className="text-[9px] text-cyan-400 font-mono mt-1">Lvl {joystickSpeed}</span>
              </div>

              {/* Zoom Speed Knob */}
              <div className="flex flex-col items-center bg-[#1d1f2b] p-2.5 rounded border border-gray-800">
                <span className="text-[10px] font-bold text-gray-400 mb-1.5 font-mono">ZOOM SPEED</span>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={zoomSpeedVal}
                  onChange={(e) => onKnobChange('zoomSpeed', parseInt(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <span className="text-[9px] text-cyan-400 font-mono mt-1">Lvl {zoomSpeedVal}</span>
              </div>

              {/* Iris Knob */}
              <div className="flex flex-col items-center bg-[#1d1f2b] p-2.5 rounded border border-gray-800">
                <span className="text-[10px] font-bold text-gray-400 mb-1.5 font-mono">IRIS (EXPOSURE)</span>
                <input
                  type="range"
                  min="20"
                  max="200"
                  value={Math.round(cameraState.exposure * 100)}
                  onChange={(e) => onKnobChange('exposure', parseInt(e.target.value) / 100)}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <span className="text-[9px] text-cyan-400 font-mono mt-1">F{Number(cameraState.exposure * 2.8).toFixed(1)}</span>
              </div>

              {/* Focus Knob */}
              <div className="flex flex-col items-center bg-[#1d1f2b] p-2.5 rounded border border-gray-800">
                <span className="text-[10px] font-bold text-gray-400 mb-1.5 font-mono">FOCUS ADJUST</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  disabled={cameraState.focusMode === 'auto'}
                  value={cameraState.focus}
                  onChange={(e) => onKnobChange('focus', parseInt(e.target.value))}
                  className={`w-full cursor-pointer accent-cyan-500 ${cameraState.focusMode === 'auto' ? 'opacity-30 cursor-not-allowed' : ''}`}
                />
                <span className="text-[9px] text-cyan-400 font-mono mt-1">
                  {cameraState.focusMode === 'auto' ? 'LOCKED (AUTO)' : `${cameraState.focus}%`}
                </span>
              </div>
            </div>

            {/* Quick Action Hardware Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={() => {
                  playClick();
                  onToggleFocusMode();
                }}
                className={`py-2 px-1.5 text-center font-bold text-[10px] rounded border transition-all duration-100 cursor-pointer ${
                  cameraState.focusMode === 'auto'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400 font-semibold'
                    : 'bg-[#1d1f2b] border-gray-800 text-gray-400 hover:bg-[#252839]'
                }`}
              >
                FOCUS: {cameraState.focusMode.toUpperCase()}
              </button>
              
              <button
                onClick={onOnePushWb}
                disabled={cameraState.wbStatus === 'calibrating'}
                className={`py-2 px-1.5 text-center font-bold text-[10px] rounded border transition-all duration-100 flex items-center justify-center gap-1 cursor-pointer ${
                  cameraState.wbStatus === 'calibrating'
                    ? 'bg-amber-900/30 border-amber-600/50 text-amber-300 led-pulse cursor-not-allowed'
                    : 'bg-[#1d1f2b] border-gray-800 text-gray-400 hover:bg-[#252839]'
                }`}
              >
                <RefreshCw className="w-3 h-3" />
                ONE PUSH WB
              </button>
            </div>
          </div>

          {/* CENTER SECTION: F1-F3, Keypad, Preset toggles (3 columns) */}
          <div className="col-span-12 md:col-span-3 bg-[#161720] p-4 rounded-lg border border-gray-800/80 flex flex-col gap-4">
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block border-b border-gray-850 pb-1">
              CAMERA & PRESETS
            </span>

            {/* Camera Selectors */}
            <div className="grid grid-cols-3 gap-1.5">
              {[1, 2, 3].map((idx) => {
                const isActive = activeCameraIdx === idx;
                return (
                  <button
                    key={`cam-select-${idx}`}
                    onClick={() => handleCameraBtn(idx as 1 | 2 | 3)}
                    className={`py-2 text-center font-mono font-bold text-xs rounded border transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/25 border-cyan-500 text-cyan-400 shadow-md scale-[0.98]'
                        : 'bg-[#1d1f2b] border-gray-800 text-gray-400 hover:bg-[#252839]'
                    }`}
                  >
                    F{idx}
                  </button>
                );
              })}
            </div>

            {/* Preset Toggle Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={handlePresetModeClick}
                className={`py-1.5 px-1 rounded border text-[10px] font-bold flex items-center justify-center gap-1 transition-all duration-100 cursor-pointer ${
                  presetMode === 'store'
                    ? 'bg-amber-600 border-amber-500 text-black shadow-md'
                    : 'bg-[#1d1f2b] border-gray-800 text-amber-500 hover:bg-[#252839]'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                PRESET
              </button>
              
              <button
                onClick={handleCallModeClick}
                className={`py-1.5 px-1 rounded border text-[10px] font-bold flex items-center justify-center gap-1 transition-all duration-100 cursor-pointer ${
                  presetMode === 'call'
                    ? 'bg-cyan-600 border-cyan-500 text-black shadow-md'
                    : 'bg-[#1d1f2b] border-gray-800 text-cyan-500 hover:bg-[#252839]'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                CALL
              </button>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-1.5 mt-1 flex-grow">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={`keypad-${num}`}
                  onClick={() => handleNumKey(num)}
                  className="py-1.5 text-center font-mono font-bold text-xs rounded border border-gray-800 bg-[#1d1f2b] text-gray-300 hover:bg-[#252839] cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <div className="col-span-3 grid grid-cols-3 gap-1.5">
                <button
                  disabled
                  className="py-1.5 text-center text-gray-600 opacity-20 font-bold text-xs rounded border border-gray-850 bg-[#14151e] cursor-not-allowed"
                >
                  *
                </button>
                <button
                  onClick={() => handleNumKey(0)}
                  className="py-1.5 text-center font-mono font-bold text-xs rounded border border-gray-800 bg-[#1d1f2b] text-gray-300 hover:bg-[#252839] cursor-pointer"
                >
                  0
                </button>
                <button
                  disabled
                  className="py-1.5 text-center text-gray-600 opacity-20 font-bold text-xs rounded border border-gray-850 bg-[#14151e] cursor-not-allowed"
                >
                  #
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT SECTION: Joystick & Zoom (3 columns) */}
          <div className="col-span-12 md:col-span-3 bg-[#161720] p-4 rounded-lg border border-gray-800/80 flex flex-col items-center justify-between gap-4">
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block border-b border-gray-850 pb-1 w-full text-center">
              PAN TILT & ZOOM
            </span>

            {/* Joystick */}
            <div className="flex flex-col items-center gap-1 w-full">
              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-mono">
                Analog Joystick
              </span>
              <div
                ref={baseRef}
                className="w-32 h-32 rounded-full joystick-base relative flex items-center justify-center cursor-crosshair mt-1"
                onMouseDown={handleJoystickMouseDown}
              >
                {/* Visual deflection bounds grid */}
                <div className="absolute w-28 h-[1px] border-t border-dashed border-gray-900"></div>
                <div className="absolute h-28 w-[1px] border-l border-dashed border-gray-900"></div>

                {/* Joystick Knob */}
                <div
                  className="w-14 h-14 rounded-full joystick-handle absolute transition-shadow duration-100 flex items-center justify-center border border-gray-700/50"
                  style={{
                    transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
                    cursor: isDragging ? 'grabbing' : 'grab',
                  }}
                >
                  {/* Grip ridge */}
                  <div className="w-8 h-8 rounded-full border-2 border-gray-800/30 bg-gray-900/10 shadow-inner"></div>
                </div>
              </div>
            </div>

            {/* Tilt Invert Toggle */}
            <button
              onClick={() => { playClick(); onToggleInvertTilt(); }}
              className={`w-full py-1.5 rounded border text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-150 ${
                invertTilt
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-400 ring-1 ring-amber-500/40'
                  : 'bg-[#1d1f2b] border-gray-700 text-gray-500 hover:bg-[#252839] hover:text-gray-300'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              TILT {invertTilt ? 'INVERTED' : 'NORMAL'}
            </button>

            {/* Zoom rocker */}
            <div className="flex flex-col items-center gap-1 w-full">
              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-mono">
                Zoom Control
              </span>
              <div className="flex h-11 w-28 rounded-lg overflow-hidden border border-gray-800 bg-[#1d1f2b]">
                <button
                  onMouseDown={() => handleZoomStart(-1)}
                  onMouseUp={handleZoomStop}
                  onMouseLeave={handleZoomStop}
                  className="flex-1 hover:bg-[#252839] active:bg-[#1a1b24] text-gray-300 border-r border-gray-800 flex flex-col items-center justify-center cursor-pointer transition-colors"
                >
                  <ChevronDown className="w-4 h-4 text-cyan-400" />
                  <span className="text-[9px] font-mono font-bold">W</span>
                </button>
                <button
                  onMouseDown={() => handleZoomStart(1)}
                  onMouseUp={handleZoomStop}
                  onMouseLeave={handleZoomStop}
                  className="flex-1 hover:bg-[#252839] active:bg-[#1a1b24] text-gray-300 flex flex-col items-center justify-center cursor-pointer transition-colors"
                >
                  <ChevronUp className="w-4 h-4 text-cyan-400" />
                  <span className="text-[9px] font-mono font-bold">T</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default BolinController;
