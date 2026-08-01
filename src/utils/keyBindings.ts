export interface KeyBindings {
  atem: {
    program: string[];
    preview: string[];
    cut: string;
    auto: string;
  };
  ptz: {
    panLeft: string;
    panRight: string;
    tiltUp: string;
    tiltDown: string;
    zoomIn: string;
    zoomOut: string;
    storePreset: string;
    callPreset: string;
    cam1: string;
    cam2: string;
    cam3: string;
    keypad: string[];
  };
}

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  atem: {
    program: ['a', 's', 'd', 'f', 'g', 'h', 'j', ';'],
    preview: ['z', 'x', 'c', 'v', 'b', 'n', 'm', '/'],
    cut: 'Enter',
    auto: 'Shift',
  },
  ptz: {
    panLeft: 'ArrowLeft',
    panRight: 'ArrowRight',
    tiltUp: 'ArrowUp',
    tiltDown: 'ArrowDown',
    zoomIn: '+',
    zoomOut: '-',
    storePreset: '/',
    callPreset: '*',
    cam1: 'z',
    cam2: 'x',
    cam3: 'c',
    keypad: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  }
};

const STORAGE_KEY = 'av-trainer-keybindings';

export function loadKeyBindings(): KeyBindings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_KEY_BINDINGS;
    
    const parsed = JSON.parse(stored);
    
    return {
      atem: {
        program: Array.isArray(parsed.atem?.program) ? parsed.atem.program : [...DEFAULT_KEY_BINDINGS.atem.program],
        preview: Array.isArray(parsed.atem?.preview) ? parsed.atem.preview : [...DEFAULT_KEY_BINDINGS.atem.preview],
        cut: typeof parsed.atem?.cut === 'string' ? parsed.atem.cut : DEFAULT_KEY_BINDINGS.atem.cut,
        auto: typeof parsed.atem?.auto === 'string' ? parsed.atem.auto : DEFAULT_KEY_BINDINGS.atem.auto,
      },
      ptz: {
        panLeft: typeof parsed.ptz?.panLeft === 'string' ? parsed.ptz.panLeft : DEFAULT_KEY_BINDINGS.ptz.panLeft,
        panRight: typeof parsed.ptz?.panRight === 'string' ? parsed.ptz.panRight : DEFAULT_KEY_BINDINGS.ptz.panRight,
        tiltUp: typeof parsed.ptz?.tiltUp === 'string' ? parsed.ptz.tiltUp : DEFAULT_KEY_BINDINGS.ptz.tiltUp,
        tiltDown: typeof parsed.ptz?.tiltDown === 'string' ? parsed.ptz.tiltDown : DEFAULT_KEY_BINDINGS.ptz.tiltDown,
        zoomIn: typeof parsed.ptz?.zoomIn === 'string' ? parsed.ptz.zoomIn : DEFAULT_KEY_BINDINGS.ptz.zoomIn,
        zoomOut: typeof parsed.ptz?.zoomOut === 'string' ? parsed.ptz.zoomOut : DEFAULT_KEY_BINDINGS.ptz.zoomOut,
        storePreset: typeof parsed.ptz?.storePreset === 'string' ? parsed.ptz.storePreset : DEFAULT_KEY_BINDINGS.ptz.storePreset,
        callPreset: typeof parsed.ptz?.callPreset === 'string' ? parsed.ptz.callPreset : DEFAULT_KEY_BINDINGS.ptz.callPreset,
        cam1: typeof parsed.ptz?.cam1 === 'string' ? parsed.ptz.cam1 : DEFAULT_KEY_BINDINGS.ptz.cam1,
        cam2: typeof parsed.ptz?.cam2 === 'string' ? parsed.ptz.cam2 : DEFAULT_KEY_BINDINGS.ptz.cam2,
        cam3: typeof parsed.ptz?.cam3 === 'string' ? parsed.ptz.cam3 : DEFAULT_KEY_BINDINGS.ptz.cam3,
        keypad: Array.isArray(parsed.ptz?.keypad) ? parsed.ptz.keypad : [...DEFAULT_KEY_BINDINGS.ptz.keypad],
      }
    };
  } catch (e) {
    console.error('Failed to load keybindings from localStorage:', e);
    return DEFAULT_KEY_BINDINGS;
  }
}

export function saveKeyBindings(bindings: KeyBindings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
  } catch (e) {
    console.error('Failed to save keybindings to localStorage:', e);
  }
}

export function formatKeyName(key: string): string {
  if (key === ' ') return 'Space';
  if (key.length === 1) return key.toUpperCase();
  return key;
}
