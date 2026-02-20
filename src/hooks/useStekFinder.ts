import { useState, useEffect, useCallback } from 'react';
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
  fun_response?: string;
  reverseGeocode?: {
    displayName: string;
    water: string | null;
  };
  source: 'exif' | 'ai' | 'exif+ai';
  timestamp?: number;
  feedback?: 'up' | 'down';
}

export interface StekUser {
  name: string;
}

export interface CreditsInfo {
  remaining: number;
  dailyTotal: number;
  streak: number;
  bonusToday: boolean;
  nextReset: string;
}

// ── Credits systeem ──────────────────────────────────────────────
const CREDITS_KEY = 'stekfinder_credits_v2';
const DAILY_FREE = 3;

interface CreditsState {
  remaining: number;
  lastResetDate: string;
  streak: number;
  lastVisitDate: string;
  totalAnalyses: number;
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function loadCredits(): CreditsState {
  try {
    const raw = localStorage.getItem(CREDITS_KEY);
    if (!raw) throw new Error('no data');
    const state: CreditsState = JSON.parse(raw);
    const today = getTodayStr();

    if (state.lastResetDate !== today) {
      // Nieuwe dag: reset credits
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const newStreak = state.lastVisitDate === yesterdayStr ? state.streak + 1 : 1;
      // Streak bonus: elke 3 dagen +1 extra credit
      const streakBonus = newStreak % 3 === 0 ? 1 : 0;

      return {
        remaining: DAILY_FREE + streakBonus,
        lastResetDate: today,
        streak: newStreak,
        lastVisitDate: today,
        totalAnalyses: state.totalAnalyses,
      };
    }

    return { ...state, lastVisitDate: today };
  } catch {
    return {
      remaining: DAILY_FREE,
      lastResetDate: getTodayStr(),
      streak: 1,
      lastVisitDate: getTodayStr(),
      totalAnalyses: 0,
    };
  }
}

function saveCredits(state: CreditsState) {
  localStorage.setItem(CREDITS_KEY, JSON.stringify(state));
}

// ── History ──────────────────────────────────────────────────────
const HISTORY_KEY = 'stekfinder_history';
const MAX_HISTORY = 20;

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

// ── Helpers ──────────────────────────────────────────────────────
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

function trackEvent(event: string, data?: Record<string, unknown>) {
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, data }),
  }).catch(() => {}); // fire and forget
}

// ── Hook ─────────────────────────────────────────────────────────
export const useStekFinder = () => {
  const [results, setResults] = useState<StekResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [funMessage, setFunMessage] = useState<string | null>(null);
  const [user] = useState<StekUser>({ name: 'Visser' });
  const [creditsState, setCreditsState] = useState<CreditsState>(loadCredits);
  const [shouldHighlightInput, setShouldHighlightInput] = useState(true);
  const [history, setHistory] = useState<StekResult[]>(loadHistory);
  const [showWaitlist, setShowWaitlist] = useState(false);

  useEffect(() => {
    saveCredits(creditsState);
  }, [creditsState]);

  const creditsInfo: CreditsInfo = {
    remaining: creditsState.remaining,
    dailyTotal: DAILY_FREE,
    streak: creditsState.streak,
    bonusToday: creditsState.streak % 3 === 0 && creditsState.streak > 0,
    nextReset: (() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow.toISOString();
    })(),
  };

  const refundCredit = useCallback(() => {
    setCreditsState(prev => {
      const updated = { ...prev, remaining: prev.remaining + 1 };
      return updated;
    });
  }, []);

  const handleSearch = async (file: File | null) => {
    if (isLoading) return;

    if (!file) {
      setError('Selecteer eerst een foto om te analyseren.');
      return;
    }

    if (creditsState.remaining <= 0) {
      setShowWaitlist(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setFunMessage(null);
    setResults([]);
    setShouldHighlightInput(false);

    try {
      // Stap 1: EXIF data extractie
      setLoadingStep('GPS-data zoeken in foto...');
      const exif = await extractExif(file);

      // Stap 2: AI analyse
      setLoadingStep(exif.gps
        ? 'GPS gevonden! AI bevestigt locatie...'
        : 'AI analyseert je foto...');

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

      const data = await response.json();

      // Check of het een refund/fun response is
      if (data.refund) {
        setFunMessage(data.fun_response || 'Oeps, dat ging niet helemaal goed. Je credit is terug!');
        // Geen credit aftrekken
        return;
      }

      if (data.fun_response && data.confidence === 0) {
        setFunMessage(data.fun_response);
        // Geen credit aftrekken bij confidence 0
        return;
      }

      // Credit aftrekken
      setCreditsState(prev => ({
        ...prev,
        remaining: prev.remaining - 1,
        totalAnalyses: prev.totalAnalyses + 1,
      }));

      // Stap 3: Reverse geocoding
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
        fun_response: data.fun_response,
        reverseGeocode: geo ? { displayName: geo.displayName, water: geo.water } : undefined,
        source,
        timestamp: Date.now(),
      };

      setResults([result]);

      // Track analyse
      trackEvent('analysis_complete', {
        location: data.location.name,
        confidence: result.confidence,
        source,
        photoUrl: data.photoUrl || null,
      });

      const newHistory = [result, ...history].slice(0, MAX_HISTORY);
      setHistory(newHistory);
      saveHistory(newHistory);
    } catch (err) {
      // Bij ELKE error: geef credit terug en toon leuke boodschap
      setFunMessage('Oeps! Er ging iets mis met de analyse. Je credit is terug, probeer het nog eens!');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleFeedback = useCallback((resultId: number, feedback: 'up' | 'down') => {
    setResults(prev => prev.map(r =>
      r.id === resultId ? { ...r, feedback } : r
    ));

    // Bij negatieve feedback: credit teruggeven
    if (feedback === 'down') {
      refundCredit();
    }

    // Track feedback
    const result = results.find(r => r.id === resultId);
    trackEvent('feedback', {
      type: feedback,
      location: result?.location?.name,
    });

    // Update history
    setHistory(prev => {
      const updated = prev.map(r =>
        r.id === resultId ? { ...r, feedback } : r
      );
      saveHistory(updated);
      return updated;
    });
  }, [refundCredit]);

  const handleClear = () => {
    setResults([]);
    setError(null);
    setFunMessage(null);
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
    funMessage,
    shouldHighlightInput,
    creditsInfo,
    handleSearch,
    handleClear,
    handleFeedback,
    user,
    history,
    clearHistory,
    showWaitlist,
    setShowWaitlist,
    totalAnalyses: creditsState.totalAnalyses,
  };
};
