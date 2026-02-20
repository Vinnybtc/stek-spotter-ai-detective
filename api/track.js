const SUPABASE_URL = 'https://vwqwpfimljkgycdhblwx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

async function sendTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
  } catch (e) {
    console.error('Telegram error:', e);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { event, data } = req.body;

  if (!event) {
    return res.status(400).json({ error: 'Event is verplicht.' });
  }

  try {
    // Opslaan in Supabase
    await fetch(`${SUPABASE_URL}/rest/v1/stekfinder_analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ event, data: data || {} }),
    });

    // Telegram notificatie bij analyse
    if (event === 'analysis_complete' && data) {
      let msg = `🔍 <b>Nieuwe analyse op StekFinder!</b>\n\n` +
        `📍 ${data.location || 'Onbekend'}\n` +
        `📊 ${data.confidence || 0}% zekerheid\n` +
        `🏷️ Bron: ${data.source || 'ai'}\n` +
        `⏰ ${new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}`;
      if (data.photoUrl) {
        msg += `\n📸 <a href="${data.photoUrl}">Bekijk foto</a>`;
      }
      await sendTelegram(msg);
    }

    if (event === 'feedback' && data) {
      await sendTelegram(
        `${data.type === 'up' ? '👍' : '👎'} <b>Feedback ontvangen</b>\n\n` +
        `📍 ${data.location || 'Onbekend'}\n` +
        `${data.type === 'down' ? '💰 Credit teruggegeven' : '✅ Correcte analyse!'}`
      );
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Track error:', error);
    return res.status(200).json({ ok: true }); // nooit de gebruiker blokkeren
  }
}
