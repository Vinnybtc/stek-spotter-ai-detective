import PageLayout from '@/components/layout/PageLayout';
import StekFinderInput from '@/components/stek-finder/StekFinderInput';
import StekFinderResults from '@/components/stek-finder/StekFinderResults';
import SearchHistory from '@/components/stek-finder/SearchHistory';
import Confetti from '@/components/stek-finder/Confetti';
import { useStekFinder } from '@/hooks/useStekFinder';
import { Fish } from 'lucide-react';

const StekFinder = () => {
  const {
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
    totalAnalyses,
  } = useStekFinder();

  const showConfetti = results.length > 0 && results[0].confidence >= 75;

  return (
    <PageLayout>
      <Confetti trigger={showConfetti} />
      <div className="text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-orange-400">
          StekFinder
        </h1>
        <p className="mt-2 text-lg text-white/70">Jouw geheime visplekdetective.</p>
        <div className="mt-6 bg-black/20 border border-white/10 rounded-2xl p-4 max-w-2xl mx-auto text-center">
          <p className="font-bold text-sky-400">&#10024; Nieuw &amp; in B&egrave;ta &#10024;</p>
          <p className="mt-2 text-white/80">
            Upload een visfoto en onze AI probeert de exacte locatie te achterhalen.
            We analyseren herkenningspunten, vegetatie en watertype om jouw stek te vinden.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto mt-12">
        <StekFinderInput
          onSearch={handleSearch}
          isLoading={isLoading}
          loadingStep={loadingStep}
          onClear={handleClear}
          user={user}
          creditsInfo={creditsInfo}
          shouldHighlight={shouldHighlightInput}
          totalAnalyses={totalAnalyses}
        />
      </div>

      <div className="max-w-4xl mx-auto mt-12">
        {error && (
          <div className="text-center text-red-400 p-4 bg-red-900/20 rounded-lg border border-red-500/30 mb-8">
            {error}
          </div>
        )}

        {/* Fun fallback message */}
        {funMessage && !error && (
          <div className="text-center p-8 bg-gradient-to-b from-sky-900/30 to-black/20 rounded-2xl border border-sky-500/20 mb-8 animate-fade-in-up">
            <div className="text-5xl mb-4">🐟</div>
            <p className="text-xl font-bold text-white/90 mb-2">{funMessage}</p>
            <p className="text-sm text-white/50 mt-3">
              Tip: upload een foto van de plek waar je vist — water, oever, brug, steiger. Dat werkt het beste!
            </p>
            <p className="text-xs text-green-400 mt-2">Je credit is niet afgeschreven.</p>
          </div>
        )}

        <StekFinderResults
          results={results}
          isLoading={isLoading}
          onFeedback={handleFeedback}
        />
      </div>

      {/* Zoekgeschiedenis */}
      <div className="max-w-3xl mx-auto mt-12">
        <SearchHistory history={history} onClear={clearHistory} />
      </div>
    </PageLayout>
  );
};

export default StekFinder;
