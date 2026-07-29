import { useEffect, useRef } from 'react';

export function useAudio() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const motorOscRef = useRef<OscillatorNode | null>(null);
  const motorGainRef = useRef<GainNode | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playClick = () => {
    try {
      initAudio();
      const ctx = audioCtxRef.current!;
      
      // Short click sound (high pass filtered impulse)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {
      console.warn("Audio failed", e);
    }
  };

  const playBeep = () => {
    try {
      initAudio();
      const ctx = audioCtxRef.current!;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch (e) {
      console.warn("Audio failed", e);
    }
  };

  const playSuccess = () => {
    try {
      initAudio();
      const ctx = audioCtxRef.current!;
      const t = ctx.currentTime;
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.1, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      playTone(523.25, t, 0.15); // C5
      playTone(659.25, t + 0.12, 0.15); // E5
      playTone(783.99, t + 0.24, 0.15); // G5
      playTone(1046.50, t + 0.36, 0.4); // C6
    } catch (e) {
      console.warn("Audio failed", e);
    }
  };

  // Motor zoom hum
  const startMotorHum = (speed: number) => {
    try {
      initAudio();
      const ctx = audioCtxRef.current!;
      
      if (!motorOscRef.current) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sawtooth';
        // Low pass filter to make it sound like a hum
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(150, ctx.currentTime);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        
        motorOscRef.current = osc;
        motorGainRef.current = gain;
      }
      
      if (motorOscRef.current && motorGainRef.current) {
        const frequency = 60 + Math.abs(speed) * 80;
        const volume = Math.min(0.04, Math.abs(speed) * 0.04);
        
        motorOscRef.current.frequency.setTargetAtTime(frequency, ctx.currentTime, 0.05);
        motorGainRef.current.gain.setTargetAtTime(volume, ctx.currentTime, 0.05);
      }
    } catch (e) {
      console.warn("Audio failed", e);
    }
  };

  const stopMotorHum = () => {
    try {
      if (motorOscRef.current && motorGainRef.current) {
        const ctx = audioCtxRef.current!;
        motorGainRef.current.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        
        const osc = motorOscRef.current;
        setTimeout(() => {
          try {
            osc.stop();
          } catch(e){}
        }, 100);
        
        motorOscRef.current = null;
        motorGainRef.current = null;
      }
    } catch (e) {
      console.warn("Audio failed", e);
    }
  };

  useEffect(() => {
    return () => {
      if (motorOscRef.current) {
        try {
          motorOscRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  return {
    playClick,
    playBeep,
    playSuccess,
    startMotorHum,
    stopMotorHum,
  };
}
