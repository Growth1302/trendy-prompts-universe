import React from 'react';
import { Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-zinc-900 bg-zinc-950 text-zinc-400 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-display font-bold text-sm text-zinc-200">
            Trendy Prompts <span className="text-violet-400 font-light">Universe</span>
          </span>
          <span aria-hidden="true" className="text-zinc-700">·</span>
          <span className="text-xs text-zinc-500">© 2026 Trendy Prompts Universe</span>
        </div>

      </div>
    </footer>
  );
};
