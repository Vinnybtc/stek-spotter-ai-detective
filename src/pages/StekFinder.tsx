
import React from 'react';
import PageLayout from '@/components/layout/PageLayout';
import StekFinderInput from '@/components/stek-finder/StekFinderInput';
import StekFinderResults from '@/components/stek-finder/StekFinderResults';
import { useStekFinder } from '@/hooks/useStekFinder';

const StekFinder = () => {
    const {
        results,
        isLoading,
        error,
        shouldHighlightInput,
        credits,
        handleSearch,
        handleClear,
        user,
    } = useStekFinder();

    return (
        <PageLayout>
            <div className="text-center">
                <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-orange-400">
                    StekFinder
                </h1>
                <p className="mt-2 text-lg text-white/70">Jouw geheime visplekdetective.</p>
                <div className="mt-6 bg-black/20 border border-white/10 rounded-2xl p-4 max-w-2xl mx-auto text-center">
                    <p className="font-bold text-sky-400">✨ Nieuw & in Bèta ✨</p>
                    <p className="mt-2 text-white/80">
                        Upload een visfoto en onze AI probeert de exacte locatie te achterhalen. We analyseren herkenningspunten, vegetatie en (indien aanwezig) de GPS-data in je foto. Omdat de tool nieuw is, kan de AI er soms naast zitten. Jouw analyses helpen ons de tool te verbeteren!
                    </p>
                </div>
            </div>
            
            <div className="max-w-3xl mx-auto mt-12">
                <StekFinderInput
                    onSearch={handleSearch}
                    isLoading={isLoading}
                    onClear={handleClear}
                    user={user}
                    credits={credits}
                    shouldHighlight={shouldHighlightInput}
                />
            </div>

            <div className="max-w-4xl mx-auto mt-12">
                {error && <div className="text-center text-red-400 p-4 bg-red-900/20 rounded-lg border border-red-500/30">{error}</div>}
                <StekFinderResults results={results} isLoading={isLoading} />
            </div>
        </PageLayout>
    );
};

export default StekFinder;
