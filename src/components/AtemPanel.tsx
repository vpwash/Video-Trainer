import React from 'react';
import { useAudio } from '../hooks/useAudio';
import { Settings, Play, ArrowRightLeft } from 'lucide-react';

interface AtemPanelProps {
  programSource: number;
  previewSource: number;
  transitionType: 'mix' | 'wipe' | 'diss';
  wipePattern: number;
  faderValue: number; // 0 to 100
  isAutoTransitioning: boolean;
  onSelectProgram: (source: number) => void;
  onSelectPreview: (source: number) => void;
  onCut: () => void;
  onAuto: () => void;
  onSelectTransitionType: (type: 'mix' | 'wipe' | 'diss') => void;
  onSelectWipePattern: (pattern: number) => void;
  onFaderChange: (val: number) => void;
}

export const AtemPanel: React.FC<AtemPanelProps> = ({
  programSource,
  previewSource,
  transitionType,
  wipePattern,
  faderValue,
  isAutoTransitioning,
  onSelectProgram,
  onSelectPreview,
  onCut,
  onAuto,
  onSelectTransitionType,
  onSelectWipePattern,
  onFaderChange,
}) => {
  const { playClick } = useAudio();

  const inputs = [
    { idx: 1, label: 'CAM 1', desc: 'STAGE R' },
    { idx: 2, label: 'CAM 2', desc: 'PTZ CTR' },
    { idx: 3, label: 'CAM 3', desc: 'STAGE L' },
    { idx: 4, label: 'MED 1', desc: 'MEDIA' },
    { idx: 5, label: 'MED 2', desc: 'VLC BK' },
    { idx: 6, label: 'STRM', desc: 'PC IN' },
    { idx: 7, label: 'BARS', desc: 'TEST' },
    { idx: 8, label: 'BLK', desc: 'BLACK' },
    { idx: 9, label: 'AUX1', desc: 'SPARE' },
    { idx: 10, label: 'AUX2', desc: 'SPARE' },
  ];

  const handleProgramClick = (idx: number) => {
    playClick();
    onSelectProgram(idx);
  };

  const handlePreviewClick = (idx: number) => {
    playClick();
    onSelectPreview(idx);
  };

  const handleTransTypeClick = (type: 'mix' | 'wipe' | 'diss') => {
    playClick();
    onSelectTransitionType(type);
  };

  const handleWipePatternClick = (pattern: number) => {
    playClick();
    onSelectWipePattern(pattern);
  };

  return (
    <div className="bg-[#181a24] border-4 border-[#2b2e3c] rounded-xl p-5 shadow-2xl w-full text-gray-300 font-sans select-none relative">
      {/* Chassis Top Metal Stripe */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-[#2d3042] rounded-t-lg"></div>

      <div className="flex flex-col gap-6 mt-1">
        {/* Top Control Bar (Status, LCD and Macros) */}
        <div className="flex justify-between items-center bg-[#0d0e14] p-3 rounded-lg border border-gray-800/80">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-gray-500 animate-spin-slow" />
            <div className="flex flex-col">
              <span className="text-white text-xs font-bold tracking-wider uppercase">Production Switcher</span>
              <span className="text-[10px] text-gray-500 font-mono">FW v9.2.1 • 10-INPUT SDI</span>
            </div>
          </div>

          {/* Mini LCD Display */}
          <div className="bg-[#1e1406] border border-amber-900/60 rounded px-4 py-1.5 w-64 text-center lcd-font text-amber-500 text-xs shadow-inner select-text">
            <div className="flex justify-between border-b border-amber-900/30 pb-0.5 text-[9px] text-amber-600/80">
              <span>SYS STATUS</span>
              <span>TRANS: {transitionType.toUpperCase()}</span>
            </div>
            <div className="pt-1 font-bold tracking-wide uppercase lcd-glow-amber">
              {isAutoTransitioning ? 'TRANSITION ACTIVE' : `PGM: M${programSource} • PRV: M${previewSource}`}
            </div>
          </div>

          <div className="flex gap-2">
            {/* Quick indicators */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[8px] text-gray-500 font-bold uppercase font-mono">Ref Lock</span>
              <span className="w-2.5 h-2.5 rounded-full led-green"></span>
            </div>
            <div className="flex flex-col items-center gap-1 ml-2">
              <span className="text-[8px] text-gray-500 font-bold uppercase font-mono">P/S Dual</span>
              <span className="w-2.5 h-2.5 rounded-full led-green"></span>
            </div>
            <div className="flex flex-col items-center gap-1 ml-2">
              <span className="text-[8px] text-gray-500 font-bold uppercase font-mono">Wipe Pat</span>
              <span className={`w-2.5 h-2.5 rounded-full ${transitionType === 'wipe' ? 'led-amber' : 'led-off'}`}></span>
            </div>
          </div>
        </div>

        {/* Core Switching Buses */}
        <div className="flex flex-col gap-4 bg-[#11121a] p-4 rounded-lg border border-gray-800/60">
          {/* PROGRAM BUS ROW */}
          <div>
            <div className="flex justify-between items-center text-[10px] text-red-500/80 font-bold uppercase tracking-wider mb-2 px-1">
              <span>Program Bus (Live Output)</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full led-red led-pulse inline-block"></span>
                ACTIVE LIVE
              </span>
            </div>
            <div className="grid grid-cols-10 gap-2">
              {inputs.map((inp) => {
                const isActive = programSource === inp.idx;
                return (
                  <button
                    key={`pgm-${inp.idx}`}
                    onClick={() => handleProgramClick(inp.idx)}
                    className={`h-12 rounded flex flex-col items-center justify-center border font-sans font-bold cursor-pointer transition-all duration-100 ${
                      isActive
                        ? 'switcher-btn-red text-white scale-[0.98]'
                        : 'bg-[#1e202e] border-gray-800 text-gray-400 hover:bg-[#252839]'
                    }`}
                  >
                    <span className="text-xs">{inp.label}</span>
                    <span className="text-[8px] opacity-60 font-mono tracking-tight font-medium uppercase mt-0.5">
                      {inp.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PREVIEW / PRESET BUS ROW */}
          <div>
            <div className="flex justify-between items-center text-[10px] text-green-500/80 font-bold uppercase tracking-wider mb-2 px-1">
              <span>Preview Bus (Preset Output)</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full led-green inline-block"></span>
                STAGED FOR CUT
              </span>
            </div>
            <div className="grid grid-cols-10 gap-2">
              {inputs.map((inp) => {
                const isActive = previewSource === inp.idx;
                return (
                  <button
                    key={`prv-${inp.idx}`}
                    onClick={() => handlePreviewClick(inp.idx)}
                    className={`h-12 rounded flex flex-col items-center justify-center border font-sans font-bold cursor-pointer transition-all duration-100 ${
                      isActive
                        ? 'switcher-btn-green text-white scale-[0.98]'
                        : 'bg-[#1e202e] border-gray-800 text-gray-400 hover:bg-[#252839]'
                    }`}
                  >
                    <span className="text-xs">{inp.label}</span>
                    <span className="text-[8px] opacity-60 font-mono tracking-tight font-medium uppercase mt-0.5">
                      {inp.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Transition Controls & Fader Bar Section */}
        <div className="grid grid-cols-12 gap-5">
          {/* Transition Type Selectors (left 4 columns) */}
          <div className="col-span-4 bg-[#11121a] p-3.5 rounded-lg border border-gray-800/60 flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2.5">
                Transition Style
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleTransTypeClick('mix')}
                  className={`py-2 px-1 text-center font-bold text-xs rounded border transition-all duration-100 cursor-pointer ${
                    transitionType === 'mix'
                      ? 'bg-[#f59e0b]/20 border-[#f59e0b] text-[#f59e0b]'
                      : 'bg-[#1e202e] border-gray-800 text-gray-400 hover:bg-[#252839]'
                  }`}
                >
                  MIX
                </button>
                <button
                  onClick={() => handleTransTypeClick('wipe')}
                  className={`py-2 px-1 text-center font-bold text-xs rounded border transition-all duration-100 cursor-pointer ${
                    transitionType === 'wipe'
                      ? 'bg-[#f59e0b]/20 border-[#f59e0b] text-[#f59e0b]'
                      : 'bg-[#1e202e] border-gray-800 text-gray-400 hover:bg-[#252839]'
                  }`}
                >
                  WIPE
                </button>
                <button
                  onClick={() => handleTransTypeClick('diss')}
                  className={`py-2 px-1 text-center font-bold text-xs rounded border transition-all duration-100 cursor-pointer ${
                    transitionType === 'diss'
                      ? 'bg-[#f59e0b]/20 border-[#f59e0b] text-[#f59e0b]'
                      : 'bg-[#1e202e] border-gray-800 text-gray-400 hover:bg-[#252839]'
                  }`}
                >
                  DISS
                </button>
              </div>
            </div>

            {/* Wipe Pattern Selector (Only enabled if WIPE is selected) */}
            <div className="mt-3.5 pt-3.5 border-t border-gray-800/80">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2">
                Wipe Pattern Keypad
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((pat) => {
                  const isSel = wipePattern === pat && transitionType === 'wipe';
                  const disabled = transitionType !== 'wipe';
                  return (
                    <button
                      key={`wipe-${pat}`}
                      disabled={disabled}
                      onClick={() => handleWipePatternClick(pat)}
                      className={`py-1.5 text-center font-mono font-bold text-xs rounded border transition-all duration-100 ${
                        disabled
                          ? 'opacity-30 bg-[#161720] border-gray-800/50 text-gray-600 cursor-not-allowed'
                          : isSel
                          ? 'bg-[#f59e0b] border-[#f59e0b] text-black shadow-md cursor-pointer'
                          : 'bg-[#1e202e] border-gray-800 text-gray-400 hover:bg-[#252839] cursor-pointer'
                      }`}
                    >
                      {pat}
                    </button>
                  );
                })}
              </div>
              {transitionType === 'wipe' && wipePattern === 1 && (
                <span className="text-[9px] text-amber-500 font-mono mt-1.5 block">
                  Pattern 1: Horizontal Split Screen
                </span>
              )}
            </div>
          </div>

          {/* Action Trigger Buttons (middle 4 columns: CUT & AUTO) */}
          <div className="col-span-5 bg-[#11121a] p-3.5 rounded-lg border border-gray-800/60 flex flex-col justify-center gap-3">
            <button
              onClick={() => {
                playClick();
                onCut();
              }}
              className="py-3.5 rounded bg-gradient-to-r from-red-700 to-red-600 border border-red-500 hover:brightness-110 active:scale-[0.98] text-white font-bold text-sm tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all duration-100"
            >
              <ArrowRightLeft className="w-4 h-4" />
              CUT (INSTANT)
            </button>
            
            <button
              onClick={() => {
                playClick();
                onAuto();
              }}
              disabled={isAutoTransitioning}
              className={`py-3.5 rounded border text-white font-bold text-sm tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all duration-100 ${
                isAutoTransitioning
                  ? 'bg-amber-600/30 border-amber-600/50 text-amber-300 led-pulse cursor-not-allowed'
                  : 'bg-gradient-to-r from-gray-700 to-gray-600 border-gray-500 hover:brightness-110 active:scale-[0.98] cursor-pointer'
              }`}
            >
              <Play className="w-4 h-4" />
              AUTO (DISSOLVE)
            </button>
          </div>

          {/* T-Bar Fader Transition (right 3 columns) */}
          <div className="col-span-3 bg-[#11121a] p-3.5 rounded-lg border border-gray-800/60 flex flex-col items-center justify-between">
            <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider text-center w-full pb-1 border-b border-gray-800/60 font-mono">
              MANUAL T-BAR
            </div>

            {/* Vertical Fader Track */}
            <div className="relative flex justify-center items-center py-4 h-28 w-full">
              {/* LED progress ticks along side */}
              <div className="absolute left-4 flex flex-col justify-between h-full py-2">
                {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((t) => {
                  const isActive = faderValue > 0 && Math.abs(100 - t - faderValue) < 8;
                  return (
                    <span
                      key={t}
                      className={`w-2 h-0.5 rounded ${isActive ? 'bg-green-500 shadow-sm' : 'bg-gray-800'}`}
                    ></span>
                  );
                })}
              </div>

              {/* Range input oriented vertically */}
              <div className="relative h-24 w-12 flex justify-center items-center">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={faderValue}
                  onChange={(e) => onFaderChange(parseInt(e.target.value))}
                  className="fader-input absolute cursor-pointer h-5 w-24 -rotate-90 origin-center"
                />
              </div>

              {/* Fader numeric readout */}
              <div className="absolute right-4 text-[10px] font-mono text-gray-500">
                {faderValue}%
              </div>
            </div>

            <span className="text-[8px] text-gray-600 font-bold tracking-tight">
              DRAG TO TRANSITION
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AtemPanel;
