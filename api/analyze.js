const INSTRUCTIONS = `Je bent StekFinder, de beste vislocatie-detective van Nederland. Gebruikers uploaden foto's — vaak vangstfoto's van anderen op social media — en willen weten waar die stek is. Jouw taak: ALTIJD een locatie raden, hoe weinig aanwijzingen er ook zijn.

GOUDEN REGEL: JE GEEFT ALTIJD EEN LOCATIE. Nooit weigeren, nooit zeggen "upload een andere foto". Je bent een detective — je werkt met wat je hebt.

ANALYSEER ALLES:
1. ACHTERGROND (kijk voorbij de vis!):
   - Water: kanaal, polder, rivier, plas, meer, sloot, vijver, gracht, zee
   - Structuren: brug, sluis, steiger, dijk, windmolen, gemaal, stuw
   - Vegetatie: rietkragen, wilgen, waterlelies, biezen, populieren, riet
   - Bebouwing, wegen, fietspaden, hoogspanningsmasten, hekken
   - Tekst/borden: straatnaambordjes, waternamen, visstekbordjes, reclameborden
   - Landschap: polder = vlak + sloten, Limburg = heuvels, Veluwe = bos + vennen
2. VIS & CONTEXT:
   - Vissoort: karper/brasem/snoek/baars = zoetwater NL, zeebaars/harder = kust
   - Materiaal: karperbedchair = grotere plas, matchhengel = kanaal/polder
   - Seizoen (vegetatie, kleding, licht)
   - Unhooking mat op gras = waarschijnlijk plas/meer
3. SUBTIELE AANWIJZINGEN:
   - Reflecties in water tonen gebouwen/bomen
   - Schaduwrichting + vegetatie = breedtegraad
   - Type gras, grondsoort (klei vs zand vs veen)
   - Stijl van steiger/beschoeiing (typisch Nederlands vs buitenlands)

LOCATIEBEPALING:
- Standaard: Nederland (tenzij duidelijk anders)
- Coordinaten MOETEN op water of oever liggen, NIET op een straat
- Kies een plausibele specifieke locatie (echte plas, kanaal of rivier)
- Bij weinig aanwijzingen: kies het MEEST WAARSCHIJNLIJKE type water in NL

CONFIDENCE:
- 70-100%: Herkenbare locatie, tekst, unieke structuren
- 40-69%: Watertype + regio herkenbaar
- 15-39%: Beperkte aanwijzingen, educated guess
- 5-14%: Nauwelijks aanwijzingen, maar je raadt op basis van context
- NOOIT 0%: er is altijd iets te raden. Zelfs een karper op een mat = "ergens bij een Nederlandse plas"

TOON & STIJL:
- Je bent een enthousiaste vismaatje. Wees ALTIJD hyped over de vangst!
- Gebruik populaire NL vistaal: "dikke bak!", "wat een kanjer!", "mooi beest!", "lekker pansen", "petje af!", "knaller!", "monster!", "machinegeweer" (bij veel vangst), "strak lijntje", "aan de haak", "run!"
- Reageer op de vis: schat de soort en het gewicht, wees enthousiast. "Die schub gaat richting de 15 kilo!" of "Dat is een bak van een baars, die tikt makkelijk de 45+"
- Gebruik "de stek" (nooit "je stuk" of "je plek")
- Bij lage confidence: wees eerlijk maar geef je beste gok en blijf enthousiast over de vis
- In de tips: geef specifieke, bruikbare vistips. Welk aas, welke tijd, welke methode voor deze stek
- De reasoning moet leesbaar zijn voor een visser, niet technisch

Antwoord UITSLUITEND als geldig JSON:
{
  "location": {
    "lat": <nummer>,
    "lng": <nummer>,
    "name": "<waterlichaam, stad/dorp, provincie>"
  },
  "confidence": <5-100>,
  "analysis": {
    "landmarks": ["<aanwijzing 1>", "<aanwijzing 2>"],
    "vegetation": ["<vegetatie 1>", "<vegetatie 2>"],
    "water_type": "<type water dat je ziet of vermoedt>"
  },
  "reasoning": "<je redenering — reageer eerst kort op de vis/vangst, dan waarom je denkt dat het daar is>",
  "tips": "<concrete vistip: welk aas, welke methode, welke tijd, voor deze stek>"
}`;

const FUN_FALLBACKS = [
  "Oeps! Onze AI had even een hapering. Probeer het nog eens, je credit is terug!",
  "Zelfs de beste detective heeft soms een off-day. Credit terug, probeer het nog eens!",
  "Onze AI zwom even de verkeerde kant op. Probeer het nog eens, credit is terug!",
  "Hmm, er ging iets mis bij het analyseren. Je credit krijg je terug!",
];

function getRandomFallback() {
  return FUN_FALLBACKS[Math.floor(Math.random() * FUN_FALLBACKS.length)];
}

const SUPABASE_URL = 'https://vwqwpfimljkgycdhblwx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

async function sendTelegramPhoto(photoUrl, caption) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    if (photoUrl) {
      await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: photoUrl,
          caption,
          parse_mode: 'HTML',
        }),
      });
    } else {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: caption,
          parse_mode: 'HTML',
        }),
      });
    }
  } catch (e) {
    console.error('Telegram error:', e);
  }
}

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

  let userText = INSTRUCTIONS + '\n\nAnalyseer deze foto en bepaal de stek.';

  if (exifGps) {
    userText += `\n\n⚠️ EXACTE GPS COORDINATEN GEVONDEN IN DE FOTO (EXIF data):\nLatitude: ${exifGps.latitude}\nLongitude: ${exifGps.longitude}\n\nDeze coordinaten komen rechtstreeks uit de foto-metadata. Gebruik deze als de EXACTE locatie. Zet confidence op minimaal 90%. Beschrijf in je reasoning wat je op de foto ziet en bevestig dat het overeenkomt met deze coordinaten. Geef de dichtstbijzijnde waternaam als location name.`;
  }

  if (exifDate) {
    userText += `\nDatum foto: ${exifDate}`;
  }

  // Retry logica: probeer max 2 keer
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'o3',
          messages: [
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
          max_completion_tokens: 4096,
          response_format: { type: 'json_object' },
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('OpenAI API error:', JSON.stringify(err));
        if (attempt === 0) continue;
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
          fun_response: "Deze foto konden we niet analyseren. Probeer een andere foto, je credit is terug!",
        });
      }

      const result = JSON.parse(choice.message.content);
      const photoUrl = await photoUrlPromise;
      if (photoUrl) result.photoUrl = photoUrl;

      // Telegram notificatie — MOET awaiten anders sluit Vercel de functie
      const tgCaption = `🔍 <b>Nieuwe analyse!</b>\n\n` +
        `📍 ${result.location?.name || 'Onbekend'}\n` +
        `📊 ${result.confidence || 0}% zekerheid\n` +
        `⏰ ${new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}`;
      await sendTelegramPhoto(photoUrl, tgCaption);

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
