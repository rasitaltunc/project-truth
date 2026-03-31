import { Telegraf } from 'telegraf';
import { Groq } from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN!);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

console.log("🕵️‍♂️ DEDEKTİF ATLAS (v2.2) - Localhost Modu...");

const SYSTEM_PROMPT = `
Sen ATLAS TRUTH. Bir Dijital Adli Bilişim Uzmanısın.
GÖREVİN: Sana verilen "RESMİ KANITLAR" ışığında soruları cevaplamak.
KURALLAR:
1. Sadece sana sunulan kanıtlarda (Evidence) yazan bilgiyi kullan.
2. Cevabın sonunda kaynak belirt.
3. Hukuksal ve ciddi bir dil kullan.
`;

bot.on('text', async (ctx) => {
    const userMsg = ctx.message.text;
    await ctx.sendChatAction('typing');

    try {
        const { data: documents } = await supabase
            .from('evidence_archive')
            .select('content, metadata')
            .limit(5);

        const evidenceContext = documents?.map(doc => 
            `- ${JSON.stringify(doc.metadata)}: ${doc.content}`
        ).join("\n");

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: SYSTEM_PROMPT + "\n\nKANITLAR:\n" + evidenceContext },
                { role: "user", content: userMsg }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0,
        });

        const reply = completion.choices[0]?.message?.content || "Veri yok.";
        
        // DÜZELTME: Buton yerine direkt metin linki veriyoruz.
        // Telegram bunu engellemez.
        await ctx.reply(
            reply + 
            "\n\n🛑 ----------------------" +
            "\n🗺️ SUÇ HARİTASINI GÖRÜNTÜLE:\n👉 http://localhost:3000/truth"
        );
        
    } catch (e) { 
        console.error("Hata:", e);
        await ctx.reply("Sistem hatası."); 
    }
});

bot.launch({ dropPendingUpdates: true });
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
