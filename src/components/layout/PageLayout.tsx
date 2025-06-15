
import React from 'react';

const PageLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="relative min-h-screen bg-gray-900 text-white selection:bg-sky-300 selection:text-sky-900">
            <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.05] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
            <main className="relative z-10 container mx-auto px-4 py-8 md:py-16">
                {children}
            </main>
        </div>
    );
};

export default PageLayout;
