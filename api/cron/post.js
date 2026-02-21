// Cron: Post approved content — runs daily 9:00 AM UTC
import { postToSocial } from '../lib/social.js';

const SUPABASE_URL = 'https://vwqwpfimljkgycdhblwx.supabase.co';

function supaFetch(path, options = {}) {
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': options.method === 'POST' ? 'return=representation' : 'return=minimal',
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
    // Get social config
    const configRes = await supaFetch('stekfinder_social_config?id=eq.default');
    const config = (await configRes.json())?.[0] || {};

    if (!config.posting_enabled) {
      return res.status(200).json({ ok: true, message: 'Posting is uitgeschakeld', posted: 0 });
    }

    // Get approved posts scheduled for today or earlier
    const now = new Date().toISOString();
    const postsRes = await supaFetch(
      `stekfinder_autopilot_posts?status=eq.approved&scheduled_for=lte.${now}&order=scheduled_for.asc&limit=5`
    );
    const posts = await postsRes.json();

    if (!posts || posts.length === 0) {
      return res.status(200).json({ ok: true, message: 'Geen posts gepland', posted: 0 });
    }

    let postedCount = 0;
    const results = [];

    for (const post of posts) {
      try {
        // Build full post text with hashtags
        const fullText = post.hashtags?.length
          ? `${post.text_content}\n\n${post.hashtags.join(' ')}`
          : post.text_content;

        const result = await postToSocial({
          config,
          text: fullText,
          imageUrl: post.image_url || null,
          platform: post.platform,
        });

        // Update post status
        const metaId = result.facebook || result.instagram || null;
        await supaFetch(`stekfinder_autopilot_posts?id=eq.${post.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: result.errors.length > 0 && !metaId ? 'failed' : 'posted',
            posted_at: new Date().toISOString(),
            meta_post_id: metaId,
            error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
          }),
        });

        postedCount++;
        results.push({ id: post.id, type: post.content_type, result });
      } catch (e) {
        // Mark as failed
        await supaFetch(`stekfinder_autopilot_posts?id=eq.${post.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'failed',
            error_message: e.message,
          }),
        });
        results.push({ id: post.id, type: post.content_type, error: e.message });
      }

      // Rate limiting between posts
      await new Promise(r => setTimeout(r, 2000));
    }

    // Telegram summary
    await sendTelegram(
      `📤 <b>Autopilot: ${postedCount}/${posts.length} posts geplaatst!</b>\n\n` +
      results.map(r =>
        r.error
          ? `❌ ${r.type}: ${r.error}`
          : `✅ ${r.type}: geplaatst`
      ).join('\n')
    );

    return res.status(200).json({ ok: true, posted: postedCount, results });
  } catch (e) {
    console.error('Cron post error:', e);
    await sendTelegram(`❌ <b>Autopilot post fout:</b> ${e.message}`);
    return res.status(500).json({ error: e.message });
  }
}
