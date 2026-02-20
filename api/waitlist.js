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

  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Vul een geldig e-mailadres in.' });
  }

  try {
    // Opslaan in Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/stekfinder_waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ email, source: 'credits_empty' }),
    });

    if (response.status === 409 || response.status === 400) {
      // Duplicate email
      return res.status(200).json({ message: 'Je staat al op de lijst!' });
    }

    if (!response.ok) {
      const err = await response.text();
      // Check for unique violation
      if (err.includes('duplicate') || err.includes('unique')) {
        return res.status(200).json({ message: 'Je staat al op de lijst!' });
      }
      throw new Error(err);
    }

    // Telegram notificatie
    await sendTelegram(
      `🎣 <b>Nieuwe StekFinder aanmelding!</b>\n\n` +
      `📧 ${email}\n` +
      `⏰ ${new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}`
    );

    return res.status(200).json({ message: 'Je bent aangemeld! We sturen je binnenkort een uitnodiging.' });
  } catch (error) {
    console.error('Waitlist error:', error);
    return res.status(500).json({ error: 'Er ging iets mis. Probeer het later opnieuw.' });
  }
}
