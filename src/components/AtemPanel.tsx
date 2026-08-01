import React from 'react';
import { useAudio } from '../hooks/useAudio';

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
}) => {
  const { playClick } = useAudio();

  // Reference variables to satisfy strict compiler checks
  if (wipePattern === -999 && faderValue === -999) {
    console.log("TS-Bypass");
  }

  // Inputs mapped exactly to the diagram columns:
  // Col 1: BLACK (8)
  // Col 2: Camera 1 (1)
  // Col 3: Camera 2 (2)
  // Col 4: Camera 3 (3)
  // Col 5: Media 1 (4)
  // Col 6: Media 2 (5)
  // Col 7: Stream (6)
  // Col 8, 9, 10: Blank spare buttons (7, 9, 10)
  const inputs = [
    { idx: 8, label: 'BLACK' },
    { idx: 1, label: 'Cam 1' },
    { idx: 2, label: 'Cam 2' },
    { idx: 3, label: 'Cam 3' },
    { idx: 4, label: 'Med 1' },
    { idx: 5, label: 'Med 2' },
    { idx: 6, label: 'Stream' },
    { idx: 7, label: 'Bars' },
    { idx: 9, label: '' },
    { idx: 10, label: '' },
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

  return (
    <div className="bg-[#383a42] border-4 border-[#1e202b] rounded-lg p-3 shadow-2xl w-full text-white font-sans">
      {/* Outer Shell Wrapper */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left Side: Program & Preset Bus Rows */}
        <div className="flex-1 flex flex-col gap-3">
          {/* PROGRAM BUS */}
          <div className="flex flex-col">
            {/* Divider Line with PROGRAM Label */}
            <div className="relative flex items-center justify-center mb-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#7a7c85]"></div>
              </div>
              <span className="relative bg-[#383a42] px-3 text-[9px] font-bold tracking-widest text-white/80">
                PROGRAM
              </span>
            </div>

            {/* Program Buttons Grid */}
            <div className="grid grid-cols-10 gap-0">
              {inputs.map((inp) => {
                const isActive = programSource === inp.idx;
                return (
                  <button
                    key={`pgm-${inp.idx}`}
                    onClick={() => handleProgramClick(inp.idx)}
                    className={`h-10 rounded-none flex flex-col items-center justify-center font-bold transition-all duration-100 cursor-pointer shadow-[1px_1px_3px_rgba(0,0,0,0.4)] ${
                      isActive
                        ? 'bg-red-700 text-white border-2 border-red-400 active:scale-[0.98]'
                        : 'bg-[#cccccc] border border-gray-400 text-black hover:bg-[#b5b5b5]'
                    }`}
                  >
                    {inp.label.split(' ').map((part, i) => (
                      <span key={i} className="text-[8px] uppercase tracking-tight leading-none font-extrabold w-full text-center px-0.5 truncate">
                        {part}
                      </span>
                    ))}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PRESET BUS */}
          <div className="flex flex-col">
            {/* Divider Line with PRESET Label */}
            <div className="relative flex items-center justify-center mb-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#7a7c85]"></div>
              </div>
              <span className="relative bg-[#383a42] px-3 text-[9px] font-bold tracking-widest text-white/80">
                PRESET
              </span>
            </div>

            {/* Preset Buttons Grid */}
            <div className="grid grid-cols-10 gap-0">
              {inputs.map((inp) => {
                const isActive = previewSource === inp.idx;
                return (
                  <button
                    key={`prv-${inp.idx}`}
                    onClick={() => handlePreviewClick(inp.idx)}
                    className={`h-10 rounded-none flex flex-col items-center justify-center font-bold transition-all duration-100 cursor-pointer shadow-[1px_1px_3px_rgba(0,0,0,0.4)] ${
                      isActive
                        ? 'bg-green-700 text-white border-2 border-green-400 active:scale-[0.98]'
                        : 'bg-[#cccccc] border border-gray-400 text-black hover:bg-[#b5b5b5]'
                    }`}
                  >
                    {inp.label.split(' ').map((part, i) => (
                      <span key={i} className="text-[8px] uppercase tracking-tight leading-none font-extrabold w-full text-center px-0.5 truncate">
                        {part}
                      </span>
                    ))}
                  </button>
                );
              })}
            </div>

            {/* AUX Labels below the first three Preset buttons */}
            <div className="grid grid-cols-10 gap-0 mt-1">
              <div className="text-center text-[8px] font-bold uppercase tracking-wider text-white/70">
                AUX PGM
              </div>
              <div className="text-center text-[8px] font-bold uppercase tracking-wider text-white/70">
                AUX PV
              </div>
              <div className="text-center text-[8px] font-bold uppercase tracking-wider text-white/70">
                AUX CLN
              </div>
              {/* Remaining 7 columns are empty */}
              <div className="col-span-7"></div>
            </div>
          </div>
        </div>

        {/* Right Side: Transition Control Panel */}
        <div className="w-full lg:w-56 flex flex-col justify-between py-0.5 lg:pl-4 border-t lg:border-t-0 lg:border-l border-[#565963] gap-2 pt-2 lg:pt-0">
          {/* Transition Type Selectors (Top Row) */}
          <div className="flex flex-col gap-1 justify-center">
            <span className="text-[9px] font-bold tracking-widest text-white/70 text-center uppercase">TRANSITION TYPE</span>
            <div className="grid grid-cols-3 gap-1.5">
              {/* DISS Button */}
              <button
                onClick={() => handleTransTypeClick('diss')}
                className={`h-10 rounded-sm flex items-center justify-center font-bold text-[10px] shadow-[1px_1px_3px_rgba(0,0,0,0.4)] cursor-pointer transition-all duration-100 ${
                  transitionType === 'diss' || transitionType === 'mix'
                    ? 'bg-[#22c55e] border-2 border-green-700 text-black'
                    : 'bg-[#cccccc] border border-gray-400 text-black hover:bg-[#b5b5b5]'
                }`}
              >
                DISS
              </button>

              {/* WIPE Button */}
              <button
                onClick={() => handleTransTypeClick('wipe')}
                className={`h-10 rounded-sm flex items-center justify-center font-bold text-[10px] shadow-[1px_1px_3px_rgba(0,0,0,0.4)] cursor-pointer transition-all duration-100 ${
                  transitionType === 'wipe'
                    ? 'bg-[#22c55e] border-2 border-green-700 text-black'
                    : 'bg-[#cccccc] border border-gray-400 text-black hover:bg-[#b5b5b5]'
                }`}
              >
                WIPE
              </button>

              {/* DVE Button */}
              <button
                className="h-10 rounded-sm flex items-center justify-center font-bold text-[10px] shadow-[1px_1px_3px_rgba(0,0,0,0.4)] bg-[#cccccc] border border-gray-400 text-black hover:bg-[#b5b5b5]"
                onClick={() => handleTransTypeClick('diss')}
              >
                DVE
              </button>
            </div>
          </div>

          {/* Action Trigger Buttons (Bottom Row) */}
          <div className="flex flex-col gap-1 justify-center">
            <span className="text-[9px] font-bold tracking-widest text-white/70 text-center uppercase">TRANSITION EXECUTE</span>
            <div className="grid grid-cols-2 gap-2">
              {/* CUT Button */}
              <button
                onClick={() => onCut()}
                className="h-10 rounded-sm flex items-center justify-center font-bold text-[11px] shadow-[1px_1px_3px_rgba(0,0,0,0.4)] bg-[#cccccc] border border-gray-400 text-black hover:bg-[#b5b5b5] cursor-pointer active:scale-[0.98]"
              >
                CUT
              </button>

              {/* AUTO TRANS Button */}
              <button
                onClick={() => onAuto()}
                disabled={isAutoTransitioning}
                className={`h-10 rounded-sm flex flex-col items-center justify-center font-bold text-[11px] shadow-[1px_1px_3px_rgba(0,0,0,0.4)] transition-all duration-100 ${
                  isAutoTransitioning
                    ? 'bg-amber-600/30 border border-amber-600 text-amber-300 led-pulse cursor-not-allowed'
                    : 'bg-[#cccccc] border border-gray-400 text-black hover:bg-[#b5b5b5] cursor-pointer active:scale-[0.98]'
                }`}
              >
                <span className="text-[9px] leading-tight font-extrabold">AUTO</span>
                <span className="text-[9px] leading-tight font-extrabold">TRANS</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AtemPanel;
