'use client';

/**
 * AIDisclaimer — AI Sınırlılık Bildirimi
 *
 * Legal Fortress (Sprint 18) gereksinimi:
 * "Add AI limitations disclosure (accuracy, scope, bias, rights)"
 *
 * GDPR + EU AI Act uyumu: Kullanıcı, AI çıktılarının sınırlamalarını bilmeli.
 *
 * Bu bileşen:
 * - Soruşturma panelinin altında, her zaman görünür mini banner
 * - Tıklanınca detaylı açıklama açılır
 * - Çok katmanlı bilgi (doğruluk, kapsam, önyargı, haklar)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ChevronDown, ChevronUp, Shield, AlertTriangle, Scale, Eye } from 'lucide-react';

const DISCLAIMER_SECTIONS = [
  {
    icon: <AlertTriangle size={10} />,
    title: 'DOĞRULUK',
    titleEn: 'ACCURACY',
    content: 'AI çıkarımları %100 doğru değildir. Her veri en az 2 bağımsız inceleme geçmeden ağa eklenmez. Halüsinasyon (AI\'ın uydurması) oranı sürekli izlenir.',
    contentEn: 'AI extractions are not 100% accurate. No data enters the network without at least 2 independent reviews. Hallucination rates are continuously monitored.',
  },
  {
    icon: <Eye size={10} />,
    title: 'KAPSAM',
    titleEn: 'SCOPE',
    content: 'Platform yalnızca kamusal kaynaklardan elde edilen verileri işler. Orijinal belgeler barındırılmaz — sadece çıkarılmış metin, ilişkiler ve kaynak referansları saklanır.',
    contentEn: 'The platform processes only publicly available data. Original documents are not hosted — only extracted text, relationships, and source references are stored.',
  },
  {
    icon: <Scale size={10} />,
    title: 'ÖNYARGI',
    titleEn: 'BIAS',
    content: '3 katmanlı anti-bias inceleme sistemi uygulanır: kör inceleme → AI karşılaştırma → kaynak doğrulama. Honeypot görevleri dikkat kalitesini ölçer.',
    contentEn: '3-layer anti-bias review system is applied: blind review → AI comparison → source verification. Honeypot tasks measure attention quality.',
  },
  {
    icon: <Shield size={10} />,
    title: 'HAKLARIN',
    titleEn: 'YOUR RIGHTS',
    content: 'Her kullanıcı itiraz hakkına sahiptir. Yanlış veri gördüğünde "Hata Raporla" butonunu kullan. Tüm itirazlar kamuya açıktır ve bağımsız incelemeye tabi tutulur.',
    contentEn: 'Every user has the right to dispute. Use the "Report Error" button when you see incorrect data. All disputes are public and subject to independent review.',
  },
];

export default function AIDisclaimer() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-3">
      {/* Mini Banner — always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded transition-colors"
        style={{
          background: 'rgba(99,102,241,0.04)',
          border: '1px solid rgba(99,102,241,0.08)',
        }}
      >
        <div className="flex items-center gap-1.5">
          <Info size={9} className="text-indigo-500" />
          <span className="text-[8px] font-mono text-indigo-400 tracking-wider uppercase">
            AI SINIRLILIK BİLDİRİMİ
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp size={10} className="text-indigo-500" />
        ) : (
          <ChevronDown size={10} className="text-indigo-500" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="mt-1 px-3 py-2.5 rounded-lg flex flex-col gap-2"
              style={{
                background: 'rgba(99,102,241,0.03)',
                border: '1px solid rgba(99,102,241,0.06)',
              }}
            >
              {DISCLAIMER_SECTIONS.map((section, i) => (
                <motion.div
                  key={section.titleEn}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-2"
                >
                  <div className="text-indigo-500 mt-0.5 flex-shrink-0">{section.icon}</div>
                  <div>
                    <div className="text-[8px] font-mono font-bold text-indigo-400 tracking-wider mb-0.5">
                      {section.title}
                    </div>
                    <div className="text-[9px] text-neutral-500 leading-relaxed">
                      {section.content}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Legal note */}
              <div
                className="mt-1 pt-2 text-[8px] text-neutral-700 font-mono leading-relaxed"
                style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
              >
                Bu platform bir yayıncı değil, kamusal kaynaklara işaret eden bir arama motorudur.
                AI karar verici değil yardımcı araçtır. Tüm veriler topluluk doğrulamasından geçer.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
