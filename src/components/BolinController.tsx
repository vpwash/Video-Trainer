import React, { useState, useEffect, useRef } from 'react';
import { useAudio } from '../hooks/useAudio';
import type { CameraState } from '../utils/canvasRenderer';
import CameraViewport from './CameraViewport';

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
  // Parent viewport context props
  activeScenario?: 'stage' | 'watchtower' | 'demo';
  bgImageLoaded?: boolean;
  showWbPanel?: boolean;
}

// Realistic Interactive Rotary Knob Component tailored to Canon Style
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

  // Map value to angle (-135deg to +135deg, total 270deg sweep)
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

      // Calculate angle in degrees relative to vertical (0 deg = UP)
      let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (deg > 180) deg -= 360;

      // Clamp angle between -135 and +135
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
      
      {/* Knob Container with Sub-labels Left/Right */}
      <div className="flex items-center gap-1.5 justify-center relative">
        {subLabelLeft && (
          <span className="text-[8px] font-bold font-mono text-gray-500 uppercase">{subLabelLeft}</span>
        )}
        
        <div
          ref={knobRef}
          onMouseDown={(e) => {
            if (disabled) return;
            e.preventDefault();
            setIsDragging(true);
          }}
          className={`w-12 h-12 rounded-full bg-radial from-[#3a3b40] to-[#121316] border-2 border-[#1c1d22] shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),0_4px_8px_rgba(0,0,0,0.6)] relative flex items-center justify-center cursor-grab active:cursor-grabbing ${
            disabled ? 'pointer-events-none' : 'hover:border-cyan-500/50'
          }`}
        >
          {/* Ridged border styling */}
          <div className="absolute inset-0 rounded-full border border-gray-650/15 pointer-events-none" />
          
          {/* Indicator marker line */}
          <div
            className="absolute top-1 w-0.5 h-3 bg-white rounded-full origin-bottom transition-transform duration-75"
            style={{ transform: `rotate(${angle}deg)` }}
          />
          {/* Inner cap */}
          <div className="w-6 h-6 rounded-full bg-[#18191c] border border-[#2d2e33] shadow-inner" />
        </div>

        {subLabelRight && (
          <span className="text-[8px] font-bold font-mono text-gray-500 uppercase">{subLabelRight}</span>
        )}
      </div>

      <span className="text-[9px] text-cyan-400 font-mono mt-1 font-semibold bg-black/40 px-1.5 py-0.2 rounded border border-gray-900/60 shadow-inner">
        {displayValue}
      </span>
    </div>
  );
};

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
  activeScenario = 'stage',
  bgImageLoaded = false,
  showWbPanel = false,
}) => {
  const { playClick, startMotorHum, stopMotorHum } = useAudio();

  // Joystick dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);

  // Handle joystick dragging physics
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

      const relX = dx / maxRadius;
      const relY = -dy / maxRadius;
      onJoystickMove(relX, relY);

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

  // Zoom Tele/Wide click and hold handlers
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

  // Cyling Preset Modes (none -> store -> call -> none)
  const handlePresetModeCycle = () => {
    playClick();
    if (presetMode === 'none') {
      onPresetModeToggle(); // Activate Store Mode
    } else if (presetMode === 'store') {
      onPresetModeToggle(); // Deactivate Store
      onCallModeToggle();   // Activate Call Mode
    } else {
      onCallModeToggle();   // Deactivate Call Mode
    }
  };

  const handleNumKey = (num: number) => {
    playClick();
    onKeypadPress(num);
  };

  return (
    <div className="bg-[#232428] border-4 border-[#3c3e44] rounded-3xl p-4 shadow-2xl w-full text-gray-300 font-sans select-none relative shadow-black/80">
      {/* Brand Banner */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#32343a] z-10 relative">
        <div className="flex items-center gap-4">
          <span className="text-sm font-black text-white tracking-widest uppercase font-mono">
            IP CONTROLLER
          </span>
          <div className="flex flex-col gap-0.5 text-[8px] font-bold text-gray-400 font-mono pl-3 border-l border-gray-700">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
              <span>POWER</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-950"></span>
              <span className="text-gray-600">ALARM</span>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono">
            REMOTE CAMERA CONTROLLER <span className="text-white">RC-IP300</span>
          </span>
        </div>
      </div>

      {/* Main Console Layout */}
      <div className="grid grid-cols-12 gap-6 items-stretch">
        
        {/* ================= LEFT SECTION: White Balance, Iris, Zoom Rocker ================= */}
        <div className="col-span-12 md:col-span-3 flex flex-col items-center justify-between bg-[#191a1e] p-4 rounded-2xl border border-[#2d2e33]/80 gap-6">
          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block border-b border-gray-800 pb-1 w-full text-center">
            Camera Exposure
          </span>

          {/* White Balance Button */}
          <div className="flex flex-col items-center gap-1.5 w-full">
            <button
              onClick={onOnePushWb}
              disabled={cameraState.wbStatus === 'calibrating'}
              className={`w-14 h-8 rounded-full border-2 transition-all duration-100 flex items-center justify-center font-bold text-[8px] uppercase tracking-wider cursor-pointer shadow-md ${
                cameraState.wbStatus === 'calibrating'
                  ? 'bg-amber-500 text-black border-amber-400 led-pulse scale-[0.97]'
                  : 'bg-[#d8dadf] text-[#1c1d22] border-[#a6a8af] hover:bg-white active:scale-95'
              }`}
            >
              WB
            </button>
            <span className="text-[8px] font-bold text-gray-500 text-center font-mono uppercase">
              WHITE BALANCE
            </span>
          </div>

          {/* Iris Control Knob */}
          <CanonKnob
            label="Iris Dial"
            min={20}
            max={200}
            value={Math.round(cameraState.exposure * 100)}
            displayValue={`F${Number(cameraState.exposure * 2.8).toFixed(1)}`}
            subLabelLeft="Close"
            subLabelRight="Open"
            onChange={(val) => onKnobChange('exposure', val / 100)}
          />

          {/* Zoom Rocker Lever */}
          <div className="flex flex-col items-center gap-2 w-full mt-2">
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-mono">Zoom Lever</span>
            
            {/* Rocker Frame (Rotated to match picture) */}
            <div className="relative w-16 h-28 bg-[#121316] rounded-2xl border-2 border-[#2d2e33] flex flex-col justify-between items-center p-2 shadow-inner overflow-hidden">
              <span className="text-[9px] font-bold text-gray-400 font-mono">T</span>
              
              {/* Rocker Handle */}
              <div className="w-10 h-16 bg-[#2d2e33] border border-gray-700 rounded-lg flex flex-col justify-between overflow-hidden shadow-lg select-none">
                <button
                  onMouseDown={() => handleZoomStart(1)}
                  onMouseUp={handleZoomStop}
                  onMouseLeave={handleZoomStop}
                  className="w-full h-1/2 bg-gradient-to-b from-[#3a3b40] to-[#202125] active:from-[#151619] border-b border-black flex items-center justify-center cursor-pointer transition-all hover:text-white"
                >
                  ▲
                </button>
                <button
                  onMouseDown={() => handleZoomStart(-1)}
                  onMouseUp={handleZoomStop}
                  onMouseLeave={handleZoomStop}
                  className="w-full h-1/2 bg-gradient-to-b from-[#202125] to-[#3a3b40] active:from-[#151619] flex items-center justify-center cursor-pointer transition-all hover:text-white"
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

        {/* ================= MIDDLE SECTION: LCD Viewport, Keypad, Focus, Preset ================= */}
        <div className="col-span-12 md:col-span-6 bg-[#191a1e] p-4 rounded-2xl border border-[#2d2e33]/80 flex flex-col items-center justify-between gap-4">
          
          {/* LCD Screen Viewport */}
          <div className="w-full bg-[#121316] border-4 border-[#2d2e33] rounded-xl overflow-hidden relative shadow-inner aspect-video">
            <CameraViewport
              cameraIdx={activeCameraIdx}
              cameraState={cameraState}
              showWbPanel={showWbPanel}
              isLive={true}
              activeScenario={activeScenario}
              bgImageLoaded={bgImageLoaded}
            />
            {/* LCD Info Overlay banner */}
            <div className="absolute top-2 left-2 right-2 bg-black/60 backdrop-blur-xs border border-gray-800 rounded px-2 py-0.5 flex justify-between items-center text-[9px] font-mono text-cyan-400 z-20">
              <span className="font-bold">CAM 0{activeCameraIdx}</span>
              <span className="text-amber-500 font-bold">
                {presetMessage || (presetMode === 'store' ? 'STORE PRESET' : presetMode === 'call' ? 'CALL PRESET' : 'LIVE')}
              </span>
              <span className="text-emerald-400">192.168.1.15{activeCameraIdx}</span>
            </div>
          </div>

          {/* Keypad Grid (5x2 layout) */}
          <div className="w-full flex flex-col gap-2">
            <div className="grid grid-cols-4 text-center font-mono text-[8px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-1">
              <span>F1</span>
              <span>F2</span>
              <span>F3</span>
              <span>F4</span>
            </div>
            
            {/* The 5x2 numeric grid */}
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                // Button 10 maps to preset index 0
                const presetVal = num === 10 ? 0 : num;
                return (
                  <button
                    key={`num-${num}`}
                    onClick={() => handleNumKey(presetVal)}
                    className="h-10 bg-[#d8dadf] text-[#1c1d22] font-black font-mono text-xs rounded border-b-4 border-[#a6a8af] hover:bg-white active:bg-gray-300 active:border-b-0 active:translate-y-[4px] transition-all cursor-pointer flex items-center justify-center shadow-md"
                  >
                    {num === 10 ? '10/0' : num}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Under Keypad: Focus Dial, Auto Button, Preset Button */}
          <div className="grid grid-cols-3 items-center gap-4 w-full border-t border-gray-800 pt-3">
            {/* Focus Dial */}
            <div className="flex justify-center">
              <CanonKnob
                label="Focus Dial"
                min={0}
                max={100}
                disabled={cameraState.focusMode === 'auto'}
                value={cameraState.focus}
                displayValue={cameraState.focusMode === 'auto' ? 'AUTO' : `${cameraState.focus}%`}
                subLabelLeft="Near"
                subLabelRight="Far"
                onChange={(val) => onKnobChange('focus', val)}
              />
            </div>

            {/* Focus Auto Toggle Button */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => { playClick(); onToggleFocusMode(); }}
                className={`w-12 h-6 rounded-full border transition-all cursor-pointer font-mono font-bold text-[8px] uppercase ${
                  cameraState.focusMode === 'auto'
                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_6px_#10b981]'
                    : 'bg-[#d8dadf] text-[#1c1d22] border-[#a6a8af] hover:bg-white'
                }`}
              >
                AUTO
              </button>
              <span className="text-[8px] font-bold text-gray-500 font-mono">FOCUS MODE</span>
            </div>

            {/* Mode Select / Preset toggle Button */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={handlePresetModeCycle}
                className={`w-16 h-6 rounded border font-mono font-bold text-[8px] uppercase transition-all cursor-pointer ${
                  presetMode === 'store'
                    ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_6px_#f59e0b]'
                    : presetMode === 'call'
                    ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_6px_#06b6d4]'
                    : 'bg-[#d8dadf] text-[#1c1d22] border-[#a6a8af] hover:bg-white'
                }`}
              >
                {presetMode === 'none' ? 'MODE' : presetMode.toUpperCase()}
              </button>
              <span className="text-[8px] font-bold text-gray-500 font-mono">PRESET MODE</span>
            </div>
          </div>
        </div>

        {/* ================= RIGHT SECTION: Camera Switches, Joystick, Pan/Tilt Speed ================= */}
        <div className="col-span-12 md:col-span-3 flex flex-col items-center justify-between bg-[#191a1e] p-4 rounded-2xl border border-[#2d2e33]/80 gap-6">
          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block border-b border-gray-800 pb-1 w-full text-center">
            Camera Select & Pan/Tilt
          </span>

          {/* D-Pad Area: BACK (TILT INVERT) button */}
          <div className="flex flex-col items-center gap-1.5 w-full">
            <button
              onClick={() => { playClick(); onToggleInvertTilt(); }}
              className={`w-16 h-7 rounded border font-bold text-[9px] uppercase transition-all cursor-pointer ${
                invertTilt
                  ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_6px_#f59e0b]'
                  : 'bg-[#d8dadf] text-[#1c1d22] border-[#a6a8af] hover:bg-white'
              }`}
            >
              INVERT
            </button>
            <span className="text-[8px] font-bold text-gray-500 font-mono uppercase text-center">
              TILT INVERSION
            </span>
          </div>

          {/* Camera Selector Row (replaces USER 1, USER 2, USER 3) */}
          <div className="flex flex-col items-center gap-2 w-full">
            <span className="text-[8px] font-bold text-gray-500 font-mono uppercase text-center">
              Active Camera Select
            </span>
            <div className="flex gap-2">
              {[1, 2, 3].map((idx) => {
                const isActive = activeCameraIdx === idx;
                return (
                  <button
                    key={`cam-btn-${idx}`}
                    onClick={() => handleCameraBtn(idx as 1 | 2 | 3)}
                    className={`w-10 h-10 rounded-full border-2 font-mono font-black text-xs transition-all duration-150 cursor-pointer shadow-md flex items-center justify-center ${
                      isActive
                        ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_#06b6d4]'
                        : 'bg-[#d8dadf] text-[#1c1d22] border-[#a6a8af] hover:bg-white active:scale-95'
                    }`}
                  >
                    CAM {idx}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Analog Joystick */}
          <div className="flex flex-col items-center gap-2 w-full mt-2">
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-mono">Pan/Tilt Steering</span>
            <div
              ref={baseRef}
              className="w-32 h-32 rounded-full joystick-base relative flex items-center justify-center cursor-crosshair mt-1 border-4 border-[#2d2e33]"
              onMouseDown={handleJoystickMouseDown}
            >
              {/* Visual deflection bounds grid */}
              <div className="absolute w-28 h-[1px] border-t border-dashed border-gray-900/60"></div>
              <div className="absolute h-28 w-[1px] border-l border-dashed border-gray-900/60"></div>

              {/* Joystick Grip ring contours */}
              <div className="absolute w-24 h-24 rounded-full border border-gray-950/20 pointer-events-none" />
              <div className="absolute w-18 h-18 rounded-full border border-gray-950/30 pointer-events-none" />

              {/* Joystick Knob */}
              <div
                className="w-14 h-14 rounded-full joystick-handle absolute transition-shadow duration-100 flex items-center justify-center border border-gray-800 shadow-[0_8px_16px_rgba(0,0,0,0.8)]"
                style={{
                  transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
                  cursor: isDragging ? 'grabbing' : 'grab',
                }}
              >
                {/* Center cap grip */}
                <div className="w-8 h-8 rounded-full border-2 border-gray-800/80 bg-gradient-to-tr from-gray-900 to-gray-700 shadow-inner flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-gray-950 shadow-inner" />
                </div>
              </div>
            </div>
          </div>

          {/* Pan/Tilt Speed Dial */}
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
