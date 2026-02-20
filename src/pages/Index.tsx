import { Button } from '@/components/ui/button';
import { Search, MapPin, Camera, Brain } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  {
    icon: Camera,
    title: 'Upload je foto',
    description: 'Sleep je visfoto in de app of selecteer hem uit je galerij.',
  },
  {
    icon: Brain,
    title: 'AI analyseert',
    description: 'Onze AI herkent water, vegetatie, bruggen en andere herkenningspunten.',
  },
  {
    icon: MapPin,
    title: 'Locatie gevonden',
    description: 'Bekijk de precieze locatie op de kaart met confidence score.',
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
            Jouw geheime visplekdetective. Upload een foto en laat onze AI de exacte locatie vinden.
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
      <div className="pb-20 px-4">
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
    </div>
  );
};

export default Index;
