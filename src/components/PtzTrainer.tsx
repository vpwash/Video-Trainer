import React, { useState, useEffect, useRef } from 'react';
import CameraViewport from './CameraViewport';
import BolinController from './BolinController';
import type { CameraState } from '../utils/canvasRenderer';
import { useAudio } from '../hooks/useAudio';
import stageSvg from '../assets/Stage.svg';
import { HelpCircle, RefreshCw, Bookmark, ArrowRight, Home } from 'lucide-react';

interface PtzTrainerProps {
  onBackToHome: () => void;
}

export const PtzTrainer: React.FC<PtzTrainerProps> = ({ onBackToHome }) => {
  const { playSuccess, playBeep, playClick } = useAudio();

  // Active Camera selection
  const [activeCameraIdx, setActiveCameraIdx] = useState<1 | 2 | 3>(2);

  // States for all three cameras
  const [cameraStates, setCameraStates] = useState<{ [key: number]: CameraState }>({
    1: {
      pan: -20,
      tilt: -5,
      zoom: 1.0,
      exposure: 1.0,
      focus: 50,
      focusMode: 'auto',
      wbStatus: 'default',
      wbTint: 'rgba(239, 68, 68, 0.12)', // Default reddish uncalibrated tint
    },
    2: {
      pan: 0,
      tilt: 0,
      zoom: 1.0,
      exposure: 1.2,
      focus: 50,
      focusMode: 'auto',
      wbStatus: 'default',
      wbTint: 'rgba(245, 158, 11, 0.15)', // Default warm yellow tint
    },
    3: {
      pan: 20,
      tilt: -5,
      zoom: 1.0,
      exposure: 1.0,
      focus: 50,
      focusMode: 'auto',
      wbStatus: 'default',
      wbTint: 'rgba(59, 130, 246, 0.12)', // Default cold blue tint
    },
  });

  // Controls settings
  const [joystickSpeed, setJoystickSpeed] = useState<number>(4);
  const [zoomSpeedVal, setZoomSpeedVal] = useState<number>(3);
  const [invertTilt, setInvertTilt] = useState<boolean>(false);
  const [showWbPanel, setShowWbPanel] = useState<boolean>(false);
  const [presetMessage, setPresetMessage] = useState<string>('');

  // Joystick active movement vector
  const joystickVector = useRef({ dx: 0, dy: 0 });
  const zoomDirection = useRef<number>(0); // -1: W, 0: stop, 1: T

  // Presets bank: { [camIdx]: { [presetNum]: CameraState } }
  const [presets, setPresets] = useState<{ [key: number]: { [key: number]: CameraState } }>({
    1: {},
    2: {},
    3: {},
  });

  const [presetMode, setPresetMode] = useState<'none' | 'store' | 'call'>('none');
  const [bgImageLoaded, setBgImageLoaded] = useState(false);

  // Pre-load stage.jpeg background image
  useEffect(() => {
    const img = new Image();
    img.src = '/scenarios/stage.jpeg';
    img.decode().then(() => {
      setBgImageLoaded(true);
    }).catch((err) => {
      console.warn("Failed to decode stage.jpeg background:", err);
      setBgImageLoaded(true);
    });
  }, []);

  // Animation frame loop for joystick movement and continuous zoom
  useEffect(() => {
    let animFrameId: number;

    const updateCameraPhysics = () => {
      setCameraStates((prevStates) => {
        const activeState = prevStates[activeCameraIdx];
        let stateChanged = false;
        let newPan = activeState.pan;
        let newTilt = activeState.tilt;
        let newZoom = activeState.zoom;

        // 1. Process joystick pan/tilt
        const { dx, dy } = joystickVector.current;
        if (dx !== 0 || dy !== 0) {
          const moveFactor = joystickSpeed * 0.05;
          const effectiveDy = invertTilt ? -dy : dy;
          newPan = Math.max(-50, Math.min(50, activeState.pan + dx * moveFactor));
          newTilt = Math.max(-30, Math.min(30, activeState.tilt + effectiveDy * moveFactor));
          stateChanged = true;
        }

        // 2. Process zoom rocker (T/W)
        if (zoomDirection.current !== 0) {
          const zoomFactor = zoomSpeedVal * 0.02;
          newZoom = Math.max(1.0, Math.min(8.0, activeState.zoom + zoomDirection.current * zoomFactor));
          stateChanged = true;
        }

        if (stateChanged) {
          return {
            ...prevStates,
            [activeCameraIdx]: {
              ...activeState,
              pan: newPan,
              tilt: newTilt,
              zoom: newZoom,
            },
          };
        }
        return prevStates;
      });

      animFrameId = requestAnimationFrame(updateCameraPhysics);
    };

    animFrameId = requestAnimationFrame(updateCameraPhysics);
    return () => cancelAnimationFrame(animFrameId);
  }, [activeCameraIdx, joystickSpeed, zoomSpeedVal, invertTilt]);

  // Controller Actions
  const handleJoystickMove = (dx: number, dy: number) => {
    joystickVector.current = { dx, dy };
  };

  const handleJoystickRelease = () => {
    joystickVector.current = { dx: 0, dy: 0 };
  };

  const handleZoomPress = (dir: number) => {
    zoomDirection.current = dir;
  };

  const handleKnobChange = (param: 'speed' | 'zoomSpeed' | 'exposure' | 'focus', val: number) => {
    if (param === 'speed') {
      setJoystickSpeed(val);
    } else if (param === 'zoomSpeed') {
      setZoomSpeedVal(val);
    } else {
      setCameraStates((prev) => ({
        ...prev,
        [activeCameraIdx]: {
          ...prev[activeCameraIdx],
          [param]: val,
        },
      }));
    }
  };

  const handleToggleFocusMode = () => {
    setCameraStates((prev) => {
      const current = prev[activeCameraIdx];
      const newMode = current.focusMode === 'auto' ? 'manual' : 'auto';
      return {
        ...prev,
        [activeCameraIdx]: {
          ...current,
          focusMode: newMode,
          // Reset focus to sharp 50 if going auto
          focus: newMode === 'auto' ? 50 : current.focus,
        },
      };
    });
  };

  const handleOnePushWb = () => {
    setCameraStates((prev) => ({
      ...prev,
      [activeCameraIdx]: {
        ...prev[activeCameraIdx],
        wbStatus: 'calibrating',
      },
    }));

    setTimeout(() => {
      setCameraStates((prev) => {
        const current = prev[activeCameraIdx];
        if (current.wbStatus !== 'calibrating') return prev;

        // Perform validation check for tutorial step
        let success = true;
        
        // If white balance panel is not visible, fail calibration (leaves tint as is)
        if (!showWbPanel) {
          success = false;
        }

        return {
          ...prev,
          [activeCameraIdx]: {
            ...current,
            wbStatus: success ? 'done' : 'default',
            wbTint: success ? 'transparent' : current.wbTint,
          },
        };
      });

      setPresetMessage(showWbPanel ? 'WHITE BALANCE OK' : 'WB ERR: NO REFERENCE PANEL');
      setTimeout(() => setPresetMessage(''), 2000);
    }, 2000);
  };

  const handleKeypadPress = (num: number) => {
    const camState = cameraStates[activeCameraIdx];

    if (presetMode === 'store') {
      // Store current state
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
      // Recall state
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

  // --- KEYBOARD SHORTCUTS (Preset & Camera Control) ---
  useEffect(() => {
    const activeKeys = new Set<string>();

    const updateFromKeys = () => {
      let dx = 0;
      let dy = 0;
      let zoom = 0;

      if (activeKeys.has('ArrowLeft')) dx -= 1;
      if (activeKeys.has('ArrowRight')) dx += 1;
      if (activeKeys.has('ArrowUp')) dy += 1;
      if (activeKeys.has('ArrowDown')) dy -= 1;

      if (activeKeys.has('+') || activeKeys.has('=')) zoom += 1;
      if (activeKeys.has('-') || activeKeys.has('_')) zoom -= 1;

      joystickVector.current = { dx, dy };
      zoomDirection.current = zoom;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '+', '=', '-', '_'].includes(e.key)) {
        e.preventDefault();
        if (!activeKeys.has(e.key)) {
          activeKeys.add(e.key);
          updateFromKeys();
        }
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        playClick();
        setPresetMode((prev) => (prev === 'store' ? 'none' : 'store'));
        return;
      }
      if (e.key === '*') {
        e.preventDefault();
        playClick();
        setPresetMode((prev) => (prev === 'call' ? 'none' : 'call'));
        return;
      }
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleKeypadPress(parseInt(e.key));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '+', '=', '-', '_'].includes(e.key)) {
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
  }, [presetMode, cameraStates, activeCameraIdx, presets]);

  // --- TUTORIALS STATE ---
  const [activeTutorial, setActiveTutorial] = useState<'none' | 'wb' | 'preset'>('none');
  const [tutorialStep, setTutorialStep] = useState<number>(0);
  const [showTutorialHelp, setShowTutorialHelp] = useState<boolean>(false);

  const startWbTutorial = () => {
    playClick();
    setActiveTutorial('wb');
    setTutorialStep(0);
    // Reset Cam 2 to warm uncalibrated state
    setCameraStates((prev) => ({
      ...prev,
      2: {
        pan: 0,
        tilt: -10, // looking down
        zoom: 1.0, // zoom out
        exposure: 1.2,
        focus: 50,
        focusMode: 'auto',
        wbStatus: 'default',
        wbTint: 'rgba(245, 158, 11, 0.2)', // orange tint
      },
    }));
    setShowWbPanel(false);
  };

  const startPresetTutorial = () => {
    playClick();
    setActiveTutorial('preset');
    setTutorialStep(0);
    // Reset presets and camera coordinates
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
        wbStatus: 'done',
        wbTint: 'transparent',
      },
    }));
  };

  const stopTutorial = () => {
    playClick();
    setActiveTutorial('none');
    setTutorialStep(0);
  };

  // Guided White Balance Steps
  const wbSteps = [
    {
      title: 'Select Center Camera (F2)',
      desc: 'Let’s perform a white balance calibration on Camera 2. Press F2 on the controller assign keys.',
      help: 'Click the "F2" button in the assign keys row on the controller.',
      validate: () => activeCameraIdx === 2,
    },
    {
      title: 'Show the White Balance Panel',
      desc: 'Position the collapsible white-balance panel on stage at the lectern.',
      help: 'Click the "Show White Balance Panel" button directly under the viewfinder screen.',
      validate: () => showWbPanel === true,
    },
    {
      title: 'Frame and Zoom in on the Panel',
      desc: 'The panel is to the left and slightly up. Use the joystick to pan left (pan ≈ -7) and tilt up (tilt ≈ 7), then use the ZOOM rocker (T) to zoom in close (zoom ≥ 4.0) so the white surface fills the screen crosshairs.',
      help: 'Steer joystick left and up, then hold T until zoom is above 4.0. Targets: Pan (-12 to -2), Tilt (3 to 11), Zoom (≥ 4.0).',
      validate: () => {
        const c2 = cameraStates[2];
        return c2.pan >= -12 && c2.pan <= -2 && c2.tilt >= 3 && c2.tilt <= 11 && c2.zoom >= 3.8;
      },
    },
    {
      title: 'Calibrate White Balance',
      desc: 'With the white-balance panel fully framed, press the ONE PUSH WB button to initiate the camera sensor calibration.',
      help: 'Click the "ONE PUSH WB" button on the controller. Wait 2 seconds for calibration to finish.',
      validate: () => cameraStates[2].wbStatus === 'done',
    },
  ];

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
        // Verify camera animated back to the preset sweet spot
        return Math.abs(c2.pan - target.pan) < 1.0 && Math.abs(c2.tilt - target.tilt) < 1.0 && Math.abs(c2.zoom - target.zoom) < 0.2;
      },
    },
  ];

  // Monitor tutorial validation
  useEffect(() => {
    if (activeTutorial === 'none') return;

    const steps = activeTutorial === 'wb' ? wbSteps : presetSteps;
    const validate = steps[tutorialStep]?.validate;

    if (validate && validate()) {
      if (tutorialStep === steps.length - 1) {
        // Tutorial finished!
        playSuccess();
        setActiveTutorial('none');
        setTutorialStep(0);
        alert(
          activeTutorial === 'wb'
            ? '🎉 White Balance Calibration complete! You successfully calibrated the color temperature of the PTZ camera!'
            : '🎉 Preset Tutorial complete! You successfully stored and recalled camera presets!'
        );
      } else {
        // Next Step
        playSuccess();
        setTutorialStep((prev) => prev + 1);
        setShowTutorialHelp(false);
      }
    }
  }, [cameraStates, activeCameraIdx, showWbPanel, presets, activeTutorial, tutorialStep]);

  return (
    <div className="flex flex-col gap-6 max-w-full xl:px-8 mx-auto p-4 w-full">
      {/* Header Panel */}
      <div className="flex justify-between items-center bg-[#11131e] p-4 rounded-xl border border-gray-800 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg cursor-pointer transition-all"
          >
            <Home className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">PTZ Camera Control Center</h1>
            <p className="text-xs text-gray-400">Interactive PTZ Controller Simulator</p>
          </div>
        </div>

        {/* Action / Tutorials Triggers */}
        <div className="flex gap-2">
          {activeTutorial === 'none' ? (
            <>
              <button
                onClick={startWbTutorial}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-black font-bold text-xs rounded-lg shadow flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                WHITE BALANCE TUTORIAL
              </button>
              <button
                onClick={startPresetTutorial}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 active:scale-[0.98] text-black font-bold text-xs rounded-lg shadow flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Bookmark className="w-3.5 h-3.5" />
                PRESET STORAGE TUTORIAL
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 bg-amber-950/40 border border-amber-800/50 rounded-lg px-3 py-1.5">
              <span className="w-2 h-2 rounded-full led-amber led-pulse"></span>
              <span className="text-amber-400 font-bold text-xs uppercase tracking-wide">
                TUTORIAL ACTIVE ({activeTutorial.toUpperCase()})
              </span>
              <button
                onClick={stopTutorial}
                className="ml-4 text-[10px] text-gray-400 hover:text-white underline cursor-pointer"
              >
                Quit Tutorial
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Layout - Side-by-Side on LG screens */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left Column: Viewport, Controls & Info (5 columns on large displays) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-5">
          {/* Camera Preview Strip */}
          <div className="grid grid-cols-3 gap-2">
            {([1, 2, 3] as const).map((idx) => (
              <div
                key={idx}
                onClick={() => setActiveCameraIdx(idx)}
                className={`relative rounded-lg overflow-hidden cursor-pointer transition-all duration-150 border-2 ${
                  activeCameraIdx === idx
                    ? 'border-cyan-500 shadow-lg shadow-cyan-500/30 scale-[1.02]'
                    : 'border-gray-700/60 hover:border-gray-500 opacity-70 hover:opacity-90'
                }`}
              >
                <CameraViewport
                  cameraIdx={idx}
                  cameraState={cameraStates[idx]}
                  showWbPanel={showWbPanel && activeCameraIdx === idx}
                  isLive={false}
                  bgImageLoaded={bgImageLoaded}
                />
                {/* Label overlay */}
                <div className={`absolute top-1 left-1.5 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${
                  activeCameraIdx === idx
                    ? 'bg-cyan-500 text-black'
                    : 'bg-black/70 text-gray-300'
                }`}>
                  CAM {idx}
                </div>
                {activeCameraIdx === idx && (
                  <div className="absolute bottom-1 right-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse inline-block"></span>
                    <span className="text-[8px] font-bold text-cyan-400 font-mono">ACTIVE</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Main Camera Viewfinder View */}
          <div className="flex flex-col gap-2">
            <CameraViewport
              cameraIdx={activeCameraIdx}
              cameraState={cameraStates[activeCameraIdx]}
              showWbPanel={showWbPanel}
              isLive={false} // purely local simulator
              bgImageLoaded={bgImageLoaded}
            />
            {/* Viewport helpers (e.g. Show White Balance Panel trigger) */}
            <div className="flex justify-between items-center bg-[#0d0e14] p-3 rounded-lg border border-gray-800/80">
              <span className="text-xs text-gray-400 font-medium select-text">
                Stage Controls: Position a target calibration card.
              </span>
              <button
                onClick={() => {
                  playClick();
                  setShowWbPanel((prev) => !prev);
                }}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                  showWbPanel
                    ? 'bg-amber-600 text-black shadow-md border border-amber-500'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                }`}
              >
                {showWbPanel ? 'Hide White-Balance Panel' : 'Show White-Balance Panel'}
              </button>
            </div>
          </div>

          {/* Active Tutorial Card */}
          {activeTutorial !== 'none' && (
            <div className="bg-[#1c1811] border border-amber-700/40 rounded-xl p-5 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-amber-950/50 pb-2">
                <span className="text-amber-500 font-bold text-xs uppercase tracking-wide">
                  Tutorial Step {tutorialStep + 1} of{' '}
                  {activeTutorial === 'wb' ? wbSteps.length : presetSteps.length}
                </span>
                <span className="text-amber-600 text-[10px] font-mono">PTZ Trainer</span>
              </div>

              <div>
                <h3 className="text-white font-bold text-sm leading-tight flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-amber-500 shrink-0" />
                  {activeTutorial === 'wb' ? wbSteps[tutorialStep].title : presetSteps[tutorialStep].title}
                </h3>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  {activeTutorial === 'wb' ? wbSteps[tutorialStep].desc : presetSteps[tutorialStep].desc}
                </p>
              </div>

              <div className="pt-2 border-t border-amber-950/50 flex flex-col gap-2">
                <button
                  onClick={() => {
                    playClick();
                    setShowTutorialHelp((prev) => !prev);
                  }}
                  className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  {showTutorialHelp ? 'Hide Hint' : 'Show Hint'}
                </button>
                {showTutorialHelp && (
                  <div className="bg-[#0f0e0b] border border-amber-900/50 p-2.5 rounded text-[11px] text-amber-400/90 leading-normal font-mono select-text">
                    💡 {activeTutorial === 'wb' ? wbSteps[tutorialStep].help : presetSteps[tutorialStep].help}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Calibration guide card */}
          <div className="bg-[#11131e] border border-gray-800 rounded-xl p-5 shadow-xl flex flex-col gap-4">
            <h2 className="text-white font-bold text-sm border-b border-gray-800 pb-2 flex items-center gap-1.5 uppercase tracking-wide">
              <RefreshCw className="w-4 h-4 text-sky-400" />
              PTZ Telemetry Display
            </h2>
            <div className="text-xs font-mono text-gray-400 flex flex-col gap-2 select-text">
              <div className="flex justify-between py-1 border-b border-gray-900">
                <span className="text-gray-500 font-bold uppercase">CAM IDX</span>
                <span className="text-white">0{activeCameraIdx}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-900">
                <span className="text-gray-500 font-bold uppercase">PAN DEG</span>
                <span className={cameraStates[activeCameraIdx].pan === 0 ? 'text-gray-400' : 'text-cyan-400'}>
                  {cameraStates[activeCameraIdx].pan.toFixed(1)}°
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-900">
                <span className="text-gray-500 font-bold uppercase">TILT DEG</span>
                <span className={cameraStates[activeCameraIdx].tilt === 0 ? 'text-gray-400' : 'text-cyan-400'}>
                  {cameraStates[activeCameraIdx].tilt.toFixed(1)}°
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-900">
                <span className="text-gray-500 font-bold uppercase">ZOOM LVL</span>
                <span className="text-white">{cameraStates[activeCameraIdx].zoom.toFixed(1)}x</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-900">
                <span className="text-gray-500 font-bold uppercase">WB CAL</span>
                <span className={cameraStates[activeCameraIdx].wbStatus === 'done' ? 'text-emerald-400' : 'text-rose-400'}>
                  {cameraStates[activeCameraIdx].wbStatus.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500 font-bold uppercase">PRESETS</span>
                <span className="text-white font-sans text-[10px]">
                  {Object.keys(presets[activeCameraIdx]).length > 0
                    ? `Saved: [ ${Object.keys(presets[activeCameraIdx]).join(', ')} ]`
                    : 'None Stored'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Bolin Hardware Controller Panel control surface (7 columns on large displays) */}
        <div className="col-span-12 lg:col-span-7">
          <BolinController
            activeCameraIdx={activeCameraIdx}
            cameraState={cameraStates[activeCameraIdx]}
            onSelectCamera={setActiveCameraIdx}
            onJoystickMove={handleJoystickMove}
            onJoystickRelease={handleJoystickRelease}
            onZoomPress={handleZoomPress}
            onKnobChange={handleKnobChange}
            onToggleFocusMode={handleToggleFocusMode}
            onOnePushWb={handleOnePushWb}
            onKeypadPress={handleKeypadPress}
            onPresetModeToggle={() => setPresetMode((prev) => (prev === 'store' ? 'none' : 'store'))}
            onCallModeToggle={() => setPresetMode((prev) => (prev === 'call' ? 'none' : 'call'))}
            presetMode={presetMode}
            joystickSpeed={joystickSpeed}
            zoomSpeedVal={zoomSpeedVal}
            presetMessage={presetMessage}
            invertTilt={invertTilt}
            onToggleInvertTilt={() => setInvertTilt((prev) => !prev)}
          />
        </div>
      </div>
    </div>
  );
};
export default PtzTrainer;
