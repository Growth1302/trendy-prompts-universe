import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';
import { updatePageSEO } from '../utils/seo';

export const NotFound: React.FC = () => {
  useEffect(() => {
    updatePageSEO({
      title: 'Page Not Found — Trendy Prompts Universe',
      description: 'The requested page or AI prompt does not exist in the universe.',
    });
  }, []);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
        <Compass className="w-8 h-8 text-violet-400" />
      </div>
      <h1 className="text-3xl font-bold font-display text-white mb-2">404 - Lost in the Universe</h1>
      <p className="text-zinc-400 text-sm max-w-md mb-8">
        We couldn't find the page or prompt you were looking for. It may have moved or been retired.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-900/30 transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Universe Gallery</span>
      </Link>
    </div>
  );
};
