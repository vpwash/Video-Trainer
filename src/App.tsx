import { useState, useEffect } from 'react';
import AtemTrainer from './components/AtemTrainer';
import PtzTrainer from './components/PtzTrainer';
import { useAudio } from './hooks/useAudio';
import { Monitor, Camera, Award, Settings, X, RotateCcw } from 'lucide-react';
import { loadKeyBindings, saveKeyBindings, DEFAULT_KEY_BINDINGS, type KeyBindings } from './utils/keyBindings';

type ActivePage = 'home' | 'switcher' | 'ptz';

function App() {
  const [page, setPage] = useState<ActivePage>('home');
  const { playClick } = useAudio();
  const [keyBindings, setKeyBindings] = useState<KeyBindings>(loadKeyBindings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'atem' | 'ptz'>('atem');
  
  // Track which field is currently listening for a key press
  const [bindingField, setBindingField] = useState<{
    category: 'atem' | 'ptz';
    field: string;
    index?: number;
  } | null>(null);

  const handleNav = (target: ActivePage) => {
    playClick();
    setPage(target);
  };

  // Keyboard listener for custom key mapping
  useEffect(() => {
    if (!bindingField) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Escape cancels the binding process
      if (e.key === 'Escape') {
        setBindingField(null);
        return;
      }

      const pressedKey = e.key;
      const { category, field, index } = bindingField;

      setKeyBindings((prev) => {
        const next = JSON.parse(JSON.stringify(prev)) as KeyBindings;
        
        if (category === 'atem') {
          if (field === 'program' && index !== undefined) {
            next.atem.program[index] = pressedKey;
          } else if (field === 'preview' && index !== undefined) {
            next.atem.preview[index] = pressedKey;
          } else {
            (next.atem as any)[field] = pressedKey;
          }
        } else {
          if (field === 'keypad' && index !== undefined) {
            next.ptz.keypad[index] = pressedKey;
          } else {
            (next.ptz as any)[field] = pressedKey;
          }
        }
        
        saveKeyBindings(next);
        return next;
      });

      setBindingField(null);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [bindingField]);

  const handleRestoreDefaults = () => {
    playClick();
    if (window.confirm('Are you sure you want to revert all keys to default configuration?')) {
      setKeyBindings(DEFAULT_KEY_BINDINGS);
      saveKeyBindings(DEFAULT_KEY_BINDINGS);
      setBindingField(null);
    }
  };

  const formatKeyName = (key: string) => {
    if (key === ' ') return 'Space';
    if (key.length === 1) return key.toUpperCase();
    return key;
  };

  if (page === 'switcher') {
    return (
      <div className="min-h-screen bg-[#090a0f] text-gray-100 flex flex-col py-6 relative">
        <AtemTrainer 
          onBackToHome={() => handleNav('home')} 
          keyBindings={keyBindings}
          onOpenSettings={() => { playClick(); setIsSettingsOpen(true); }}
        />
        {isSettingsOpen && renderSettingsModal()}
      </div>
    );
  }

  if (page === 'ptz') {
    return (
      <div className="min-h-screen bg-[#090a0f] text-gray-100 flex flex-col py-6 relative">
        <PtzTrainer 
          onBackToHome={() => handleNav('home')} 
          keyBindings={keyBindings}
          onOpenSettings={() => { playClick(); setIsSettingsOpen(true); }}
        />
        {isSettingsOpen && renderSettingsModal()}
      </div>
    );
  }

  function renderSettingsModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-[#0f111a] border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Modal Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-900 bg-gray-950/60">
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide uppercase lcd-font">Control Settings</h3>
              <p className="text-xs text-gray-400 mt-0.5">Customize your simulator keyboard shortcuts</p>
            </div>
            <button
              onClick={() => { playClick(); setBindingField(null); setIsSettingsOpen(false); }}
              className="p-1.5 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Tabs */}
          <div className="flex border-b border-gray-900 bg-gray-950/20">
            <button
              onClick={() => { playClick(); setSettingsTab('atem'); }}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                settingsTab === 'atem'
                  ? 'border-sky-500 text-sky-400 bg-sky-950/10'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900/30'
              }`}
            >
              <Monitor className="w-4 h-4" />
              Video Switcher (ATEM)
            </button>
            <button
              onClick={() => { playClick(); setSettingsTab('ptz'); }}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                settingsTab === 'ptz'
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-950/10'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900/30'
              }`}
            >
              <Camera className="w-4 h-4" />
              PTZ Keyboard
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 overflow-y-auto flex-grow flex flex-col gap-6">
            {bindingField && (
              <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-3 text-center text-amber-400 text-xs font-mono animate-pulse">
                ⚠️ LISTENING FOR INPUT: Press any key on your keyboard to assign, or <kbd className="bg-amber-900/60 px-1.5 py-0.5 rounded text-white">Esc</kbd> to cancel.
              </div>
            )}

            {settingsTab === 'atem' ? (
              <div className="flex flex-col gap-6">
                {/* Program Bus Grid */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Program Bus Keys (Live)</h4>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {keyBindings.atem.program.map((key, i) => {
                      const isListening = bindingField?.category === 'atem' && bindingField?.field === 'program' && bindingField?.index === i;
                      return (
                        <button
                          key={`pgm-${i}`}
                          onClick={() => { playClick(); setBindingField({ category: 'atem', field: 'program', index: i }); }}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all cursor-pointer ${
                            isListening
                              ? 'bg-amber-500/20 border-amber-500 text-amber-400 ring-2 ring-amber-500/50'
                              : 'bg-gray-900/50 border-gray-800 hover:border-sky-500/50 text-gray-300'
                          }`}
                        >
                          <span className="text-[10px] text-gray-500 font-mono">PGM {i + 1}</span>
                          <kbd className="text-xs font-mono font-bold bg-black/45 px-1.5 py-0.5 rounded min-w-[20px]">
                            {isListening ? '...' : formatKeyName(key)}
                          </kbd>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Preview Bus Grid */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Preview Bus Keys (Staged)</h4>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {keyBindings.atem.preview.map((key, i) => {
                      const isListening = bindingField?.category === 'atem' && bindingField?.field === 'preview' && bindingField?.index === i;
                      return (
                        <button
                          key={`prv-${i}`}
                          onClick={() => { playClick(); setBindingField({ category: 'atem', field: 'preview', index: i }); }}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all cursor-pointer ${
                            isListening
                              ? 'bg-amber-500/20 border-amber-500 text-amber-400 ring-2 ring-amber-500/50'
                              : 'bg-gray-900/50 border-gray-800 hover:border-sky-500/50 text-gray-300'
                          }`}
                        >
                          <span className="text-[10px] text-gray-500 font-mono">PRV {i + 1}</span>
                          <kbd className="text-xs font-mono font-bold bg-black/45 px-1.5 py-0.5 rounded min-w-[20px]">
                            {isListening ? '...' : formatKeyName(key)}
                          </kbd>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Switcher Actions */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Switcher Actions</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {(['cut', 'auto'] as const).map((field) => {
                      const isListening = bindingField?.category === 'atem' && bindingField?.field === field;
                      const value = keyBindings.atem[field];
                      return (
                        <div
                          key={field}
                          className="flex items-center justify-between p-3 rounded-xl bg-gray-900/35 border border-gray-800"
                        >
                          <span className="text-xs text-gray-300 font-bold uppercase">{field} Transition</span>
                          <button
                            onClick={() => { playClick(); setBindingField({ category: 'atem', field }); }}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer min-w-[80px] text-center ${
                              isListening
                                ? 'bg-amber-500/20 border-amber-500 text-amber-400 ring-2 ring-amber-500/50'
                                : 'bg-gray-800/80 hover:bg-gray-800 hover:border-sky-500/50 text-sky-400'
                            }`}
                          >
                            {isListening ? 'Press key...' : formatKeyName(value)}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* PTZ Steering Section */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Camera Steering & Zoom</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {(['panLeft', 'panRight', 'tiltUp', 'tiltDown', 'zoomIn', 'zoomOut'] as const).map((field) => {
                      const isListening = bindingField?.category === 'ptz' && bindingField?.field === field;
                      const value = keyBindings.ptz[field];
                      const label = field.replace(/([A-Z])/g, ' $1');
                      return (
                        <div
                          key={field}
                          className="flex items-center justify-between p-3 rounded-xl bg-gray-900/35 border border-gray-800"
                        >
                          <span className="text-xs text-gray-300 font-bold capitalize">{label}</span>
                          <button
                            onClick={() => { playClick(); setBindingField({ category: 'ptz', field }); }}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer min-w-[80px] text-center ${
                              isListening
                                ? 'bg-amber-500/20 border-amber-500 text-amber-400 ring-2 ring-amber-500/50'
                                : 'bg-gray-800/80 hover:bg-gray-800 hover:border-cyan-500/50 text-cyan-400'
                            }`}
                          >
                            {isListening ? 'Press key...' : formatKeyName(value)}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* PTZ Camera Selection */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Camera Selection Keys</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {(['cam1', 'cam2', 'cam3'] as const).map((field, idx) => {
                      const isListening = bindingField?.category === 'ptz' && bindingField?.field === field;
                      const value = keyBindings.ptz[field];
                      return (
                        <div
                          key={field}
                          className="flex items-center justify-between p-3 rounded-xl bg-gray-900/35 border border-gray-800"
                        >
                          <span className="text-xs text-gray-300 font-bold uppercase">Cam {idx + 1}</span>
                          <button
                            onClick={() => { playClick(); setBindingField({ category: 'ptz', field }); }}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer min-w-[60px] text-center ${
                              isListening
                                ? 'bg-amber-500/20 border-amber-500 text-amber-400 ring-2 ring-amber-500/50'
                                : 'bg-gray-800/80 hover:bg-gray-800 hover:border-cyan-500/50 text-cyan-400'
                            }`}
                          >
                            {isListening ? 'Press key...' : formatKeyName(value)}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* PTZ Preset Modes */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Preset Action Modes</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {(['storePreset', 'callPreset'] as const).map((field) => {
                      const isListening = bindingField?.category === 'ptz' && bindingField?.field === field;
                      const value = keyBindings.ptz[field];
                      const label = field === 'storePreset' ? 'Store Mode Toggle' : 'Call Mode Toggle';
                      return (
                        <div
                          key={field}
                          className="flex items-center justify-between p-3 rounded-xl bg-gray-900/35 border border-gray-800"
                        >
                          <span className="text-xs text-gray-300 font-bold uppercase">{label}</span>
                          <button
                            onClick={() => { playClick(); setBindingField({ category: 'ptz', field }); }}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer min-w-[80px] text-center ${
                              isListening
                                ? 'bg-amber-500/20 border-amber-500 text-amber-400 ring-2 ring-amber-500/50'
                                : 'bg-gray-800/80 hover:bg-gray-800 hover:border-cyan-500/50 text-cyan-400'
                            }`}
                          >
                            {isListening ? 'Press key...' : formatKeyName(value)}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* PTZ Keypad Grid */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">PTZ Keypad Numbers (0-9)</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {keyBindings.ptz.keypad.map((key, i) => {
                      const isListening = bindingField?.category === 'ptz' && bindingField?.field === 'keypad' && bindingField?.index === i;
                      return (
                        <button
                          key={`keypad-${i}`}
                          onClick={() => { playClick(); setBindingField({ category: 'ptz', field: 'keypad', index: i }); }}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all cursor-pointer ${
                            isListening
                              ? 'bg-amber-500/20 border-amber-500 text-amber-400 ring-2 ring-amber-500/50'
                              : 'bg-gray-900/50 border-gray-800 hover:border-cyan-500/50 text-gray-300'
                          }`}
                        >
                          <span className="text-[10px] text-gray-500 font-mono">Button {i}</span>
                          <kbd className="text-xs font-mono font-bold bg-black/45 px-1.5 py-0.5 rounded min-w-[20px]">
                            {isListening ? '...' : formatKeyName(key)}
                          </kbd>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-gray-900 bg-gray-950 flex justify-between items-center">
            <button
              onClick={handleRestoreDefaults}
              className="px-4 py-2 bg-red-950/40 border border-red-900/40 hover:bg-red-900/50 text-red-300 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore Defaults
            </button>
            <button
              onClick={() => { playClick(); setBindingField(null); setIsSettingsOpen(false); }}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-black text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-[0.98]"
            >
              Save & Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a0f] text-gray-100 flex flex-col justify-between selection:bg-sky-500/30 selection:text-white">
      {/* Decorative background grid and glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(56,189,248,0.15),rgba(255,255,255,0))] pointer-events-none z-0"></div>

      {/* Main Header */}
      <header className="relative z-10 border-b border-gray-800/80 bg-gray-950/40 backdrop-blur py-5 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
                <Monitor className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#090a0f] led-pulse"></span>
            </div>
            <div>
              <h1 className="text-md font-bold tracking-wider text-white uppercase lcd-font">A/V Control Trainer</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => { playClick(); setIsSettingsOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-300 bg-gray-900 border border-gray-800 hover:border-sky-500/40 rounded-lg hover:text-white transition-all cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 animate-spin-slow" />
              SETTINGS
            </button>
            <span className="text-xs text-gray-400 font-mono bg-gray-900 border border-gray-850 px-2.5 py-1 rounded">
              VER: 2026.1
            </span>
          </div>
        </div>
      </header>

      {/* Main Body Dashboard */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 flex-grow flex flex-col justify-center w-full">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/30 border border-sky-800/30 text-sky-400 text-xs font-semibold mb-4 tracking-wide uppercase">
            <Award className="w-4 h-4" />
            Interactive Training Simulator
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none mb-4">
            Broadcast Production <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-400">Simulator</span>
          </h2>
          <p className="text-gray-400 text-sm md:text-base leading-relaxed">
            Gain hands-on operating experience with critical event hardware. Choose a training console below to begin guided workflows and scenarios.
          </p>
        </div>

        {/* Dashboard Cards Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full">
          
          {/* SWITCHER CARD */}
          <div
            onClick={() => handleNav('switcher')}
            className="group relative bg-gray-950/50 hover:bg-[#12141f] border border-gray-800 hover:border-sky-500/40 rounded-2xl p-8 shadow-xl cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-sky-500/5 hover:-translate-y-1 overflow-hidden"
          >
            {/* Corner colored accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-sky-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex flex-col h-full justify-between gap-6">
              <div className="flex flex-col gap-4">
                {/* Icon Box */}
                <div className="w-12 h-12 rounded-xl bg-sky-950/40 border border-sky-800/40 flex items-center justify-center text-sky-400 group-hover:bg-sky-500 group-hover:text-black transition-all duration-300">
                  <Monitor className="w-6 h-6" />
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-sky-400 transition-colors">
                    Video Switcher Console
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 font-mono">PRO SWITCHER SYSTEM</p>
                </div>

                <p className="text-gray-400 text-xs leading-relaxed">
                  Operate a 10-input SDI switcher setup. Practice camera selection, media players integration, transitions, and manual T-bar crossfades.
                </p>
              </div>

              {/* Feature Tags list */}
              <div className="border-t border-gray-900 pt-4">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2 font-mono">TRAINING AREAS:</span>
                <ul className="grid grid-cols-2 gap-2 text-[11px] text-gray-400">
                  <li className="flex items-center gap-1.5">• Program / Preview Buses</li>
                  <li className="flex items-center gap-1.5">• CUT & AUTO Transitions</li>
                  <li className="flex items-center gap-1.5">• Manual T-Bar Crossfades</li>
                  <li className="flex items-center gap-1.5 font-semibold">• Wipe split-screen transition</li>
                </ul>
              </div>

              <div className="flex justify-between items-center text-xs text-sky-400 font-bold group-hover:translate-x-1 transition-transform mt-2">
                <span>ENTER CONSOLE SWITCHER</span>
                <span className="text-lg">→</span>
              </div>
            </div>
          </div>

          {/* PTZ CAMERA CARD */}
          <div
            onClick={() => handleNav('ptz')}
            className="group relative bg-gray-950/50 hover:bg-[#12141f] border border-gray-800 hover:border-cyan-500/40 rounded-2xl p-8 shadow-xl cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/5 hover:-translate-y-1 overflow-hidden"
          >
            {/* Corner colored accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

            <div className="flex flex-col h-full justify-between gap-6">
              <div className="flex flex-col gap-4">
                {/* Icon Box */}
                <div className="w-12 h-12 rounded-xl bg-cyan-950/40 border border-cyan-800/40 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-black transition-all duration-300">
                  <Camera className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                    PTZ Camera Control Keyboard
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 font-mono">HARDWARE CONTROLLER</p>
                </div>

                <p className="text-gray-400 text-xs leading-relaxed">
                  Steer virtual remote cameras using an active analog joystick. Control pan, tilt, zoom rocker speed, focus settings, and color temperature.
                </p>
              </div>

              {/* Feature Tags list */}
              <div className="border-t border-gray-900 pt-4">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2 font-mono">TRAINING AREAS:</span>
                <ul className="grid grid-cols-2 gap-2 text-[11px] text-gray-400">
                  <li className="flex items-center gap-1.5">• Tri-Camera select (F1-F3)</li>
                  <li className="flex items-center gap-1.5">• Joystick Steer & Zoom</li>
                  <li className="flex items-center gap-1.5">• Manual Iris & Focus Knobs</li>
                  <li className="flex items-center gap-1.5 text-cyan-400 font-semibold">• Sensor White Balance (Appx A)</li>
                </ul>
              </div>

              <div className="flex justify-between items-center text-xs text-cyan-400 font-bold group-hover:translate-x-1 transition-transform mt-2">
                <span>ENTER PTZ CONTROLLER</span>
                <span className="text-lg">→</span>
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* Footer Info */}
      <footer className="relative z-10 border-t border-gray-900 bg-gray-950/20 py-4 px-6 text-center text-[10px] text-gray-600 font-mono tracking-wide uppercase">
        © 2026 Audio/Video Guidelines Reference CO-160a
      </footer>

      {isSettingsOpen && renderSettingsModal()}
    </div>
  );
}

export default App;
