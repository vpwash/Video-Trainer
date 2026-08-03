import React, { useState, useEffect, useRef } from 'react';
import CameraViewport from './CameraViewport';
import BolinController from './BolinController';
import type { CameraState } from '../utils/canvasRenderer';
import { useAudio } from '../hooks/useAudio';
import { HelpCircle, RefreshCw, Bookmark, ArrowRight, Home, Settings, Image as ImageIcon, Trash2, Crosshair } from 'lucide-react';
import { type KeyBindings, formatKeyName } from '../utils/keyBindings';

interface PtzTrainerProps {
  onBackToHome: () => void;
  keyBindings: KeyBindings;
  onOpenSettings: () => void;
}

export const PtzTrainer: React.FC<PtzTrainerProps> = ({ onBackToHome, keyBindings, onOpenSettings }) => {
  const { playSuccess, playBeep, playClick } = useAudio();

  // Active Camera selection
  const [activeCameraIdx, setActiveCameraIdx] = useState<1 | 2 | 3>(() => {
    const saved = localStorage.getItem('av-trainer-ptz-active-camera');
    if (saved) {
      const parsed = parseInt(saved);
      if (parsed === 1 || parsed === 2 || parsed === 3) return parsed as 1 | 2 | 3;
    }
    return 2;
  });

  // Active Scenario state
  const [activeScenario, setActiveScenario] = useState<'stage' | 'watchtower' | 'demo'>('stage');
  const [showGuides, setShowGuides] = useState<boolean>(() => {
    const saved = localStorage.getItem('av-trainer-ptz-show-guides');
    return saved ? saved === 'true' : false;
  });

  // States for all three cameras
  const [cameraStates, setCameraStates] = useState<{ [key: number]: CameraState }>(() => {
    const saved = localStorage.getItem('av-trainer-ptz-camera-states');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved PTZ camera states:", e);
      }
    }
    return {
      1: {
        pan: -20,
        tilt: -5,
        zoom: 1.0,
        exposure: 1.0,
        focus: 50,
        focusMode: 'auto',
      },
      2: {
        pan: 0,
        tilt: 0,
        zoom: 1.0,
        exposure: 1.0,
        focus: 50,
        focusMode: 'auto',
      },
      3: {
        pan: 20,
        tilt: -5,
        zoom: 1.0,
        exposure: 1.0,
        focus: 50,
        focusMode: 'auto',
      },
    };
  });

  // File input ref for user-uploaded custom background images
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCameraStates((prev) => ({
          ...prev,
          [activeCameraIdx]: {
            ...prev[activeCameraIdx],
            customBgImage: dataUrl,
          },
        }));
        playSuccess();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleClearCustomImage = () => {
    setCameraStates((prev) => ({
      ...prev,
      [activeCameraIdx]: {
        ...prev[activeCameraIdx],
        customBgImage: undefined,
      },
    }));
    playClick();
  };

  useEffect(() => {
    localStorage.setItem('av-trainer-ptz-show-guides', showGuides.toString());
  }, [showGuides]);

  // Controls settings
  const [joystickSpeed, setJoystickSpeed] = useState<number>(() => {
    const saved = localStorage.getItem('av-trainer-ptz-joystick-speed');
    return saved ? parseInt(saved) : 4;
  });
  const [zoomSpeedVal, setZoomSpeedVal] = useState<number>(() => {
    const saved = localStorage.getItem('av-trainer-ptz-zoom-speed');
    return saved ? parseInt(saved) : 3;
  });
  const [invertTilt, setInvertTilt] = useState<boolean>(() => {
    const saved = localStorage.getItem('av-trainer-ptz-invert-tilt');
    return saved ? saved === 'true' : false;
  });
  const [presetMessage, setPresetMessage] = useState<string>('');

  // Joystick active movement vector
  const joystickVector = useRef({ dx: 0, dy: 0 });
  const zoomDirection = useRef<number>(0); // -1: W, 0: stop, 1: T

  // Presets bank: { [camIdx]: { [presetNum]: CameraState } }
  const [presets, setPresets] = useState<{ [key: number]: { [key: number]: CameraState } }>(() => {
    const saved = localStorage.getItem('av-trainer-ptz-presets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved PTZ presets:", e);
      }
    }
    return {
      1: {},
      2: {},
      3: {},
    };
  });

  const [presetMode, setPresetMode] = useState<'none' | 'store' | 'call'>('none');

  // Save state changes to localStorage
  useEffect(() => {
    localStorage.setItem('av-trainer-ptz-active-camera', activeCameraIdx.toString());
  }, [activeCameraIdx]);

  useEffect(() => {
    localStorage.setItem('av-trainer-ptz-camera-states', JSON.stringify(cameraStates));
  }, [cameraStates]);

  useEffect(() => {
    localStorage.setItem('av-trainer-ptz-presets', JSON.stringify(presets));
  }, [presets]);

  useEffect(() => {
    localStorage.setItem('av-trainer-ptz-joystick-speed', joystickSpeed.toString());
  }, [joystickSpeed]);

  useEffect(() => {
    localStorage.setItem('av-trainer-ptz-zoom-speed', zoomSpeedVal.toString());
  }, [zoomSpeedVal]);

  useEffect(() => {
    localStorage.setItem('av-trainer-ptz-invert-tilt', invertTilt.toString());
  }, [invertTilt]);

  // Main game loop for continuous PTZ movement and zoom animation
  useEffect(() => {
    let animId: number;

    const updateLoop = () => {
      const { dx, dy } = joystickVector.current;
      const zoomDir = zoomDirection.current;

      if (dx !== 0 || dy !== 0 || zoomDir !== 0) {
        setCameraStates((prev) => {
          const current = prev[activeCameraIdx];
          const speedFactor = (joystickSpeed / 4) * 0.4;
          const zoomFactor = (zoomSpeedVal / 3) * 0.03;

          const tiltSign = invertTilt ? -1 : 1;
          const maxPan = 50 * current.zoom;
          const maxTilt = 30 * current.zoom;
          const newPan = Math.max(-maxPan, Math.min(maxPan, current.pan + dx * speedFactor));
          const newTilt = Math.max(-maxTilt, Math.min(maxTilt, current.tilt + dy * speedFactor * tiltSign));
          const newZoom = Math.max(1.0, Math.min(8.0, current.zoom + zoomDir * zoomFactor));

          return {
            ...prev,
            [activeCameraIdx]: {
              ...current,
              pan: newPan,
              tilt: newTilt,
              zoom: newZoom,
            },
          };
        });
      }

      animId = requestAnimationFrame(updateLoop);
    };

    animId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animId);
  }, [activeCameraIdx, joystickSpeed, zoomSpeedVal, invertTilt]);

  // Handlers for Bolin controller
  const handleJoystickMove = (dx: number, dy: number) => {
    joystickVector.current = { dx, dy };
  };

  const handleJoystickRelease = () => {
    joystickVector.current = { dx: 0, dy: 0 };
  };

  const handleZoomPress = (dir: number) => {
    zoomDirection.current = dir;
  };

  const handleKnobChange = (param: 'speed' | 'zoomSpeed', val: number) => {
    playClick();
    if (param === 'speed') {
      setJoystickSpeed(val);
    } else if (param === 'zoomSpeed') {
      setZoomSpeedVal(val);
    }
  };

  const handleKeypadPress = (num: number) => {
    const camState = cameraStates[activeCameraIdx];

    if (presetMode === 'store') {
      setPresets((prev) => ({
        ...prev,
        [activeCameraIdx]: {
          ...prev[activeCameraIdx],
          [num]: { ...camState },
        },
      }));
      setPresetMessage(`STORED PRESET ${num}`);
      setPresetMode('none');
      setTimeout(() => setPresetMessage(''), 2000);
    } else if (presetMode === 'call') {
      const targetState = presets[activeCameraIdx][num];
      if (targetState) {
        setCameraStates((prev) => ({
          ...prev,
          [activeCameraIdx]: { ...targetState },
        }));
        setPresetMessage(`RECALLED PRESET ${num}`);
      } else {
        playBeep();
        setPresetMessage(`ERR: PRESET ${num} EMPTY`);
      }
      setPresetMode('none');
      setTimeout(() => setPresetMessage(''), 2000);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const activeKeys = new Set<string>();

    const steeringKeys = [
      keyBindings.ptz.panLeft,
      keyBindings.ptz.panRight,
      keyBindings.ptz.tiltUp,
      keyBindings.ptz.tiltDown,
      keyBindings.ptz.zoomIn,
      keyBindings.ptz.zoomOut
    ];
    if (keyBindings.ptz.zoomIn === '+') steeringKeys.push('=');
    if (keyBindings.ptz.zoomOut === '-') steeringKeys.push('_');

    const updateFromKeys = () => {
      let dx = 0;
      let dy = 0;
      let zoom = 0;

      if (activeKeys.has(keyBindings.ptz.panLeft)) dx -= 1;
      if (activeKeys.has(keyBindings.ptz.panRight)) dx += 1;
      if (activeKeys.has(keyBindings.ptz.tiltUp)) dy -= 1;
      if (activeKeys.has(keyBindings.ptz.tiltDown)) dy += 1;

      if (activeKeys.has(keyBindings.ptz.zoomIn) || (keyBindings.ptz.zoomIn === '+' && activeKeys.has('='))) zoom += 1;
      if (activeKeys.has(keyBindings.ptz.zoomOut) || (keyBindings.ptz.zoomOut === '-' && activeKeys.has('_'))) zoom -= 1;

      joystickVector.current = { dx, dy };
      zoomDirection.current = zoom;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (steeringKeys.includes(e.key)) {
        e.preventDefault();
        if (!activeKeys.has(e.key)) {
          activeKeys.add(e.key);
          updateFromKeys();
        }
        return;
      }

      if (e.key === keyBindings.ptz.storePreset) {
        e.preventDefault();
        playClick();
        setPresetMode((prev) => (prev === 'store' ? 'none' : 'store'));
        return;
      }
      if (e.key === keyBindings.ptz.callPreset) {
        e.preventDefault();
        playClick();
        setPresetMode((prev) => (prev === 'call' ? 'none' : 'call'));
        return;
      }
      if (e.key.toLowerCase() === keyBindings.ptz.cam1.toLowerCase()) {
        e.preventDefault();
        playClick();
        setActiveCameraIdx(1);
        return;
      }
      if (e.key.toLowerCase() === keyBindings.ptz.cam2.toLowerCase()) {
        e.preventDefault();
        playClick();
        setActiveCameraIdx(2);
        return;
      }
      if (e.key.toLowerCase() === keyBindings.ptz.cam3.toLowerCase()) {
        e.preventDefault();
        playClick();
        setActiveCameraIdx(3);
        return;
      }
      const numIdx = keyBindings.ptz.keypad.indexOf(e.key);
      if (numIdx !== -1) {
        e.preventDefault();
        handleKeypadPress(numIdx);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (steeringKeys.includes(e.key)) {
        activeKeys.delete(e.key);
        updateFromKeys();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [presetMode, cameraStates, activeCameraIdx, presets, keyBindings]);

  // Tutorials State
  const [activeTutorial, setActiveTutorial] = useState<'none' | 'preset'>('none');
  const [tutorialStep, setTutorialStep] = useState<number>(0);
  const [showTutorialHelp, setShowTutorialHelp] = useState<boolean>(false);

  const startPresetTutorial = () => {
    playClick();
    setActiveTutorial('preset');
    setTutorialStep(0);
    setPresets((prev) => ({ ...prev, 2: {} }));
    setCameraStates((prev) => ({
      ...prev,
      2: {
        pan: 0,
        tilt: 0,
        zoom: 1.0,
        exposure: 1.0,
        focus: 50,
        focusMode: 'auto',
      },
    }));
  };

  const stopTutorial = () => {
    playClick();
    setActiveTutorial('none');
    setTutorialStep(0);
  };

  // Guided Preset Steps
  const presetSteps = [
    {
      title: 'Select Center Camera (F2)',
      desc: 'Select Camera 2 (F2) on the controller to manage its preset settings.',
      help: 'Press F2 on the controller keypad.',
      validate: () => activeCameraIdx === 2,
    },
    {
      title: 'Frame a Close-Up Shot',
      desc: 'Steer the camera centered on the lectern and zoom in slightly (zoom ≥ 2.5) to create a perfect close-up speaker frame.',
      help: 'Zoom in using T. Keep Pan and Tilt near center (between -3 and 3). Zoom level must be 2.5 or higher.',
      validate: () => {
        const c2 = cameraStates[2];
        return Math.abs(c2.pan) <= 3 && Math.abs(c2.tilt) <= 3 && c2.zoom >= 2.5;
      },
    },
    {
      title: 'Store Preset 1',
      desc: 'Let’s store this close-up shot as Preset 1. Click the PRESET button, then click number 1 on the keypad.',
      help: 'Click the yellow "PRESET" button, then click "1" on the numeric keypad.',
      validate: () => presets[2][1] !== undefined,
    },
    {
      title: 'Pan Camera Away',
      desc: 'Let’s simulate checking other parts of the stage. Pan the camera far to the left or right (pan > 15) so the lectern is completely out of frame.',
      help: 'Hold the joystick left or right until the pan value is greater than 15 (or less than -15).',
      validate: () => {
        const c2 = cameraStates[2];
        return Math.abs(c2.pan) > 15;
      },
    },
    {
      title: 'Recall Preset 1',
      desc: 'Restore our close-up shot! Press the CALL button, then press 1 on the keypad.',
      help: 'Click the blue "CALL" button, then press "1" on the keypad. The camera will automatically steer back to the podium!',
      validate: () => {
        const c2 = cameraStates[2];
        const target = presets[2][1];
        if (!target) return false;
        return Math.abs(c2.pan - target.pan) < 1.0 && Math.abs(c2.tilt - target.tilt) < 1.0 && Math.abs(c2.zoom - target.zoom) < 0.2;
      },
    },
  ];

  // Monitor tutorial validation
  useEffect(() => {
    if (activeTutorial === 'none') return;

    const validate = presetSteps[tutorialStep]?.validate;

    if (validate && validate()) {
      if (tutorialStep === presetSteps.length - 1) {
        playSuccess();
        setActiveTutorial('none');
        setTutorialStep(0);
        alert('🎉 Preset Tutorial complete! You successfully stored and recalled camera presets!');
      } else {
        playSuccess();
        setTutorialStep((prev) => prev + 1);
        setShowTutorialHelp(false);
      }
    }
  }, [cameraStates, activeCameraIdx, presets, activeTutorial, tutorialStep]);

  return (
    <div className="flex flex-col gap-3 w-full max-w-full px-2 md:px-4 mx-auto min-h-screen">
      {/* Responsive Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#11131e] px-3 py-2.5 rounded-xl border border-gray-800 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg cursor-pointer transition-all"
          >
            <Home className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide leading-none">PTZ Camera Control Center</h1>
            <p className="text-[10px] text-gray-400">Interactive PTZ Controller Simulator</p>
          </div>
        </div>

        {/* Action / Tutorials / Scenarios Triggers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden File Input for Custom Background Images */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />

          {/* Upload Custom Image Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Upload custom background image for active PTZ camera feed"
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-[11px] rounded-lg shadow flex items-center gap-1.5 cursor-pointer transition-all border border-emerald-500/50"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            UPLOAD IMAGE
          </button>

          {cameraStates[activeCameraIdx]?.customBgImage && (
            <button
              onClick={handleClearCustomImage}
              title="Reset to default scenario image"
              className="px-2 py-1 bg-red-950/60 hover:bg-red-800 text-red-300 text-[10px] font-bold rounded-lg border border-red-700 flex items-center gap-1 cursor-pointer transition-all"
            >
              <Trash2 className="w-3 h-3" />
              RESET IMAGE
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 active:scale-[0.98] text-gray-200 font-bold text-[11px] rounded-lg shadow flex items-center gap-1.5 cursor-pointer transition-all border border-gray-700"
          >
            <Settings className="w-3.5 h-3.5 animate-spin-slow" />
            SETTINGS
          </button>

          {/* Scenario & Framing Guides Bar */}
          <div className="flex items-center gap-1.5 bg-[#181a24] p-1 rounded-lg border border-gray-800">
            <span className="text-[10px] font-mono font-bold text-gray-400 px-2 uppercase">Scenario:</span>
            <button
              onClick={() => { playClick(); setActiveScenario('stage'); }}
              className={`px-2.5 py-0.5 text-[11px] font-bold rounded cursor-pointer transition-all ${
                activeScenario === 'stage'
                  ? 'bg-cyan-500 text-black shadow'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              Stage
            </button>
            <button
              onClick={() => { playClick(); setActiveScenario('watchtower'); }}
              className={`px-2.5 py-0.5 text-[11px] font-bold rounded cursor-pointer transition-all ${
                activeScenario === 'watchtower'
                  ? 'bg-cyan-500 text-black shadow'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              Watchtower
            </button>
            <button
              onClick={() => { playClick(); setActiveScenario('demo'); }}
              className={`px-2.5 py-0.5 text-[11px] font-bold rounded cursor-pointer transition-all ${
                activeScenario === 'demo'
                  ? 'bg-cyan-500 text-black shadow'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              Demonstration
            </button>

            <div className="w-[1px] h-4 bg-gray-800 mx-1" />

            <button
              onClick={() => { playClick(); setShowGuides((prev) => !prev); }}
              className={`px-2.5 py-0.5 text-[11px] font-mono font-bold rounded cursor-pointer transition-all flex items-center gap-1.5 border ${
                showGuides
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                  : 'bg-gray-900/60 text-gray-400 border-gray-800 hover:text-gray-200'
              }`}
            >
              <Crosshair className={`w-3 h-3 ${showGuides ? 'text-amber-400 animate-spin-slow' : ''}`} />
              {showGuides ? 'GUIDES: ON' : 'GUIDES: OFF'}
            </button>
          </div>

          {activeTutorial === 'none' ? (
            <button
              onClick={startPresetTutorial}
              className="px-3 py-1 bg-cyan-500 hover:bg-cyan-600 active:scale-[0.98] text-black font-bold text-[11px] rounded-lg shadow flex items-center gap-1 cursor-pointer transition-all"
            >
              <Bookmark className="w-3 h-3" />
              PRESET TUTORIAL
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-cyan-950/40 border border-cyan-800/50 rounded-lg px-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full led-cyan led-pulse"></span>
              <span className="text-cyan-400 font-bold text-[10px] uppercase tracking-wide">
                TUTORIAL ACTIVE ({activeTutorial.toUpperCase()})
              </span>
              <button
                onClick={stopTutorial}
                className="ml-2 text-[9px] text-gray-400 hover:text-white underline cursor-pointer"
              >
                Quit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Top 3 Full-Width Large Camera Screens (Cam 1, Cam 2, Cam 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full flex-grow">
        {([1, 2, 3] as const).map((idx) => {
          const isActive = activeCameraIdx === idx;
          return (
            <div
              key={idx}
              onClick={() => { playClick(); setActiveCameraIdx(idx); }}
              className={`flex flex-col gap-2 p-2 rounded-xl bg-[#11131e] border-2 transition-all duration-150 cursor-pointer shadow-lg ${
                isActive
                  ? 'border-cyan-500 shadow-cyan-500/20 ring-2 ring-cyan-500/50'
                  : 'border-gray-800 hover:border-gray-600 opacity-90 hover:opacity-100'
              }`}
            >
              <div className="flex justify-between items-center px-2">
                <span className={`text-xs font-bold font-mono tracking-wider px-2 py-0.5 rounded ${
                  isActive ? 'bg-cyan-500 text-black' : 'bg-gray-800 text-gray-300'
                }`}>
                  Camera 0{idx}
                </span>
                {isActive ? (
                  <span className="text-[10px] font-bold text-cyan-400 font-mono flex items-center gap-1.5 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                    ACTIVE CONTROLLER FEED
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-500 font-mono">CLICK TO SELECT</span>
                )}
              </div>

              <CameraViewport
                cameraIdx={idx}
                cameraState={cameraStates[idx]}
                isLive={false}
                activeScenario={activeScenario}
                showGuides={showGuides}
              />
            </div>
          );
        })}
      </div>

      {/* Bottom Section: Hardware Controller Surface & Status */}
      <div className="grid grid-cols-12 gap-6 items-start w-full">
        {/* Main Hardware Controller Surface */}
        <div className="col-span-12 lg:col-span-8">
          <BolinController
            activeCameraIdx={activeCameraIdx}
            cameraState={cameraStates[activeCameraIdx]}
            onSelectCamera={setActiveCameraIdx}
            onJoystickMove={handleJoystickMove}
            onJoystickRelease={handleJoystickRelease}
            onZoomPress={handleZoomPress}
            onKnobChange={handleKnobChange}
            onKeypadPress={handleKeypadPress}
            onPresetModeToggle={() => setPresetMode((prev) => (prev === 'store' ? 'none' : 'store'))}
            onCallModeToggle={() => setPresetMode((prev) => (prev === 'call' ? 'none' : 'call'))}
            presetMode={presetMode}
            joystickSpeed={joystickSpeed}
            zoomSpeedVal={zoomSpeedVal}
            presetMessage={presetMessage}
            invertTilt={invertTilt}
            onToggleInvertTilt={() => setInvertTilt((prev) => !prev)}
            activeScenario={activeScenario}
          />
        </div>

        {/* Right Sidebar: Active Tutorial & Telemetry */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          {/* Active Tutorial Card */}
          {activeTutorial !== 'none' && (
            <div className="bg-[#1c1811] border border-cyan-700/40 rounded-xl p-5 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-cyan-950/50 pb-2">
                <span className="text-cyan-500 font-bold text-xs uppercase tracking-wide">
                  Tutorial Step {tutorialStep + 1} of {presetSteps.length}
                </span>
                <span className="text-cyan-600 text-[10px] font-mono">PTZ Trainer</span>
              </div>

              <div>
                <h3 className="text-white font-bold text-sm leading-tight flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-cyan-500 shrink-0" />
                  {presetSteps[tutorialStep].title}
                </h3>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  {presetSteps[tutorialStep].desc}
                </p>
              </div>

              <div className="pt-2 border-t border-cyan-950/50 flex flex-col gap-2">
                <button
                  onClick={() => {
                    playClick();
                    setShowTutorialHelp((prev) => !prev);
                  }}
                  className="text-xs text-cyan-500 hover:text-cyan-400 flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  {showTutorialHelp ? 'Hide Hint' : 'Show Hint'}
                </button>
                {showTutorialHelp && (
                  <div className="bg-[#0f0e0b] border border-cyan-900/50 p-2.5 rounded text-[11px] text-cyan-400/90 leading-normal font-mono select-text">
                    💡 {presetSteps[tutorialStep].help}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Telemetry Display Card */}
          <div className="bg-[#11131e] border border-gray-800 rounded-xl p-3 shadow-xl flex flex-col gap-3">
            <h2 className="text-white font-bold text-xs border-b border-gray-800 pb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
              <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
              PTZ Telemetry Display
            </h2>
            <div className="text-[11px] font-mono text-gray-400 flex flex-col gap-1.5 select-text">
              <div className="flex justify-between py-0.5 border-b border-gray-900">
                <span className="text-gray-500 font-bold uppercase">CAM IDX</span>
                <span className="text-white">0{activeCameraIdx}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-gray-900">
                <span className="text-gray-500 font-bold uppercase">PAN DEG</span>
                <span className={cameraStates[activeCameraIdx].pan === 0 ? 'text-gray-400' : 'text-cyan-400'}>
                  {cameraStates[activeCameraIdx].pan.toFixed(1)}°
                </span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-gray-900">
                <span className="text-gray-500 font-bold uppercase">TILT DEG</span>
                <span className={cameraStates[activeCameraIdx].tilt === 0 ? 'text-gray-400' : 'text-cyan-400'}>
                  {cameraStates[activeCameraIdx].tilt.toFixed(1)}°
                </span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-gray-900">
                <span className="text-gray-500 font-bold uppercase">ZOOM LVL</span>
                <span className="text-white">{cameraStates[activeCameraIdx].zoom.toFixed(1)}x</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-gray-500 font-bold uppercase">PRESETS</span>
                <span className="text-white font-sans text-[10px]">
                  {Object.keys(presets[activeCameraIdx]).length > 0
                    ? `Saved: [ ${Object.keys(presets[activeCameraIdx]).join(', ')} ]`
                    : 'None Stored'}
                </span>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts Card */}
          <div className="bg-[#11131e] border border-gray-800 rounded-xl p-3 shadow-xl flex flex-col gap-2.5">
            <h2 className="text-white font-bold text-xs border-b border-gray-800 pb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
              <span className="text-cyan-400">⌨</span> Keyboard Shortcuts
            </h2>
            <div className="flex flex-col gap-1.5 text-[10px]">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-bold uppercase text-[8px]">Action</span>
                <span className="text-gray-400 font-bold uppercase text-[8px]">Keys</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-900 pt-1">
                <span className="text-gray-400">Pan Left/Right</span>
                <span className="flex gap-1">
                  <kbd className="bg-gray-800 border border-gray-600 text-gray-200 px-1 py-0.2 rounded font-mono text-[9px]">{formatKeyName(keyBindings.ptz.panLeft)}</kbd>
                  <kbd className="bg-gray-800 border border-gray-600 text-gray-200 px-1 py-0.2 rounded font-mono text-[9px]">{formatKeyName(keyBindings.ptz.panRight)}</kbd>
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-900 pt-1">
                <span className="text-gray-400">Tilt Up/Down</span>
                <span className="flex gap-1">
                  <kbd className="bg-gray-800 border border-gray-600 text-gray-200 px-1 py-0.2 rounded font-mono text-[9px]">{formatKeyName(keyBindings.ptz.tiltUp)}</kbd>
                  <kbd className="bg-gray-800 border border-gray-600 text-gray-200 px-1 py-0.2 rounded font-mono text-[9px]">{formatKeyName(keyBindings.ptz.tiltDown)}</kbd>
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-900 pt-1">
                <span className="text-gray-400">Zoom In/Out</span>
                <span className="flex gap-1">
                  <kbd className="bg-gray-800 border border-gray-600 text-gray-200 px-1.5 py-0.2 rounded font-mono text-[9px]">{formatKeyName(keyBindings.ptz.zoomIn)}</kbd>
                  <kbd className="bg-gray-800 border border-gray-600 text-gray-200 px-1.5 py-0.2 rounded font-mono text-[9px]">{formatKeyName(keyBindings.ptz.zoomOut)}</kbd>
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-900 pt-1">
                <span className="text-gray-400">Select Cam 1 / 2 / 3</span>
                <span className="flex gap-1">
                  <kbd className="bg-gray-800 border border-gray-600 text-gray-200 px-1.5 py-0.2 rounded font-mono text-[9px]">{formatKeyName(keyBindings.ptz.cam1)}</kbd>
                  <kbd className="bg-gray-800 border border-gray-600 text-gray-200 px-1.5 py-0.2 rounded font-mono text-[9px]">{formatKeyName(keyBindings.ptz.cam2)}</kbd>
                  <kbd className="bg-gray-800 border border-gray-600 text-gray-200 px-1.5 py-0.2 rounded font-mono text-[9px]">{formatKeyName(keyBindings.ptz.cam3)}</kbd>
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-900 pt-1">
                <span className="text-gray-400">Store / Call Toggle</span>
                <span className="flex gap-1">
                  <kbd className="bg-gray-800 border border-gray-600 text-gray-200 px-1.5 py-0.2 rounded font-mono text-[9px]">{formatKeyName(keyBindings.ptz.storePreset)}</kbd>
                  <kbd className="bg-gray-800 border border-gray-600 text-gray-200 px-1.5 py-0.2 rounded font-mono text-[9px]">{formatKeyName(keyBindings.ptz.callPreset)}</kbd>
                </span>
              </div>
              <div className="border-t border-gray-800 pt-2">
                <p className="text-gray-500 mb-1 font-semibold uppercase tracking-wide text-[8px]">Keypad Numbers (0-9)</p>
                <div className="grid grid-cols-5 gap-1 text-center font-mono">
                  {keyBindings.ptz.keypad.map((k, i) => (
                    <div key={i} className="bg-gray-900/60 border border-gray-850 rounded py-0.5 text-[8px] text-gray-300">
                      <span className="text-[7px] text-gray-500 block">Btn {i}</span>
                      <span className="font-bold text-cyan-400">{formatKeyName(k)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PtzTrainer;
