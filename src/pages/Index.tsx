import { Button } from '@/components/ui/button';
import { Search, MapPin, Camera, Brain, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  {
    icon: Camera,
    title: 'Upload een foto',
    description: 'Sleep een vangstfoto of stekfoto in de app. Werkt ook met screenshots van social media.',
  },
  {
    icon: Brain,
    title: 'AI analyseert de stek',
    description: 'Onze AI herkent water, vegetatie, bruggen en andere herkenningspunten op de achtergrond.',
  },
  {
    icon: MapPin,
    title: 'Locatie op de kaart',
    description: 'Bekijk de stek op een satellietkaart met confidence score. Direct openen in Google Maps.',
  },
];

const faqs = [
  {
    q: 'Hoe werkt StekFinder?',
    a: 'Upload een foto van een vangst of vislocatie. Onze AI analyseert de achtergrond — water, vegetatie, bruggen, gebouwen — en bepaalt waar de foto genomen is. Je ziet de stek direct op een satellietkaart.',
  },
  {
    q: 'Werkt het ook met vangstfoto\'s?',
    a: 'Ja! De AI kijkt voorbij de vis naar de achtergrond. Hoe meer omgeving zichtbaar is, hoe nauwkeuriger het resultaat. Zelfs een klein stukje water of oever kan voldoende zijn.',
  },
  {
    q: 'Is StekFinder gratis?',
    a: 'StekFinder is momenteel in beta. Je krijgt dagelijks 3 gratis analyses. Bij een incorrect resultaat kun je feedback geven en krijg je je credit terug.',
  },
  {
    q: 'Welke foto\'s werken het beste?',
    a: 'Foto\'s met zichtbaar water, oevers, bruggen, steigers of andere herkenningspunten geven het beste resultaat. Maar ook vangstfoto\'s met achtergrond worden geanalyseerd.',
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center p-4 pt-20">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter mb-6 animate-fade-in-down">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-orange-400">
              StekFinder
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto animate-fade-in-up">
            Vind de visplek van elke foto met AI. Upload een vangstfoto en ontdek waar de stek is.
          </p>
          <div className="mt-10 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Button
              asChild
              size="lg"
              className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-lg px-10 py-7 rounded-full shadow-lg shadow-sky-500/20 hover:shadow-xl hover:shadow-sky-500/30 transition-all duration-300 hover:scale-105"
            >
              <Link to="/stek-finder">
                <Search className="mr-3 h-6 w-6" />
                Start met zoeken
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Hoe het werkt */}
      <div className="pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-2xl font-bold text-white/90 mb-10">Hoe werkt het?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="bg-black/20 border border-white/10 rounded-2xl p-6 text-center animate-fade-in-up hover:border-sky-500/30 transition-colors"
                style={{ animationDelay: `${0.5 + i * 0.15}s` }}
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-sky-500/10 border border-sky-500/20 mb-4">
                  <feature.icon className="h-7 w-7 text-sky-400" />
                </div>
                <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-white/60 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-2xl font-bold text-white/90 mb-8 flex items-center justify-center gap-2">
            <HelpCircle className="h-6 w-6 text-sky-400" />
            Veelgestelde vragen
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-black/20 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors"
              >
                <h3 className="font-bold text-white/90 mb-2">{faq.q}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 px-4 text-center text-white/30 text-sm">
        <p>StekFinder — AI-gestuurde visplekherkenning voor hengelaars in Nederland</p>
      </footer>
    </div>
  );
};

export default Index;
