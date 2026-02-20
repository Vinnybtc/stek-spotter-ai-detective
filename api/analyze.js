const INSTRUCTIONS = `Je bent een expert OSINT-analist gespecialiseerd in beeldgeolocatie, met diepgaande kennis van Nederlandse en Europese waterlichamen, vislocaties en landschappen.

TAAK: Analyseer de foto om de geografische locatie te bepalen.

ANALYSE-METHODE (stap voor stap):
1. Identificeer ALLE visuele aanwijzingen systematisch:
   - Watertype (kanaal, polder, rivier, plas, meer, zee, sloot, vijver, gracht)
   - Herkenbare structuren (bruggen, sluizen, steigers, dijken, windmolens, gemalen)
   - Vegetatie (rietkragen, wilgenbomen, waterlelies, biezen, populieren)
   - Infrastructuur (wegen, fietspaden, bebouwing, hoogspanningsmasten)
   - Tekst/borden (straatnaambordjes, waternamen, visstekbordjes, VISpas-borden)
   - Landschapskarakter (polder = vlak + weidse lucht, Limburg = heuvels, Veluwe = bos + heide)
   - Bodemsoort zichtbaar aan de oever (klei, veen, zand)
2. Bepaal het land op basis van alle aanwijzingen
3. Bepaal de regio/provincie
4. Probeer de specifieke locatie te bepalen
5. Geef coordinaten als je voldoende zekerheid hebt

BELANGRIJK:
- Geef ALTIJD een best guess, ook als je niet 100% zeker bent
- Schat confidence realistisch in (onder 30% als je echt twijfelt)
- Nederlandse kenmerken: vlak landschap, veel kanalen/polders, specifieke brugstijlen, groene weilanden
- Let op seizoensaanwijzingen (kale bomen = winter, bloeiend riet = zomer)

Antwoord UITSLUITEND als geldig JSON (geen markdown, geen code blocks, puur JSON):
{
  "location": {
    "lat": <nummer>,
    "lng": <nummer>,
    "name": "<waterlichaam/locatie, stad/dorp, provincie>"
  },
  "confidence": <0-100>,
  "analysis": {
    "landmarks": ["<herkenningspunt 1>", "<herkenningspunt 2>"],
    "vegetation": ["<vegetatie 1>", "<vegetatie 2>"],
    "water_type": "<beschrijving van het type water>"
  },
  "reasoning": "<korte uitleg van je stap-voor-stap redenering>",
  "tips": "<vistip specifiek voor deze locatie en dit type water>"
}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, exifGps, exifDate } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'Geen afbeelding meegegeven.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key niet geconfigureerd.' });
  }

  // Bouw user prompt op met eventuele EXIF context
  let userText = INSTRUCTIONS + '\n\nAnalyseer deze visfoto en bepaal de locatie.';

  if (exifGps) {
    userText += `\n\nEXTRA CONTEXT - EXIF GPS data gevonden in de foto:\nLatitude: ${exifGps.latitude}\nLongitude: ${exifGps.longitude}\nBevestig of de visuele inhoud overeenkomt met deze coordinaten.`;
  }

  if (exifDate) {
    userText += `\nDatum foto: ${exifDate}`;
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
            role: 'user',
            content: [
              { type: 'text', text: userText },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: 'auto',
                },
              },
            ],
          },
        ],
        max_tokens: 1500,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', JSON.stringify(err));
      const msg = err?.error?.message || 'AI analyse mislukt. Probeer het opnieuw.';
      return res.status(500).json({ error: msg });
    }

    const data = await response.json();
    console.log('OpenAI response:', JSON.stringify(data, null, 2));

    const choice = data.choices?.[0];
    if (!choice) {
      console.error('No choices in response:', data);
      return res.status(500).json({ error: 'Geen analyse resultaat ontvangen.' });
    }

    // Check voor refusal
    if (choice.message?.refusal) {
      console.error('Model refused:', choice.message.refusal);
      return res.status(500).json({ error: 'Het model kon deze foto niet analyseren. Probeer een andere foto.' });
    }

    // Check finish_reason
    if (choice.finish_reason === 'content_filter') {
      return res.status(500).json({ error: 'De foto is geblokkeerd door het inhoudsfilter. Probeer een andere foto.' });
    }

    const content = choice.message?.content;
    if (!content) {
      console.error('No content in choice:', choice);
      return res.status(500).json({ error: 'Geen analyse resultaat ontvangen. Probeer opnieuw.' });
    }

    try {
      const result = JSON.parse(content);
      return res.status(200).json(result);
    } catch {
      // Fallback: probeer JSON te extracten
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('Unparseable response:', content);
        return res.status(500).json({ error: 'Kon het AI-antwoord niet verwerken.' });
      }
      const result = JSON.parse(jsonMatch[0]);
      return res.status(200).json(result);
    }
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ error: 'Er ging iets mis bij de analyse.' });
  }
}
