import { generateContent, generateWeekContent, CONTENT_TYPES } from '../lib/content-engine.js';

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

function checkAuth(req) {
  const pw = process.env.ADMIN_PASSWORD;
  const auth = req.headers.authorization?.replace('Bearer ', '');
  return auth === pw;
}

export default async function handler(req, res) {
  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Niet geautoriseerd' });
  }

  // ── GET: Lijst posts + stats + config ──
  if (req.method === 'GET') {
    try {
      const [postsRes, configRes] = await Promise.all([
        supaFetch('stekfinder_autopilot_posts?order=scheduled_for.asc.nullsfirst&limit=100'),
        supaFetch('stekfinder_social_config?id=eq.default'),
      ]);

      const posts = await postsRes.json();
      const config = (await configRes.json())?.[0] || {};

      // Stats
      const stats = {
        queued: posts.filter(p => p.status === 'queued').length,
        approved: posts.filter(p => p.status === 'approved').length,
        posted: posts.filter(p => p.status === 'posted').length,
        failed: posts.filter(p => p.status === 'failed').length,
        total: posts.length,
        thisWeek: posts.filter(p => {
          if (!p.scheduled_for) return false;
          const d = new Date(p.scheduled_for);
          const now = new Date();
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay() + 1);
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 7);
          return d >= weekStart && d < weekEnd;
        }).length,
        nextScheduled: posts.find(p => p.status === 'approved' && p.scheduled_for)?.scheduled_for || null,
      };

      // Platform status
      const platforms = {
        facebook: !!config.facebook_page_id && !!config.facebook_access_token,
        instagram: !!config.instagram_account_id && !!config.facebook_access_token,
        autoApprove: !!config.auto_approve,
        postingEnabled: !!config.posting_enabled,
      };

      return res.status(200).json({
        posts,
        stats,
        platforms,
        contentTypes: CONTENT_TYPES,
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── POST: Genereer content ──
  if (req.method === 'POST') {
    const { action, type, customPrompt } = req.body;

    try {
      if (action === 'generate_week') {
        // Genereer een hele week content
        const posts = await generateWeekContent({
          apiKey: process.env.OPENAI_API_KEY,
        });

        // Check auto-approve
        const configRes = await supaFetch('stekfinder_social_config?id=eq.default');
        const config = (await configRes.json())?.[0] || {};

        // Opslaan in database
        const toInsert = posts.map(p => ({
          ...p,
          status: config.auto_approve ? 'approved' : 'queued',
        }));

        const insertRes = await supaFetch('stekfinder_autopilot_posts', {
          method: 'POST',
          body: JSON.stringify(toInsert),
        });

        if (!insertRes.ok) {
          const err = await insertRes.text();
          throw new Error(`DB insert failed: ${err}`);
        }

        const inserted = await insertRes.json();
        return res.status(200).json({ generated: inserted.length, posts: inserted });

      } else if (action === 'generate_single') {
        // Genereer één post
        const content = await generateContent({
          type: type || 'vistip',
          apiKey: process.env.OPENAI_API_KEY,
          customPrompt,
        });

        // Schedule voor morgen 9:00
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);

        const configRes = await supaFetch('stekfinder_social_config?id=eq.default');
        const config = (await configRes.json())?.[0] || {};

        const insertRes = await supaFetch('stekfinder_autopilot_posts', {
          method: 'POST',
          body: JSON.stringify({
            ...content,
            platform: 'both',
            status: config.auto_approve ? 'approved' : 'queued',
            scheduled_for: tomorrow.toISOString(),
          }),
        });

        if (!insertRes.ok) {
          const err = await insertRes.text();
          throw new Error(`DB insert failed: ${err}`);
        }

        const inserted = await insertRes.json();
        return res.status(200).json({ post: inserted[0] });
      }

      return res.status(400).json({ error: 'Ongeldige actie' });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── PATCH: Update post (approve, edit, reschedule, delete) ──
  if (req.method === 'PATCH') {
    const { id, action, updates } = req.body;

    if (!id) return res.status(400).json({ error: 'Post ID is verplicht' });

    try {
      let updateData = {};

      switch (action) {
        case 'approve':
          updateData = { status: 'approved' };
          break;
        case 'approve_all':
          // Approve all queued posts
          const approveRes = await supaFetch('stekfinder_autopilot_posts?status=eq.queued', {
            method: 'PATCH',
            body: JSON.stringify({ status: 'approved' }),
          });
          return res.status(200).json({ ok: true });
        case 'reject':
          updateData = { status: 'queued' };
          break;
        case 'delete':
          const delRes = await supaFetch(`stekfinder_autopilot_posts?id=eq.${id}`, {
            method: 'DELETE',
          });
          return res.status(200).json({ ok: true });
        case 'edit':
          updateData = {
            ...(updates.text_content && { text_content: updates.text_content }),
            ...(updates.hashtags && { hashtags: updates.hashtags }),
            ...(updates.scheduled_for && { scheduled_for: updates.scheduled_for }),
            ...(updates.platform && { platform: updates.platform }),
            ...(updates.image_url && { image_url: updates.image_url }),
          };
          break;
        case 'reschedule':
          updateData = { scheduled_for: updates.scheduled_for };
          break;
        default:
          return res.status(400).json({ error: 'Ongeldige actie' });
      }

      const patchRes = await supaFetch(`stekfinder_autopilot_posts?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── PUT: Update social config ──
  if (req.method === 'PUT') {
    const { facebook_page_id, facebook_access_token, instagram_account_id, auto_approve, posting_enabled } = req.body;

    try {
      const updateData = {
        updated_at: new Date().toISOString(),
      };
      if (facebook_page_id !== undefined) updateData.facebook_page_id = facebook_page_id;
      if (facebook_access_token !== undefined) updateData.facebook_access_token = facebook_access_token;
      if (instagram_account_id !== undefined) updateData.instagram_account_id = instagram_account_id;
      if (auto_approve !== undefined) updateData.auto_approve = auto_approve;
      if (posting_enabled !== undefined) updateData.posting_enabled = posting_enabled;

      await supaFetch('stekfinder_social_config?id=eq.default', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
