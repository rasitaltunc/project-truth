import { Telegraf } from 'telegraf';
import { Groq } from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN as string);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

console.log("🦁 ATLAS BAŞLATILIYOR...");

// Hafıza Fonksiyonu
async function getContext() {
    try {
        const { data } = await supabase.from('system_logs').select('details, agent_name').order('created_at', { ascending: false }).limit(5);
        if (!data) return [];
        return data.reverse().map(log => ({
            role: log.agent_name === 'ATLAS' ? 'assistant' : 'user',
            content: log.details || ""
        }));
    } catch (e) { return []; }
}

async function log(action: string, msg: string, agent: string) {
    try { await supabase.from('system_logs').insert({ action, details: msg, agent_name: agent }); } catch (e) {}
}

bot.on('text', async (ctx) => {
    const msg = ctx.message.text;
    console.log("📩 Mesaj:", msg);
    
    const history = await getContext();
    await log('GİRDİ', msg, 'PATRON');

    try {
        const chat = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "Sen ATLAS'sın. Kullanıcının adı Raşit ise ona İSMİYLE hitap et. Yoksa Patron de." },
                ...history as any,
                { role: "user", content: msg }
            ],
            model: "llama-3.3-70b-versatile"
        });
        const reply = chat.choices[0].message.content || "Anlaşıldı.";
        await ctx.reply(reply);
        await log('CEVAP', reply, 'ATLAS');
        console.log("📡 Cevap:", reply);
    } catch (e) { console.error(e); }
});

bot.launch({ dropPendingUpdates: true }).then(() => console.log("✅ ATLAS HAZIR! (Telegram'a git)"));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
