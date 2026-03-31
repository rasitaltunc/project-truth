import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WebApp from '@twa-dev/sdk';
import { 
  Terminal, 
  Shield, 
  Code2, 
  ScrollText, 
  Activity 
} from 'lucide-react';

// --- TİP TANIMLARI ---
type SystemMode = 'idle' | 'wizard' | 'hacker';

interface ModeConfig {
  name: string;
  color: string;
  bg: string;
  icon: any;
  message: string;
}

// --- MOD AYARLARI ---
const MODES: Record<SystemMode, ModeConfig> = {
  idle: {
    name: "Sovereign OS",
    color: "#3b82f6", // Mavi
    bg: "#0f172a",
    icon: Shield,
    message: "Sistem Stabil. Emir bekleniyor..."
  },
  wizard: {
    name: "Arcane Archives",
    color: "#d4af37", // Altın
    bg: "#2a1b12",
    icon: ScrollText,
    message: "Kadim parşömenler taranıyor..."
  },
  hacker: {
    name: "Netrunner Uplink",
    color: "#00ff41", // Yeşil
    bg: "#000000",
    icon: Terminal,
    message: "Güvenlik protokolleri kırılıyor..."
  }
};

function App() {
  const [mode, setMode] = useState<SystemMode>('idle');

  // Telegram Tema Entegrasyonu
  useEffect(() => {
    const config = MODES[mode];
    document.documentElement.style.setProperty('--primary', config.color);
    document.documentElement.style.setProperty('--bg', config.bg);
    
    // TypeScript hatasını susturmak için 'as any' kullanıyoruz
    if (WebApp.initData) {
      WebApp.setHeaderColor(config.bg as any);
      WebApp.setBackgroundColor(config.bg as any);
    }
  }, [mode]);

  const currentConfig = MODES[mode];
  const Icon = currentConfig.icon;

  return (
    <div 
      className="min-h-screen w-full relative overflow-hidden font-sovereign transition-colors duration-700 flex flex-col"
      style={{ backgroundColor: currentConfig.bg, color: currentConfig.color }}
    >
      {/* --- ARKA PLAN EFEKTLERİ --- */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>
      
      {/* Işık Hüzmesi */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-64 bg-gradient-to-b from-current to-transparent opacity-10 blur-3xl"></div>

      {/* --- KOKPİT ÜST PANEL (HEADER) --- */}
      <header className="relative z-10 p-6 flex justify-between items-center border-b border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 animate-pulse" />
          <span className="text-xs tracking-[0.2em] font-bold uppercase opacity-80">
            AI-OS v1.4
          </span>
        </div>
        <div className="text-xs opacity-50 font-mono">
          CPU: 12% | RAM: 404MB
        </div>
      </header>

      {/* --- ANA GÖRÜNTÜ ALANI (MAIN VIZ) --- */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center p-8">
        
        {/* Karakter Yeri Tutucu (Buraya Rive Gelecek) */}
        <div className="relative w-64 h-64 flex items-center justify-center mb-12">
          {/* Dönen Çemberler */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-2 border-dashed border-current opacity-20 rounded-full"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute inset-4 border border-current opacity-40 rounded-full"
          />
          
          {/* Ortadaki İkon (Avatar Yerine) */}
          <AnimatePresence mode='wait'>
            <motion.div
              key={mode}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Icon className="w-24 h-24 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Durum Mesajı (Typewriter Etkisi) */}
        <div className="h-12 flex items-center justify-center">
          <AnimatePresence mode='wait'>
            <motion.p 
              key={mode}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="text-lg font-mono tracking-wide text-center bg-white/5 px-4 py-2 rounded border border-white/10"
            >
              {'>'} {currentConfig.message}<span className="animate-pulse">_</span>
            </motion.p>
          </AnimatePresence>
        </div>
      </main>

      {/* --- KONTROL PANELİ (FOOTER) --- */}
      <footer className="relative z-10 p-6 pb-12 bg-gradient-to-t from-black/50 to-transparent">
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
          
          <button 
            onClick={() => setMode('idle')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${mode === 'idle' ? 'bg-white/10 border-current shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-white/5 opacity-50 hover:opacity-100'}`}
          >
            <Shield className="w-6 h-6" />
            <span className="text-[10px] uppercase tracking-wider">Demir</span>
          </button>

          <button 
            onClick={() => setMode('wizard')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${mode === 'wizard' ? 'bg-white/10 border-current shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'border-white/5 opacity-50 hover:opacity-100'}`}
          >
            <ScrollText className="w-6 h-6" />
            <span className="text-[10px] uppercase tracking-wider">Büyücü</span>
          </button>

          <button 
            onClick={() => setMode('hacker')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${mode === 'hacker' ? 'bg-white/10 border-current shadow-[0_0_15px_rgba(0,255,65,0.3)]' : 'border-white/5 opacity-50 hover:opacity-100'}`}
          >
            <Code2 className="w-6 h-6" />
            <span className="text-[10px] uppercase tracking-wider">Hacker</span>
          </button>

        </div>
      </footer>

    </div>
  );
}

export default App;
