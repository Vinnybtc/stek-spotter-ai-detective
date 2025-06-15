
```typescript
import React from 'react';
import { StekResult } from '@/hooks/useStekFinder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, CheckCircle, BarChart, Landmark, Leaf, Droplets } from 'lucide-react';

interface StekFinderResultsProps {
    results: StekResult[];
    isLoading: boolean;
}

const LoadingSkeleton = () => (
    <Card className="bg-black/20 border-white/10 overflow-hidden">
        <CardHeader>
            <Skeleton className="h-8 w-3/4 bg-gray-700" />
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-80 w-full rounded-lg bg-gray-700" />
            <div className="space-y-4">
                <Skeleton className="h-6 w-1/2 bg-gray-700" />
                <Skeleton className="h-10 w-full bg-gray-700" />
                <div className="space-y-2 pt-4">
                    <Skeleton className="h-5 w-1/3 bg-gray-700" />
                    <Skeleton className="h-5 w-full bg-gray-700" />
                    <Skeleton className="h-5 w-full bg-gray-700" />
                </div>
            </div>
        </CardContent>
    </Card>
);

const StekFinderResults = ({ results, isLoading }: StekFinderResultsProps) => {
    if (isLoading) {
        return <LoadingSkeleton />;
    }

    if (results.length === 0) {
        return (
            <div className="text-center py-16 text-white/50">
                <p>De resultaten van de analyse verschijnen hier.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {results.map((result) => (
                <Card key={result.id} className="bg-black/20 border-white/10 text-white overflow-hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-2xl">
                            <MapPin className="text-sky-400" />
                            Locatie Gevonden!
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                        <img src={result.imageUrl} alt="Geanalyseerde visfoto" className="rounded-lg object-cover w-full h-auto max-h-[500px]" />
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-xl">{result.location.name}</h3>
                                <a
                                    href={`https://www.google.com/maps?q=${result.location.lat},${result.location.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-sky-400 hover:text-sky-300 transition-colors"
                                >
                                    Bekijk op Google Maps &rarr;
                                </a>
                            </div>
                            <div className="flex items-center gap-2 p-3 bg-green-900/30 border border-green-500/50 rounded-lg">
                                <CheckCircle className="h-6 w-6 text-green-400" />
                                <p>Zekerheid van analyse: <span className="font-bold text-lg">{result.confidence}%</span></p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-lg mb-3 flex items-center gap-2"><BarChart className="text-white/70" /> Analyse Details</h4>
                                <ul className="space-y-2 text-white/90">
                                    <li className="flex items-start gap-3"><Landmark className="h-5 w-5 mt-1 text-white/50 flex-shrink-0" /><span><strong>Herkenningspunten:</strong> {result.analysis.landmarks.join(', ')}</span></li>
                                    <li className="flex items-start gap-3"><Leaf className="h-5 w-5 mt-1 text-white/50 flex-shrink-0" /><span><strong>Vegetatie:</strong> {result.analysis.vegetation.join(', ')}</span></li>
                                    <li className="flex items-start gap-3"><Droplets className="h-5 w-5 mt-1 text-white/50 flex-shrink-0" /><span><strong>Watertype:</strong> {result.analysis.water_type}</span></li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default StekFinderResults;
```
