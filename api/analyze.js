const SYSTEM_PROMPT = `Je bent een expert OSINT-analist gespecialiseerd in beeldgeolocatie, met diepgaande kennis van Nederlandse en Europese waterlichamen, vislocaties en landschappen.

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

Antwoord UITSLUITEND als geldig JSON:
{
  "location": {
    "lat": <nummer>,
    "lng": <nummer>,
    "name": "<waterlichaam/locatie, stad/dorp, provincie>"
  },
  "confidence": <0-100>,
  "analysis": {
    "landmarks": ["<herkenningspunt 1>", "<herkenningspunt 2>", ...],
    "vegetation": ["<vegetatie 1>", "<vegetatie 2>", ...],
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
  let userText = 'Analyseer deze visfoto en bepaal de locatie. Geef je antwoord als JSON.';

  if (exifGps) {
    userText += `\n\nEXTRA CONTEXT - EXIF GPS data gevonden in de foto:\nLatitude: ${exifGps.latitude}\nLongitude: ${exifGps.longitude}\nBevestig of de visuele inhoud overeenkomt met deze coordinaten. Als de foto duidelijk NIET bij deze locatie hoort, negeer de GPS data en geef je eigen analyse.`;
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
        model: 'o4-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: userText },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_completion_tokens: 2000,
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
