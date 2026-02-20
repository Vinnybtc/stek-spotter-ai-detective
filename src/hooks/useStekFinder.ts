import { useState, useEffect } from 'react';
import exifr from 'exifr';

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
  tips?: string;
  reasoning?: string;
  reverseGeocode?: {
    displayName: string;
    water: string | null;
  };
  source: 'exif' | 'ai' | 'exif+ai';
  timestamp?: number;
}

export interface StekUser {
  name: string;
}

const HISTORY_KEY = 'stekfinder_history';
const CREDITS_KEY = 'stekfinder_credits';
const MAX_HISTORY = 10;

function loadHistory(): StekResult[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(results: StekResult[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(results.slice(0, MAX_HISTORY)));
}

function resizeAndConvertToBase64(file: File, maxSize = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function extractExif(file: File) {
  try {
    const gps = await exifr.gps(file);
    const meta = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'CreateDate'],
    });
    return {
      gps: gps || null,
      date: meta?.DateTimeOriginal || meta?.CreateDate || null,
    };
  } catch {
    return { gps: null, date: null };
  }
}

async function reverseGeocode(lat: number, lng: number) {
  try {
    const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export const useStekFinder = () => {
  const [results, setResults] = useState<StekResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [user] = useState<StekUser>({ name: 'Visser' });
  const [credits, setCredits] = useState(() => {
    const saved = localStorage.getItem(CREDITS_KEY);
    return saved ? parseInt(saved, 10) : 5;
  });
  const [shouldHighlightInput, setShouldHighlightInput] = useState(true);
  const [history, setHistory] = useState<StekResult[]>(loadHistory);

  useEffect(() => {
    localStorage.setItem(CREDITS_KEY, String(credits));
  }, [credits]);

  const handleSearch = async (file: File | null) => {
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

    try {
      // Stap 1: EXIF data extractie
      setLoadingStep('GPS-data zoeken in foto...');
      const exif = await extractExif(file);

      // Stap 2: AI analyse
      setLoadingStep(exif.gps
        ? 'GPS gevonden! AI bevestigt locatie...'
        : 'AI analyseert foto...');

      const imageBase64 = await resizeAndConvertToBase64(file);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          exifGps: exif.gps,
          exifDate: exif.date ? new Date(exif.date).toISOString() : null,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Analyse mislukt. Probeer het opnieuw.');
      }

      const data = await response.json();

      setCredits(prev => prev - 1);

      // Stap 3: Reverse geocoding voor extra context
      setLoadingStep('Locatiegegevens ophalen...');
      const lat = data.location.lat;
      const lng = data.location.lng;
      const geo = await reverseGeocode(lat, lng);

      const source = exif.gps ? 'exif+ai' : 'ai';

      const result: StekResult = {
        id: Date.now(),
        imageUrl: URL.createObjectURL(file),
        location: data.location,
        confidence: exif.gps ? Math.max(data.confidence, 90) : data.confidence,
        analysis: data.analysis,
        tips: data.tips,
        reasoning: data.reasoning,
        reverseGeocode: geo ? { displayName: geo.displayName, water: geo.water } : undefined,
        source,
        timestamp: Date.now(),
      };

      setResults([result]);

      const newHistory = [result, ...history].slice(0, MAX_HISTORY);
      setHistory(newHistory);
      saveHistory(newHistory);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Er ging iets mis.';
      setError(message);
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleClear = () => {
    setResults([]);
    setError(null);
    setShouldHighlightInput(true);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  return {
    results,
    isLoading,
    loadingStep,
    error,
    shouldHighlightInput,
    credits,
    handleSearch,
    handleClear,
    user,
    history,
    clearHistory,
  };
};
