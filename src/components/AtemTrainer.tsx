import React, { useState, useEffect } from 'react';
import AtemMultiview from './AtemMultiview';
import AtemPanel from './AtemPanel';
import type { CameraState } from '../utils/canvasRenderer';
import { useAudio } from '../hooks/useAudio';
import stageSvg from '../assets/Stage.svg';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

interface AtemTrainerProps {
  onBackToHome: () => void;
}

export const AtemTrainer: React.FC<AtemTrainerProps> = ({ onBackToHome }) => {
  const { playSuccess, playClick } = useAudio();
  const [bgImageLoaded, setBgImageLoaded] = useState(false);

  // Pre-load stage.jpeg background image & ATEM scenario images
  useEffect(() => {
    const img = new Image();
    img.src = '/scenarios/stage.jpeg';
    img.decode().then(() => {
      setBgImageLoaded(true);
    }).catch((err) => {
      console.warn("Failed to decode stage.jpeg background:", err);
      setBgImageLoaded(true);
    });

    const scenarioImages = [
      '/scenarios/Interview mid shot.png',
      '/scenarios/Demonstration Shot.png',
      '/scenarios/transitionshot.png',
      '/scenarios/speaker mid close up.png',
      '/scenarios/chairman_cam3.png',
      '/scenarios/interview_wide.png'
    ];
    scenarioImages.forEach(src => {
      const pImg = new Image();
      pImg.src = src;
    });
  }, []);

  // State for Switcher
  const [programSource, setProgramSource] = useState<number>(2); // CAM 2 (Chairman) live on Program
  const [previewSource, setPreviewSource] = useState<number>(1); // CAM 1 on Preview
  const [transitionType, setTransitionType] = useState<'mix' | 'wipe' | 'diss'>('mix');
  const [wipePattern, setWipePattern] = useState<number>(1);
  const [faderValue, setFaderValue] = useState<number>(0);
  const [isAutoTransitioning, setIsAutoTransitioning] = useState<boolean>(false);
  const [transitionProgress, setTransitionProgress] = useState<number>(0); // 0 to 1

  // Media Player clock
  const [playbackTime, setPlaybackTime] = useState<number>(0);

  // Default camera states for multiview simulation
  const [cameraStates] = useState<{ [key: number]: CameraState }>({
    1: { pan: -15, tilt: 2, zoom: 1.5, exposure: 1.0, focus: 50, focusMode: 'auto', wbStatus: 'done', wbTint: 'transparent' },
    2: { pan: 0, tilt: -1, zoom: 1.2, exposure: 1.0, focus: 50, focusMode: 'auto', wbStatus: 'done', wbTint: 'transparent' },
    3: { pan: 15, tilt: 3, zoom: 1.5, exposure: 1.0, focus: 50, focusMode: 'auto', wbStatus: 'done', wbTint: 'transparent' },
  });

  // Playback timer loop
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaybackTime((prev) => prev + 0.1);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Sync transition progress to fader or auto-transition timer
  useEffect(() => {
    if (!isAutoTransitioning) {
      setTransitionProgress(faderValue / 100);
    }
  }, [faderValue, isAutoTransitioning]);

  // Handle T-bar fader drag
  const handleFaderChange = (value: number) => {
    if (isAutoTransitioning) return;
    setFaderValue(value);

    // If fader hits the opposite end (100% or 0%), complete transition
    if (value === 100) {
      // Swap PGM and PRV
      const oldPgm = programSource;
      setProgramSource(previewSource);
      setPreviewSource(oldPgm);
      setFaderValue(0);
      setTransitionProgress(0);
    }
  };

  // Execute CUT
  const handleCut = () => {
    if (isAutoTransitioning) return;
    const oldPgm = programSource;
    setProgramSource(previewSource);
    setPreviewSource(oldPgm);
    setFaderValue(0);
    setTransitionProgress(0);
  };

  // Execute AUTO Transition
  const handleAuto = () => {
    if (isAutoTransitioning) return;
    setIsAutoTransitioning(true);

    let progress = 0;
    const duration = 1000; // 1 second transition
    const intervalTime = 20;
    const step = intervalTime / duration;

    const timer = setInterval(() => {
      progress += step;
      if (progress >= 1.0) {
        clearInterval(timer);
        setTransitionProgress(0);
        // Swap sources
        const oldPgm = programSource;
        setProgramSource(previewSource);
        setPreviewSource(oldPgm);
        setIsAutoTransitioning(false);
        setFaderValue(0);
      } else {
        setTransitionProgress(progress);
        setFaderValue(Math.round(progress * 100));
      }
    }, intervalTime);
  };

  // --- ATEM SCENARIO STATE ---
  type ScenarioType = 'none' | 'chairman' | 'interview' | 'watchtower';
  const [activeScenario, setActiveScenario] = useState<ScenarioType>('chairman');

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const PROGRAM_KEYS: Record<string, number> = {
      'a': 1, 's': 2, 'd': 3, 'f': 4, 'g': 5, 'h': 6, 'j': 7, ';': 8,
    };
    const PREVIEW_KEYS: Record<string, number> = {
      'z': 1, 'x': 2, 'c': 3, 'v': 4, 'b': 5, 'n': 6, 'm': 7, '/': 8,
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is on an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleCut();
        return;
      }
      if (e.key === 'Shift') {
        e.preventDefault();
        handleAuto();
        return;
      }
      const pgmIdx = PROGRAM_KEYS[e.key.toLowerCase()];
      if (pgmIdx !== undefined) {
        e.preventDefault();
        playClick();
        setProgramSource(pgmIdx);
        return;
      }
      const prvIdx = PREVIEW_KEYS[e.key.toLowerCase()];
      if (prvIdx !== undefined) {
        e.preventDefault();
        playClick();
        setPreviewSource(prvIdx);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [programSource, previewSource, isAutoTransitioning]);

  const startScenarioType = (type: ScenarioType) => {
    playClick();
    setActiveScenario(type);
    
    // Reset switcher settings to appropriate starting configurations
    if (type === 'chairman') {
      setProgramSource(8); // Start on BLACK
      setPreviewSource(2); // Chairman on CAM 2
      setTransitionType('mix');
      setFaderValue(0);
    } else if (type === 'interview') {
      setProgramSource(8); // Start on BLACK
      setPreviewSource(1); // Host on CAM 1
      setTransitionType('mix');
      setFaderValue(0);
    } else if (type === 'watchtower') {
      setProgramSource(8); // Start on BLACK
      setPreviewSource(2); // Conductor on CAM 2
      setTransitionType('mix');
      setFaderValue(0);
    }
  };


  return (
    <div className="flex flex-col gap-6 max-w-full xl:px-8 mx-auto p-4 w-full">
      {/* Navigation Header */}
      <div className="flex justify-between items-center bg-[#11131e] p-4 rounded-xl border border-gray-800 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg cursor-pointer transition-all"
          >
            <Home className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Video Switcher Control Center</h1>
            <p className="text-xs text-gray-400">Interactive Video Switcher Simulator</p>
          </div>
        </div>

        {/* Scenario Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => startScenarioType('chairman')}
            className={`px-3 py-1.5 font-bold text-[10px] rounded-lg shadow-md flex items-center gap-1 cursor-pointer transition-all border ${
              activeScenario === 'chairman'
                ? 'bg-amber-500 text-white border-amber-400 ring-2 ring-amber-400/50'
                : 'bg-amber-900/40 hover:bg-amber-700/60 text-amber-300 border-amber-700/40'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            CHAIRMAN INTRO
          </button>
          <button
            onClick={() => startScenarioType('interview')}
            className={`px-3 py-1.5 font-bold text-[10px] rounded-lg shadow-md flex items-center gap-1 cursor-pointer transition-all border ${
              activeScenario === 'interview'
                ? 'bg-emerald-500 text-white border-emerald-400 ring-2 ring-emerald-400/50'
                : 'bg-emerald-900/40 hover:bg-emerald-700/60 text-emerald-300 border-emerald-700/40'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            STAGE INTERVIEW
          </button>
          <button
            onClick={() => startScenarioType('watchtower')}
            className={`px-3 py-1.5 font-bold text-[10px] rounded-lg shadow-md flex items-center gap-1 cursor-pointer transition-all border ${
              activeScenario === 'watchtower'
                ? 'bg-sky-500 text-white border-sky-400 ring-2 ring-sky-400/50'
                : 'bg-sky-900/40 hover:bg-sky-700/60 text-sky-300 border-sky-700/40'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            WATCHTOWER
          </button>
        </div>
      </div>

      {/* Main Grid Layout - Side-by-Side on LG screens */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left Column: Switcher Screen & Info (5 columns on large displays) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-5">
          {/* Multiview display */}
          <AtemMultiview
            programSource={programSource}
            previewSource={previewSource}
            transitionProgress={transitionProgress}
            transitionType={transitionType}
            wipePattern={wipePattern}
            cameraStates={cameraStates}
            playbackTime={playbackTime}
            isLive={programSource !== 8 && transitionProgress === 0}
            activeScenario={activeScenario}
            bgImageLoaded={bgImageLoaded}
          />



          {/* Quick Guide Card */}
          <div className="bg-[#11131e] border border-gray-800 rounded-xl p-5 shadow-xl flex flex-col gap-4">
            <h2 className="text-white font-bold text-sm border-b border-gray-800 pb-2 flex items-center gap-2 uppercase tracking-wide">
              <AlertCircle className="w-4 h-4 text-sky-400" />
              Video Switcher Reference
            </h2>
            <div className="text-xs text-gray-400 flex flex-col gap-3 leading-relaxed">
              <div>
                <strong className="text-gray-300 block mb-1">PROGRAM BUS</strong>
                Selects which input is sent live. Active buttons glow <span className="text-red-500 font-bold">RED</span>.
              </div>
              <div>
                <strong className="text-gray-300 block mb-1">PREVIEW BUS</strong>
                Selects which input is staged for transition. Active buttons glow <span className="text-green-500 font-bold">GREEN</span>.
              </div>
              <div>
                <strong className="text-gray-300 block mb-1">CUT & AUTO</strong>
                CUT triggers an immediate swap. AUTO does a smooth transition over 1 second.
              </div>
              <div>
                <strong className="text-gray-300 block mb-1">T-BAR FADER</strong>
                Allows full manual control over fades. Drag to 100% to swap program feeds.
              </div>
              <div className="pt-2 border-t border-gray-800">
                <strong className="text-gray-300 block mb-1">WIRING SCHEME</strong>
                <ul className="list-disc pl-4 space-y-1 mt-1 text-gray-500 font-mono text-[10px]">
                  <li>Input 1: Cam 1 (Stage R)</li>
                  <li>Input 2: Cam 2 (PTZ CTR)</li>
                  <li>Input 3: Cam 3 (Stage L)</li>
                  <li>Input 4: Media 1</li>
                  <li>Input 5: Media 2 (VLC Bk)</li>
                  <li>Input 8: BLACK</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts Card */}
          <div className="bg-[#11131e] border border-gray-800 rounded-xl p-5 shadow-xl flex flex-col gap-3">
            <h2 className="text-white font-bold text-sm border-b border-gray-800 pb-2 uppercase tracking-wide flex items-center gap-2">
              <span className="text-sky-400">⌨</span> Keyboard Shortcuts
            </h2>
            <div className="flex flex-col gap-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">CUT</span>
                <kbd className="bg-gray-800 border border-gray-600 text-gray-200 px-2 py-0.5 rounded font-mono text-[10px]">Enter</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">AUTO Dissolve</span>
                <kbd className="bg-gray-800 border border-gray-600 text-gray-200 px-2 py-0.5 rounded font-mono text-[10px]">Shift</kbd>
              </div>
              <div className="border-t border-gray-800 pt-2 mt-1">
                <p className="text-gray-500 mb-1.5 font-semibold uppercase tracking-wide text-[9px]">Program Bus (Live)</p>
                <div className="grid grid-cols-8 gap-1">
                  {(['a','s','d','f','g','h','j',';'] as const).map((k, i) => (
                    <div key={k} className="flex flex-col items-center gap-0.5">
                      <kbd className={`w-full text-center bg-red-950/60 border border-red-800/60 text-red-300 px-1 py-0.5 rounded font-mono text-[9px] ${
                        programSource === i + 1 ? 'ring-1 ring-red-500 bg-red-700/60' : ''
                      }`}>{k}</kbd>
                      <span className="text-gray-600 text-[8px]">{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-800 pt-2">
                <p className="text-gray-500 mb-1.5 font-semibold uppercase tracking-wide text-[9px]">Preview Bus</p>
                <div className="grid grid-cols-8 gap-1">
                  {(['z','x','c','v','b','n','m','/'] as const).map((k, i) => (
                    <div key={k} className="flex flex-col items-center gap-0.5">
                      <kbd className={`w-full text-center bg-green-950/60 border border-green-800/60 text-green-300 px-1 py-0.5 rounded font-mono text-[9px] ${
                        previewSource === i + 1 ? 'ring-1 ring-green-500 bg-green-700/60' : ''
                      }`}>{k}</kbd>
                      <span className="text-gray-600 text-[8px]">{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Switcher Hardware Panel control surface (7 columns on large displays) */}
        <div className="col-span-12 lg:col-span-7">
          <AtemPanel
            programSource={programSource}
            previewSource={previewSource}
            transitionType={transitionType}
            wipePattern={wipePattern}
            faderValue={faderValue}
            isAutoTransitioning={isAutoTransitioning}
            onSelectProgram={setProgramSource}
            onSelectPreview={setPreviewSource}
            onCut={handleCut}
            onAuto={handleAuto}
            onSelectTransitionType={setTransitionType}
            onSelectWipePattern={setWipePattern}
            onFaderChange={handleFaderChange}
          />
        </div>
      </div>
    </div>
  );
};
export default AtemTrainer;
