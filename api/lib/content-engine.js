// AI Content Engine — generates fishing marketing content for StekFinder

const CONTENT_TYPES = {
  vistip: {
    label: 'Vistip',
    description: 'Praktische vistip over techniek, aas of tactiek',
    emoji: '🎣',
  },
  spot_highlight: {
    label: 'Stek Spotlight',
    description: 'Interessant watertype of regio uitlichten (geen exacte locaties)',
    emoji: '📍',
  },
  seizoenstip: {
    label: 'Seizoenstip',
    description: 'Seizoensgebonden advies: wat vangt nu goed en waarom',
    emoji: '🌦️',
  },
  vangst_week: {
    label: 'Vangst van de Week',
    description: 'Highlight een mooie vangst of vissoort',
    emoji: '🏆',
  },
  fun_fact: {
    label: 'Fun Fact',
    description: 'Verrassend weetje over vissen, water of natuur in NL',
    emoji: '🧠',
  },
  interactief: {
    label: 'Interactieve Vraag',
    description: 'Engagementvraag aan de community',
    emoji: '💬',
  },
  gear_tip: {
    label: 'Gear & Aas Tip',
    description: 'Tip over materiaal, aas of uitrusting',
    emoji: '🪝',
  },
};

const SYSTEM_PROMPT = `Je bent de social media manager van StekFinder — de slimste vislocatie-detective van Nederland. Je maakt marketing content voor Instagram en Facebook gericht op Nederlandse sportvissers.

MERKIDENTITEIT:
- StekFinder is een app die AI gebruikt om vislocaties te herkennen uit foto's
- Toon: enthousiast vismaatje, casual, NL vistaal
- Woorden: "dikke bak", "knaller", "stek", "petje af", "strak lijntje", "lekker pansen"
- Nooit: technisch AI-jargon, formeel, Engels (tenzij hashtags)
- Altijd: positief, behulpzaam, community-gericht

REGELS:
1. Schrijf in het Nederlands, casual maar informatief
2. Gebruik relevante emoji's (niet overdreven)
3. Eindig met een call-to-action (vraag, tip om app te proberen, of engagement)
4. Hashtags: mix van NL (#vissen #sportvissen #stekfinder) + internationaal (#fishing #carpfishing)
5. Maximaal 200 woorden voor de post tekst
6. Geef APART de hashtags (niet in de tekst)
7. Geef een image_prompt in het Engels voor AI image generation (beschrijf een mooie visuele scene)
8. Respecteer spot-sharing etiquette: nooit exacte locaties, wel watertypen en regio's
9. Wissel af tussen vissoorten: karper, snoek, baars, snoekbaars, brasem, zeelt, meerval, forel, zeebaars

SEIZOEN & CONTEXT:
- Huidige maand: ${new Date().toLocaleString('nl-NL', { month: 'long' })}
- Seizoen: ${getSeason()}
- Gesloten tijd roofvis: 1 maart t/m laatste zaterdag juni
${getSeasonalContext()}

Antwoord UITSLUITEND als geldig JSON:
{
  "text": "<post tekst, max 200 woorden>",
  "hashtags": ["#stekfinder", "#vissen", "...nog 5-8 relevante hashtags"],
  "image_prompt": "<Engels, beschrijf een mooie foto/illustratie voor deze post>",
  "hook": "<eerste zin van de post, pakkend en scroll-stoppend>"
}`;

function getSeason() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'lente';
  if (month >= 5 && month <= 7) return 'zomer';
  if (month >= 8 && month <= 10) return 'herfst';
  return 'winter';
}

function getSeasonalContext() {
  const month = new Date().getMonth();
  const contexts = {
    0: '- Winter: nachtvissen populair, karper minder actief, snoek pakt goed op dood aas',
    1: '- Februari: laatste maand voor roofvis, maak er gebruik van! Karper begint te roeren',
    2: '- Maart: gesloten tijd roofvis begint. Focus op witvis, karper, brasem. Voorjaar komt eraan!',
    3: '- April: karperseizoen komt op gang, nature awakens, veel vissers aan het water',
    4: '- Mei: topmaand karper, brasem en zeelt. Veel activiteit, lange dagen',
    5: '- Juni: laatste stuk gesloten tijd roofvis. Karper op z\'n best. Snoekbaars gaat binnenkort weer open!',
    6: '- Juli: alles open! Roofvisseizoen begint weer. Zomerse nachten = nachtvissen',
    7: '- Augustus: topmaand voor alle vissoorten. Warm water, actieve vis',
    8: '- September: herfst begint, snoek wordt actiever, karper vreet zich vol voor de winter',
    9: '- Oktober: gouden herfst, snoek op z\'n best, grote karpers mogelijk',
    10: '- November: wintervissen begint, meerval laatste kansen, snoek blijft goed',
    11: '- December: rustig aan het water, echte diehards. Dead baiting voor snoek, winterkarper',
  };
  return contexts[month] || '';
}

export async function generateContent({ type, apiKey, customPrompt }) {
  if (!apiKey) throw new Error('OpenAI API key niet geconfigureerd');

  const contentType = CONTENT_TYPES[type];
  if (!contentType) throw new Error(`Onbekend content type: ${type}`);

  const userPrompt = customPrompt
    ? `Maak een ${contentType.label} post over: ${customPrompt}`
    : `Maak een ${contentType.label} post. ${contentType.description}. Kies zelf een interessant onderwerp dat past bij het seizoen.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1024,
      temperature: 0.9,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`OpenAI error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = JSON.parse(data.choices[0].message.content);

  return {
    content_type: type,
    text_content: content.text,
    hashtags: content.hashtags || [],
    image_prompt: content.image_prompt || null,
    hook: content.hook || content.text.split('\n')[0],
  };
}

/**
 * Generate a full week of varied content (7 posts)
 */
export async function generateWeekContent({ apiKey }) {
  const types = Object.keys(CONTENT_TYPES);
  const posts = [];

  for (let i = 0; i < 7; i++) {
    const type = types[i % types.length];
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + i);
    scheduledFor.setHours(9, 0, 0, 0); // 9:00 CET

    try {
      const content = await generateContent({ type, apiKey });
      posts.push({
        ...content,
        platform: 'both',
        status: 'queued',
        scheduled_for: scheduledFor.toISOString(),
      });
    } catch (e) {
      console.error(`Failed to generate ${type}:`, e.message);
    }

    // Rate limiting: wait between requests
    if (i < 6) await new Promise(r => setTimeout(r, 1000));
  }

  return posts;
}

export { CONTENT_TYPES };
