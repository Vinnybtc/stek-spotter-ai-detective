
import React from 'react';
import { StekResult } from '@/hooks/useStekFinder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MapPin, Target, Leaf, Droplet } from 'lucide-react';

interface StekFinderResultsProps {
    results: StekResult[];
    isLoading: boolean;
}

const StekFinderResults: React.FC<StekFinderResultsProps> = ({ results, isLoading }) => {
    if (isLoading) {
        return (
            <div className="grid gap-8">
                {[...Array(1)].map((_, i) => (
                    <Card key={i} className="bg-black/20 border-white/10 text-white">
                        <CardHeader>
                            <Skeleton className="h-8 w-3/4" />
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                            <Skeleton className="w-full h-64 rounded-lg" />
                            <div>
                                <Skeleton className="h-6 w-1/2 mb-4" />
                                <div className="space-y-3">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-5/6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (!results || results.length === 0) {
        return (
            <div className="text-center py-16 text-white/50">
                <p>Analyseer een foto om hier de resultaten te zien.</p>
            </div>
        );
    }

    return (
        <div className="grid gap-8">
            {results.map((result) => (
                <Card key={result.id} className="bg-black/20 border-white/10 text-white overflow-hidden animate-fade-in-up">
                    <CardHeader>
                        <CardTitle className="flex items-center text-2xl">
                            <MapPin className="mr-3 text-sky-400" />
                            {result.location.name}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6">
                        <div className="relative">
                            <img src={result.imageUrl} alt="Geanalyseerde foto" className="rounded-lg w-full h-auto object-cover" />
                            <Badge variant="secondary" className="absolute top-3 right-3 text-lg bg-sky-500/80 backdrop-blur-sm text-white border-sky-400">
                                {result.confidence}% Zeker
                            </Badge>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-lg flex items-center mb-2"><Target className="mr-2 text-orange-400" /> Herkenningspunten</h3>
                                <ul className="list-disc list-inside text-white/80 space-y-1">
                                    {result.analysis.landmarks.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                             <div>
                                <h3 className="font-bold text-lg flex items-center mb-2"><Leaf className="mr-2 text-green-400" /> Vegetatie</h3>
                                <ul className="list-disc list-inside text-white/80 space-y-1">
                                    {result.analysis.vegetation.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                             <div>
                                <h3 className="font-bold text-lg flex items-center mb-2"><Droplet className="mr-2 text-blue-400" /> Watertype</h3>
                                <p className="text-white/80">{result.analysis.water_type}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default StekFinderResults;
