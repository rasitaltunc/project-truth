'use client';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Shield, Cpu } from 'lucide-react';

export default function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [logs, setLogs] = useState<string[]>([]);
  const messages = ["KERNEL v2.0 STARTING...", "CONNECTION: SECURE", "NEURAL NETWORKS: ACTIVE", "COCKPIT PREPARING..."];

  useEffect(() => {
    messages.forEach((msg, i) => setTimeout(() => setLogs(p => [...p, msg]), i * 800));
    setTimeout(onComplete, messages.length * 800 + 1000);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-[#dc2626] font-mono relative overflow-hidden">
      <motion.div
        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1, rotate: 360 }} transition={{ duration: 1.5 }}
        className="relative mb-8"
      >
        <div className="absolute inset-0 bg-[#dc2626] blur-3xl opacity-20"></div>
        <Shield className="w-32 h-32 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]" />
      </motion.div>
      <div className="w-96 p-4 border-l-4 border-[#dc2626] bg-[#0a0a0a]/80 rounded text-xs">
        {logs.map((log, i) => <motion.div key={i} initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} className="mb-1">❯ {log}</motion.div>)}
      </div>
    </div>
  );
}
