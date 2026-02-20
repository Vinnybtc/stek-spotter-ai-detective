const INSTRUCTIONS = `Je bent StekFinder, een vrolijke en behulpzame vis- en locatie-analist. Je analyseert foto's van visplekken en probeert de exacte locatie te bepalen.

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
- Als je echt NIETS kunt herkennen, geef dan confidence 0 en een grappige opmerking in "fun_response"
- Schat confidence realistisch in (onder 30% als je echt twijfelt)
- Nederlandse kenmerken: vlak landschap, veel kanalen/polders, specifieke brugstijlen, groene weilanden
- Let op seizoensaanwijzingen (kale bomen = winter, bloeiend riet = zomer)
- Als de foto GEEN water/visplek bevat maar wel een vis, geef dan een leuke reactie

Antwoord UITSLUITEND als geldig JSON:
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
  "tips": "<vistip specifiek voor deze locatie en dit type water>",
  "fun_response": "<alleen invullen als je de locatie echt niet kunt bepalen - geef een grappige/leuke reactie>"
}`;

const FUN_FALLBACKS = [
  "Oeps! Onze AI-visser had even een dutje. Hier is je credit terug!",
  "Zelfs de beste visser vangt wel eens niks... We konden je foto niet analyseren. Credit terug!",
  "Onze AI zwom even de verkeerde kant op. Probeer het nog eens, credit is terug!",
  "De AI beet niet toe bij deze foto. Je credit krijg je terug, probeer een andere foto!",
  "Hmm, deze was een lastige! Onze AI bleef met lege handen. Credit terug!",
];

function getRandomFallback() {
  return FUN_FALLBACKS[Math.floor(Math.random() * FUN_FALLBACKS.length)];
}

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

  let userText = INSTRUCTIONS + '\n\nAnalyseer deze visfoto en bepaal de locatie.';

  if (exifGps) {
    userText += `\n\nEXTRA CONTEXT - EXIF GPS data gevonden in de foto:\nLatitude: ${exifGps.latitude}\nLongitude: ${exifGps.longitude}\nBevestig of de visuele inhoud overeenkomt met deze coordinaten.`;
  }

  if (exifDate) {
    userText += `\nDatum foto: ${exifDate}`;
  }

  // Retry logica: probeer max 2 keer
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 50000);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        signal: controller.signal,
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

      clearTimeout(timeout);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('OpenAI API error:', JSON.stringify(err));
        if (attempt === 0) continue; // retry
        return res.status(200).json({
          refund: true,
          fun_response: getRandomFallback(),
        });
      }

      const data = await response.json();
      const choice = data.choices?.[0];

      if (!choice?.message?.content) {
        console.error('Empty response:', JSON.stringify(data));
        if (attempt === 0) continue;
        return res.status(200).json({
          refund: true,
          fun_response: getRandomFallback(),
        });
      }

      if (choice.message.refusal || choice.finish_reason === 'content_filter') {
        return res.status(200).json({
          refund: true,
          fun_response: "Deze foto konden we niet analyseren. Misschien een andere proberen? Je credit is terug!",
        });
      }

      const result = JSON.parse(choice.message.content);
      return res.status(200).json(result);

    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error.message || error);
      if (attempt === 0) continue;
      return res.status(200).json({
        refund: true,
        fun_response: getRandomFallback(),
      });
    }
  }
}
