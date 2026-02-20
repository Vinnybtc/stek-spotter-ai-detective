export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat en lng parameters zijn verplicht.' });
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'StekFinder/1.0 (visplekdetective)',
          'Accept-Language': 'nl',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Nominatim request failed');
    }

    const data = await response.json();

    return res.status(200).json({
      displayName: data.display_name,
      address: data.address,
      water: data.address?.water || data.address?.river || null,
    });
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return res.status(500).json({ error: 'Reverse geocoding mislukt.' });
  }
}
