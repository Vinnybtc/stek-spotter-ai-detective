const SUPABASE_URL = 'https://vwqwpfimljkgycdhblwx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple auth met admin password
  const auth = req.headers.authorization;
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminPass || auth !== `Bearer ${adminPass}`) {
    return res.status(401).json({ error: 'Niet geautoriseerd.' });
  }

  try {
    // Haal waitlist emails op
    const waitlistRes = await fetch(
      `${SUPABASE_URL}/rest/v1/stekfinder_waitlist?select=*&order=created_at.desc&limit=100`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    const waitlist = await waitlistRes.json();

    // Haal analytics op - vandaag
    const today = new Date().toISOString().split('T')[0];
    const analyticsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/stekfinder_analytics?select=*&created_at=gte.${today}T00:00:00&order=created_at.desc`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    const analyticsToday = await analyticsRes.json();

    // Haal totaal analytics op
    const totalRes = await fetch(
      `${SUPABASE_URL}/rest/v1/stekfinder_analytics?select=event&limit=10000`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    const totalEvents = await totalRes.json();

    // Tel events
    const counts = {};
    for (const e of totalEvents) {
      counts[e.event] = (counts[e.event] || 0) + 1;
    }

    return res.status(200).json({
      waitlist: {
        total: waitlist.length,
        recent: waitlist.slice(0, 20),
      },
      analytics: {
        today: analyticsToday.length,
        todayEvents: analyticsToday,
        totals: counts,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ error: 'Kon stats niet ophalen.' });
  }
}
