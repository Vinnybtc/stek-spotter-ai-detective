
```typescript
import { useState } from 'react';

export interface StekResult {
    id: number;
    imageUrl: string;
    location: {
        lat: number;
        lng: number;
        name: string;
    };
    confidence: number;
    analysis: {
        landmarks: string[];
        vegetation: string[];
        water_type: string;
    };
}

export interface StekUser {
    name: string;
}

export const useStekFinder = () => {
    const [results, setResults] = useState<StekResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [user] = useState<StekUser>({ name: 'Visser' });
    const [credits, setCredits] = useState(5);
    const [shouldHighlightInput, setShouldHighlightInput] = useState(true);

    const handleSearch = (file: File | null) => {
        if (isLoading) return;

        if (!file) {
            setError('Selecteer eerst een foto om te analyseren.');
            return;
        }

        if (credits <= 0) {
            setError('Je hebt geen credits meer. Kom morgen terug!');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResults([]);
        setShouldHighlightInput(false);

        // Simulate AI processing time
        setTimeout(() => {
            setCredits(prev => prev - 1);
            
            const mockResult: StekResult = {
                id: Date.now(),
                imageUrl: URL.createObjectURL(file),
                location: {
                    lat: 52.370216,
                    lng: 4.895168,
                    name: 'De Wallen, Amsterdam',
                },
                confidence: 87,
                analysis: {
                    landmarks: ['Klassieke Amsterdamse grachtenpanden', 'Brug #216 (Oudekennissteeg)', 'Rode licht-reclames'],
                    vegetation: ['Minimale stedelijke begroeiing', 'Waterlelies in de gracht'],
                    water_type: 'Stilstaand grachtwater, troebel',
                },
            };

            setResults([mockResult]);
            setIsLoading(false);
        }, 3000);
    };

    const handleClear = () => {
        setResults([]);
        setError(null);
        setShouldHighlightInput(true);
    };

    return { results, isLoading, error, shouldHighlightInput, credits, handleSearch, handleClear, user };
};
```
