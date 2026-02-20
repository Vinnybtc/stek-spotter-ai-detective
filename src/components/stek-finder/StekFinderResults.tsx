import React, { useState } from 'react';
import { StekResult } from '@/hooks/useStekFinder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  MapPin, Target, Leaf, Droplet, Lightbulb, Brain,
  Navigation, Satellite, ThumbsUp, ThumbsDown, Share2, Check, Fish,
} from 'lucide-react';
import LocationMap from './LocationMap';

interface StekFinderResultsProps {
  results: StekResult[];
  isLoading: boolean;
  onFeedback: (resultId: number, feedback: 'up' | 'down') => void;
}

const ConfidenceBadge = ({ confidence }: { confidence: number }) => {
  const color =
    confidence >= 75 ? 'bg-green-500/80 border-green-400' :
    confidence >= 50 ? 'bg-orange-500/80 border-orange-400' :
    'bg-red-500/80 border-red-400';

  return (
    <Badge variant="secondary" className={`text-lg ${color} backdrop-blur-sm text-white`}>
      {confidence}% Zeker
    </Badge>
  );
};

const SourceBadge = ({ source }: { source: string }) => {
  if (source === 'exif+ai') {
    return (
      <Badge variant="outline" className="text-xs border-green-500/50 text-green-400">
        <Satellite className="h-3 w-3 mr-1" />
        GPS + AI
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs border-sky-500/50 text-sky-400">
      <Brain className="h-3 w-3 mr-1" />
      AI analyse
    </Badge>
  );
};

const FeedbackButtons = ({
  resultId, feedback, onFeedback,
}: {
  resultId: number;
  feedback?: 'up' | 'down';
  onFeedback: (id: number, fb: 'up' | 'down') => void;
}) => {
  if (feedback) {
    return (
      <div className="flex items-center gap-2 text-sm">
        {feedback === 'up' ? (
          <span className="text-green-400 flex items-center gap-1">
            <ThumbsUp className="h-4 w-4" /> Bedankt voor je feedback!
          </span>
        ) : (
          <span className="text-orange-400 flex items-center gap-1">
            <ThumbsDown className="h-4 w-4" /> Bedankt! Je credit is teruggegeven.
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-white/50">Klopte dit?</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFeedback(resultId, 'up')}
        className="text-white/60 hover:text-green-400 hover:bg-green-500/10"
      >
        <ThumbsUp className="h-4 w-4 mr-1" /> Ja
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFeedback(resultId, 'down')}
        className="text-white/60 hover:text-orange-400 hover:bg-orange-500/10"
      >
        <ThumbsDown className="h-4 w-4 mr-1" /> Nee
      </Button>
    </div>
  );
};

const ShareButton = ({ result }: { result: StekResult }) => {
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    const text = `Ik heb een visplek ontdekt met StekFinder!\n${result.location.name} (${result.confidence}% zekerheid)\nhttps://www.google.com/maps/search/?api=1&query=${result.location.lat},${result.location.lng}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'StekFinder resultaat', text });
        setShared(true);
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleShare}
      className="text-white/60 hover:text-sky-400 hover:bg-sky-500/10"
    >
      {shared ? <Check className="h-4 w-4 mr-1" /> : <Share2 className="h-4 w-4 mr-1" />}
      {shared ? 'Gekopieerd!' : 'Deel je stek'}
    </Button>
  );
};

const LoadingSkeleton = () => (
  <div className="grid gap-8">
    <Card className="bg-black/20 border-white/10 text-white">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Fish className="h-8 w-8 text-sky-400 animate-bounce" />
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="w-full h-64 rounded-lg" />
          <div>
            <Skeleton className="h-6 w-1/2 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        </div>
        <Skeleton className="w-full h-[350px] rounded-lg" />
      </CardContent>
    </Card>
  </div>
);

const StekFinderResults: React.FC<StekFinderResultsProps> = ({ results, isLoading, onFeedback }) => {
  if (isLoading) return <LoadingSkeleton />;

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-16 text-white/50">
        <Fish className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>Analyseer een foto om hier de resultaten te zien.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      {results.map((result) => (
        <Card key={result.id} className="bg-black/20 border-white/10 text-white overflow-hidden animate-fade-in-up">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <CardTitle className="flex items-center text-2xl">
                  <MapPin className="mr-3 text-sky-400 shrink-0" />
                  {result.location.name}
                </CardTitle>
                <SourceBadge source={result.source} />
              </div>
              <ConfidenceBadge confidence={result.confidence} />
            </div>
            {result.reverseGeocode && (
              <div className="flex items-center gap-2 text-sm text-white/50 mt-1 ml-9">
                <Navigation className="h-3 w-3" />
                {result.reverseGeocode.displayName}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="relative">
                <img
                  src={result.imageUrl}
                  alt={`Vislocatie analyse: ${result.location?.name || 'onbekende locatie'}`}
                  className="rounded-lg w-full h-auto object-cover max-h-[400px]"
                  loading="lazy"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg flex items-center mb-2">
                    <Target className="mr-2 text-orange-400" /> Herkenningspunten
                  </h3>
                  <ul className="list-disc list-inside text-white/80 space-y-1">
                    {result.analysis.landmarks.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-lg flex items-center mb-2">
                    <Leaf className="mr-2 text-green-400" /> Vegetatie
                  </h3>
                  <ul className="list-disc list-inside text-white/80 space-y-1">
                    {result.analysis.vegetation.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-lg flex items-center mb-2">
                    <Droplet className="mr-2 text-blue-400" /> Watertype
                  </h3>
                  <p className="text-white/80">{result.analysis.water_type}</p>
                </div>
              </div>
            </div>

            {/* Kaart */}
            <LocationMap
              lat={result.location.lat}
              lng={result.location.lng}
              name={result.location.name}
              confidence={result.confidence}
            />

            {/* AI Redenering */}
            {result.reasoning && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-purple-900/20 border border-purple-500/20">
                <Brain className="text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-purple-400 mb-1">AI Redenering</p>
                  <p className="text-white/70 text-sm">{result.reasoning}</p>
                </div>
              </div>
            )}

            {/* Fun response */}
            {result.fun_response && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-orange-900/20 border border-orange-500/20">
                <Fish className="text-orange-400 shrink-0 mt-0.5" />
                <p className="text-white/80">{result.fun_response}</p>
              </div>
            )}

            {/* Vistip */}
            {result.tips && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-sky-900/20 border border-sky-500/20">
                <Lightbulb className="text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sky-400 mb-1">Vistip</p>
                  <p className="text-white/80">{result.tips}</p>
                </div>
              </div>
            )}

            {/* Feedback + Delen */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-white/10">
              <FeedbackButtons
                resultId={result.id}
                feedback={result.feedback}
                onFeedback={onFeedback}
              />
              <ShareButton result={result} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StekFinderResults;
