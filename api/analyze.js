export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64 } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'Geen afbeelding meegegeven.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key niet geconfigureerd.' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Je bent een expert vis- en locatie-analist. Je analyseert foto's van visplekken en probeert de exacte locatie te bepalen.

Analyseer de foto en geef je antwoord UITSLUITEND als geldig JSON in dit formaat:
{
  "location": {
    "lat": <nummer>,
    "lng": <nummer>,
    "name": "<plaatsnaam, waterlichaam, provincie>"
  },
  "confidence": <0-100>,
  "analysis": {
    "landmarks": ["<herkenningspunt 1>", "<herkenningspunt 2>"],
    "vegetation": ["<vegetatie observatie 1>", "<vegetatie observatie 2>"],
    "water_type": "<beschrijving van het type water>"
  },
  "tips": "<korte vistip voor deze locatie>"
}

Richtlijnen:
- Zoek naar herkenbare bruggen, gebouwen, borden, vegetatie, watertype
- Als je EXIF/GPS data kunt afleiden uit de context, gebruik die
- Schat confidence realistisch in (onder 50% als je echt twijfelt)
- Geef altijd een best guess, ook als je niet zeker bent
- Antwoord in het Nederlands`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyseer deze visfoto en bepaal de locatie. Geef je antwoord als JSON.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('OpenAI API error:', err);
      return res.status(500).json({ error: 'AI analyse mislukt. Probeer het opnieuw.' });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: 'Geen analyse resultaat ontvangen.' });
    }

    // Parse JSON uit het antwoord (strip eventuele markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Kon het AI-antwoord niet verwerken.' });
    }

    const result = JSON.parse(jsonMatch[0]);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ error: 'Er ging iets mis bij de analyse.' });
  }
}
