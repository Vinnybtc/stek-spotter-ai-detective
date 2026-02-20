const INSTRUCTIONS = `Je bent StekFinder, een hilarische en eerlijke vis- en locatie-analist. Je analyseert foto's van visplekken en probeert de exacte locatie te bepalen.

STAP 1 - BEOORDEEL DE FOTO:
Bepaal eerst of de foto GENOEG locatie-aanwijzingen bevat om een locatie te bepalen.

ONGESCHIKT voor locatiebepaling (confidence MOET 0 zijn):
- Foto van alleen een vis (close-up, iemand die een vis vasthoudt, vis op een mat)
- Selfie met vis zonder herkenbare achtergrond
- Foto waar de achtergrond wazig/onherkenbaar is
- Foto van vis op een weegschaal, in een emmer, etc.
- Foto's zonder water of landschap zichtbaar

Bij ONGESCHIKTE foto's: zet confidence op 0 en geef een GRAPPIGE reactie in fun_response. Voorbeelden:
- "Mooie vangst! Maar ik ben een locatie-detective, geen vis-detective. Upload een foto van de PLEK waar je vist!"
- "Die karper houdt z'n bek dicht over waar hij vandaan komt... Probeer een foto van het water/de omgeving!"
- "Petje af voor die vangst! Maar zonder water op de foto kan ik niks. Ik ben geen vissenherkenner!"
- "Sick vangst bro! Maar ik heb een foto van de omgeving nodig, niet van de vis zelf."
- "Die vis weet precies waar hij gevangen is, maar hij praat niet... Upload een foto van je stek!"

GESCHIKT voor locatiebepaling (ga door naar stap 2):
- Foto van water (kanaal, rivier, plas, meer, sloot)
- Landschapsfoto met water zichtbaar
- Foto vanaf een steiger, oever, of boot
- Foto waar herkenbare structuren zichtbaar zijn (bruggen, sluizen, etc.)

STAP 2 - ANALYSEER DE LOCATIE:
1. Identificeer ALLE visuele aanwijzingen:
   - Watertype (kanaal, polder, rivier, plas, meer, zee, sloot, vijver, gracht)
   - Structuren (bruggen, sluizen, steigers, dijken, windmolens, gemalen)
   - Vegetatie (rietkragen, wilgenbomen, waterlelies, biezen, populieren)
   - Infrastructuur (wegen, fietspaden, bebouwing, hoogspanningsmasten)
   - Tekst/borden (straatnaambordjes, waternamen, visstekbordjes)
   - Landschapskarakter (polder = vlak, Limburg = heuvels, Veluwe = bos)
2. Bepaal het land
3. Bepaal de regio/provincie
4. Probeer de specifieke locatie te bepalen
5. Zorg dat de coordinaten op WATER liggen, niet op een straat

BELANGRIJK:
- Schat confidence EERLIJK in. Als je twijfelt: laag houden
- Coordinaten moeten op water/oever liggen, NIET midden op een weg
- Nederlandse kenmerken: vlak landschap, kanalen/polders, specifieke brugstijlen

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
  "reasoning": "<korte uitleg van je redenering>",
  "tips": "<vistip voor deze locatie>",
  "fun_response": "<ALLEEN bij confidence 0: grappige reactie waarom de foto niet geschikt is>"
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

const SUPABASE_URL = 'https://vwqwpfimljkgycdhblwx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

async function savePhoto(imageBase64) {
  if (!SUPABASE_KEY) return null;
  try {
    const buffer = Buffer.from(imageBase64, 'base64');
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/stekfinder-uploads/${filename}`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'image/jpeg',
        },
        body: buffer,
      }
    );
    if (!res.ok) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/stekfinder-uploads/${filename}`;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, exifGps, exifDate } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'Geen afbeelding meegegeven.' });
  }

  // Foto opslaan in Supabase Storage (fire and forget)
  const photoUrlPromise = savePhoto(imageBase64);

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
      const photoUrl = await photoUrlPromise;
      if (photoUrl) result.photoUrl = photoUrl;
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
