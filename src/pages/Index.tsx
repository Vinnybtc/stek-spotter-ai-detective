
```typescript
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center text-center p-4">
      <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.05] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
      <div className="z-10">
        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tighter mb-4 animate-fade-in-down">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-orange-400">
            StekFinder
          </span>
        </h1>
        <p className="text-xl text-white/70 max-w-2xl mx-auto animate-fade-in-up">
          Jouw geheime visplekdetective. Upload een foto en laat onze AI de exacte locatie vinden.
        </p>
        <div className="mt-10 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <Button asChild size="lg" className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-lg px-8 py-6 rounded-full shadow-lg shadow-sky-500/20 hover:shadow-xl hover:shadow-sky-500/30 transition-all duration-300">
            <Link to="/stek-finder">
              <Search className="mr-3 h-6 w-6" />
              Start met zoeken
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
```
