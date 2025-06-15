
import React from 'react';

const PageLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="relative min-h-screen bg-gray-900 text-white selection:bg-sky-300 selection:text-sky-900">
            <main className="relative container mx-auto px-4 py-8 md:py-16">
                {children}
            </main>
        </div>
    );
};

export default PageLayout;
