import React, { useState, useEffect, useRef } from 'react';
import { useAudio } from '../hooks/useAudio';
import type { CameraState } from '../utils/canvasRenderer';

interface BolinControllerProps {
  activeCameraIdx: 1 | 2 | 3;
  cameraState: CameraState;
  onSelectCamera: (idx: 1 | 2 | 3) => void;
  onJoystickMove: (dx: number, dy: number) => void; // -1 to 1
  onJoystickRelease: () => void;
  onZoomPress: (dir: number) => void; // -1, 0, 1
  onKnobChange: (param: 'speed' | 'zoomSpeed', val: number) => void;
  onKeypadPress: (num: number) => void;
  onPresetModeToggle: () => void;
  onCallModeToggle: () => void;
  presetMode: 'none' | 'store' | 'call';
  joystickSpeed: number; // Current PT speed knob setting
  zoomSpeedVal: number;  // Current zoom speed knob setting
  presetMessage: string;
  invertTilt: boolean;
  onToggleInvertTilt: () => void;
  activeScenario?: 'stage' | 'watchtower' | 'demo';
}

// Realistic Interactive Rotary Knob Component
interface CanonKnobProps {
  label: string;
  min: number;
  max: number;
  value: number;
  displayValue: string;
  disabled?: boolean;
  subLabelLeft?: string;
  subLabelRight?: string;
  onChange: (val: number) => void;
}

