import { useState, useEffect } from 'react';

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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const useStekFinder = () => {
  const [results, setResults] = useState<StekResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
      const imageBase64 = await fileToBase64(file);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Analyse mislukt. Probeer het opnieuw.');
      }

      const data = await response.json();

      setCredits(prev => prev - 1);

      const result: StekResult = {
        id: Date.now(),
        imageUrl: URL.createObjectURL(file),
        location: data.location,
        confidence: data.confidence,
        analysis: data.analysis,
        tips: data.tips,
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
