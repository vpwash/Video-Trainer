import { useState } from 'react';
import AtemTrainer from './components/AtemTrainer';
import PtzTrainer from './components/PtzTrainer';
import { useAudio } from './hooks/useAudio';
import { Monitor, Camera, Award } from 'lucide-react';

type ActivePage = 'home' | 'switcher' | 'ptz';

function App() {
  const [page, setPage] = useState<ActivePage>('home');
  const { playClick } = useAudio();

  const handleNav = (target: ActivePage) => {
    playClick();
    setPage(target);
  };

  if (page === 'switcher') {
    return (
      <div className="min-h-screen bg-[#090a0f] text-gray-100 flex flex-col py-6">
        <AtemTrainer onBackToHome={() => handleNav('home')} />
      </div>
    );
  }

  if (page === 'ptz') {
    return (
      <div className="min-h-screen bg-[#090a0f] text-gray-100 flex flex-col py-6">
        <PtzTrainer onBackToHome={() => handleNav('home')} />
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
    </div>
  );
}

export default App;