const CanonKnob: React.FC<CanonKnobProps> = ({
  label,
  min,
  max,
  value,
  displayValue,
  disabled = false,
  subLabelLeft,
  subLabelRight,
  onChange,
}) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angle = -135 + pct * 270;

  useEffect(() => {
    if (!isDragging || disabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!knobRef.current) return;
      const rect = knobRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;

      let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (deg > 180) deg -= 360;

      const clampedDeg = Math.max(-135, Math.min(135, deg));
      const normalizedPct = (clampedDeg - (-135)) / 270;
      const newVal = Math.round(min + normalizedPct * (max - min));
      onChange(newVal);
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, min, max, disabled, onChange]);

  return (
    <div className={`flex flex-col items-center select-none ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}>
      <span className="text-[9px] font-bold text-gray-400 mb-1 font-mono uppercase tracking-wider">{label}</span>
      
      <div className="flex items-center gap-1.5 justify-center relative">
        {subLabelLeft && (
          <span className="text-[8px] font-bold font-mono text-gray-500 uppercase">{subLabelLeft}</span>
        )}

        <div
          ref={knobRef}
          onMouseDown={() => !disabled && setIsDragging(true)}
          className="w-11 h-11 rounded-full bg-gradient-to-b from-[#3a3b40] to-[#1c1d22] border-2 border-[#52545d] shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing relative"
        >
          <div
            className="w-full h-full rounded-full transition-transform duration-75 relative"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <div className="w-1.5 h-4 bg-amber-400 rounded-full absolute top-1 left-1/2 -translate-x-1/2 shadow-[0_0_4px_#f59e0b]" />
          </div>

          <div className="w-6 h-6 rounded-full bg-[#121316] border border-gray-700 absolute inset-0 m-auto flex items-center justify-center shadow-inner">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-800" />
          </div>
        </div>

        {subLabelRight && (
          <span className="text-[8px] font-bold font-mono text-gray-500 uppercase">{subLabelRight}</span>
        )}
      </div>

      <span className="text-[9px] font-bold text-cyan-400 font-mono mt-1 bg-black/60 px-1.5 py-0.5 rounded border border-gray-800">
        {displayValue}
      </span>
    </div>
  );
};

export const BolinController: React.FC<BolinControllerProps> = ({
  activeCameraIdx,
  onSelectCamera,
  onJoystickMove,
  onJoystickRelease,
  onZoomPress,
  onKnobChange,
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

  const [isDragging, setIsDragging] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!baseRef.current) return;
      const rect = baseRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = e.clientX - centerX;
      let dy = e.clientY - centerY;
      const maxDistance = 45;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > maxDistance) {
        dx = (dx / distance) * maxDistance;
        dy = (dy / distance) * maxDistance;
      }

      setJoystickPos({ x: dx, y: dy });
      const normX = dx / maxDistance;
      const normY = dy / maxDistance;
      onJoystickMove(normX, normY);
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
  }, [isDragging, onJoystickMove, onJoystickRelease, stopMotorHum]);

  const handleJoystickMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startMotorHum(0.5);
  };

  const handleZoomStart = (dir: number) => {
    playClick();
    onZoomPress(dir);
    startMotorHum(0.5);
  };

  const handleZoomStop = () => {
    onZoomPress(0);
    stopMotorHum();
  };

  const handleCameraBtn = (idx: 1 | 2 | 3) => {
    playClick();
    onSelectCamera(idx);
  };

  const handleNumKey = (num: number) => {
    playClick();
    onKeypadPress(num);
  };

  return (
    <div className="bg-[#121318] border-2 border-[#282a36] rounded-2xl p-4 shadow-2xl w-full flex flex-col gap-3 select-none">
      {/* Console Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-[#191a20] px-4 py-2 rounded-xl border border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4] animate-pulse" />
          <span className="text-xs font-bold text-gray-200 tracking-wider font-mono">
            HARDWARE PTZ CONTROLLER
          </span>
        </div>

        {presetMessage ? (
          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-700/60 px-3 py-0.5 rounded animate-pulse">
            {presetMessage}
          </span>
        ) : (
          <span className="text-xs font-mono font-semibold text-gray-400">
            SYSTEM READY
          </span>
        )}

        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">
          RC-IP300 CONDENSED
        </span>
      </div>

      {/* Condensed Main Controls Grid */}
      <div className="grid grid-cols-12 gap-4 items-center">
        
        {/* LEFT SECTION: Zoom Rocker & Zoom Speed */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-[#181920] p-3 rounded-xl border border-[#2d2e38] flex items-center justify-around gap-2 h-full">
          {/* Zoom Rocker */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] text-gray-400 font-bold uppercase font-mono">Zoom Lever</span>
            <div className="relative w-12 h-24 bg-[#101115] rounded-xl border-2 border-[#2d2e33] flex flex-col justify-between items-center p-1.5 shadow-inner">
              <span className="text-[9px] font-bold text-gray-400 font-mono">T</span>
              <div className="w-8 h-12 bg-[#2d2e33] border border-gray-700 rounded flex flex-col justify-between overflow-hidden shadow select-none">
                <button
                  onMouseDown={() => handleZoomStart(1)}
                  onMouseUp={handleZoomStop}
                  onMouseLeave={handleZoomStop}
                  className="w-full h-1/2 bg-gradient-to-b from-[#3a3b40] to-[#202125] active:from-[#151619] border-b border-black flex items-center justify-center cursor-pointer text-xs text-gray-300 hover:text-white"
                >
                  ▲
                </button>
                <button
                  onMouseDown={() => handleZoomStart(-1)}
                  onMouseUp={handleZoomStop}
                  onMouseLeave={handleZoomStop}
                  className="w-full h-1/2 bg-gradient-to-b from-[#202125] to-[#3a3b40] active:from-[#151619] flex items-center justify-center cursor-pointer text-xs text-gray-300 hover:text-white"
                >
                  ▼
                </button>
              </div>
              <span className="text-[9px] font-bold text-gray-400 font-mono">W</span>
            </div>
          </div>

          {/* Zoom Speed Dial */}
          <CanonKnob
            label="Zoom Speed"
            min={1}
            max={8}
            value={zoomSpeedVal}
            displayValue={`Lvl ${zoomSpeedVal}`}
            subLabelLeft="Low"
            subLabelRight="High"
            onChange={(val) => onKnobChange('zoomSpeed', val)}
          />
        </div>

        {/* CENTER SECTION: Keypad & Preset Mode */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-5 bg-[#181920] p-3 rounded-xl border border-[#2d2e38] flex flex-col justify-between gap-3 h-full">
          <div className="flex justify-between items-center border-b border-gray-800 pb-1">
            <span className="text-[9px] font-bold text-gray-400 font-mono uppercase tracking-wider">
              Preset & Keypad Controls
            </span>

            {/* Separate Store and Call Preset Buttons */}
            <div className="flex gap-1.5">
              <button
                onClick={() => { playClick(); onPresetModeToggle(); }}
                className={`px-2.5 py-0.5 rounded border font-mono font-bold text-[9px] uppercase transition-all cursor-pointer ${
                  presetMode === 'store'
                    ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_8px_#f59e0b] scale-[1.03]'
                    : 'bg-[#252730] text-amber-400 border-amber-700/60 hover:bg-amber-950/40'
                }`}
              >
                {presetMode === 'store' ? 'STORE ACTIVE' : 'STORE PRESET'}
              </button>
              <button
                onClick={() => { playClick(); onCallModeToggle(); }}
                className={`px-2.5 py-0.5 rounded border font-mono font-bold text-[9px] uppercase transition-all cursor-pointer ${
                  presetMode === 'call'
                    ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_8px_#06b6d4] scale-[1.03]'
                    : 'bg-[#252730] text-cyan-400 border-cyan-700/60 hover:bg-cyan-950/40'
                }`}
              >
                {presetMode === 'call' ? 'CALL ACTIVE' : 'CALL PRESET'}
              </button>
            </div>
          </div>

          {/* Keypad Grid (5x2 layout) */}
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
              const presetVal = num === 10 ? 0 : num;
              return (
                <button
                  key={`num-${num}`}
                  onClick={() => handleNumKey(presetVal)}
                  className="h-9 bg-[#d8dadf] text-[#1c1d22] font-black font-mono text-xs rounded border-b-2 border-[#a6a8af] hover:bg-white active:bg-gray-300 active:border-b-0 active:translate-y-[2px] transition-all cursor-pointer flex items-center justify-center shadow"
                >
                  {num === 10 ? '10/0' : num}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT SECTION: Camera Selector, Invert, Joystick & Speed */}
        <div className="col-span-12 lg:col-span-4 bg-[#181920] p-3 rounded-xl border border-[#2d2e38] flex flex-wrap sm:flex-nowrap items-center justify-around gap-3 h-full">
          {/* Left Sub-stack: Active Camera & Tilt Invert */}
          <div className="flex flex-col gap-2.5 items-center">
            <span className="text-[8px] font-bold text-gray-400 font-mono uppercase">Camera Select</span>
            <div className="flex gap-1.5">
              {[1, 2, 3].map((idx) => {
                const isActive = activeCameraIdx === idx;
                return (
                  <button
                    key={`cam-btn-${idx}`}
                    onClick={() => handleCameraBtn(idx as 1 | 2 | 3)}
                    className={`w-8 h-8 rounded-full border-2 font-mono font-black text-[10px] transition-all cursor-pointer shadow flex items-center justify-center ${
                      isActive
                        ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_8px_#06b6d4]'
                        : 'bg-[#d8dadf] text-[#1c1d22] border-[#a6a8af] hover:bg-white'
                    }`}
                  >
                    C{idx}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => { playClick(); onToggleInvertTilt(); }}
              className={`w-20 h-6 rounded border font-bold text-[8px] uppercase transition-all cursor-pointer ${
                invertTilt
                  ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_6px_#f59e0b]'
                  : 'bg-[#252730] text-gray-300 border-gray-700 hover:bg-gray-700'
              }`}
            >
              {invertTilt ? 'TILT: INVERT' : 'TILT: NORMAL'}
            </button>
          </div>

          {/* Joystick Steering */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[8px] font-bold text-gray-400 font-mono uppercase">Steering</span>
            <div
              ref={baseRef}
              className="w-24 h-24 rounded-full joystick-base relative flex items-center justify-center cursor-crosshair border-2 border-[#2d2e33]"
              onMouseDown={handleJoystickMouseDown}
            >
              <div className="w-10 h-10 rounded-full joystick-handle absolute transition-shadow duration-100 flex items-center justify-center border border-gray-800 shadow-md"
                style={{
                  transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
                  cursor: isDragging ? 'grabbing' : 'grab',
                }}
              >
                <div className="w-5 h-5 rounded-full border border-gray-800 bg-gradient-to-tr from-gray-900 to-gray-700 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-gray-950" />
                </div>
              </div>
            </div>
          </div>

          {/* Steer Speed Dial */}
          <CanonKnob
            label="Steer Speed"
            min={1}
            max={10}
            value={joystickSpeed}
            displayValue={`Lvl ${joystickSpeed}`}
            subLabelLeft="Low"
            subLabelRight="High"
            onChange={(val) => onKnobChange('speed', val)}
          />
        </div>

      </div>
    </div>
  );
};

export default BolinController;
