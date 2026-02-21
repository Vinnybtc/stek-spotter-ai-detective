// Cron: Generate a week of content — runs Monday 6:00 AM UTC
import { generateWeekContent } from '../lib/content-engine.js';

const SUPABASE_URL = 'https://vwqwpfimljkgycdhblwx.supabase.co';

function supaFetch(path, options = {}) {
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options.headers,
    },
  });
}

async function sendTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
    }),
  }).catch(() => {});
}

export default async function handler(req, res) {
  // Verify cron secret
  const cronSecret = req.headers.authorization?.replace('Bearer ', '');
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Check auto-approve setting
    const configRes = await supaFetch('stekfinder_social_config?id=eq.default');
    const config = (await configRes.json())?.[0] || {};

    // Generate week of content
    const posts = await generateWeekContent({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Save to database
    const toInsert = posts.map(p => ({
      ...p,
      status: config.auto_approve ? 'approved' : 'queued',
    }));

    const insertRes = await supaFetch('stekfinder_autopilot_posts', {
      method: 'POST',
      body: JSON.stringify(toInsert),
    });

    if (!insertRes.ok) {
      throw new Error(`DB insert failed: ${await insertRes.text()}`);
    }

    const inserted = await insertRes.json();

    // Telegram notification
    const statusText = config.auto_approve ? 'auto-approved' : 'wachten op goedkeuring';
    await sendTelegram(
      `📅 <b>Autopilot: ${inserted.length} posts gegenereerd!</b>\n\n` +
      `Status: ${statusText}\n` +
      inserted.map((p, i) => `${i + 1}. ${p.content_type} — ${p.text_content.substring(0, 50)}...`).join('\n')
    );

    return res.status(200).json({ ok: true, generated: inserted.length });
  } catch (e) {
    console.error('Cron generate error:', e);
    await sendTelegram(`❌ <b>Autopilot fout:</b> ${e.message}`);
    return res.status(500).json({ error: e.message });
  }
}
