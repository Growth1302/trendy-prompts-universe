import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Menu, X, PlusCircle, Compass, Grid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  onOpenSubmit?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSubmit }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = (e: React.MouseEvent, targetId: string, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    const scrollToTarget = () => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        if (targetId === 'search-input') {
          setTimeout(() => el.focus(), 350);
        }
      }
    };

    if (location.pathname === '/') {
      scrollToTarget();
    } else {
      navigate(href);
      setTimeout(scrollToTarget, 150);
    }
  };

  const navLinks = [
    { label: 'Explore', href: '/#search-input', targetId: 'search-input', icon: Compass },
    { label: 'Categories', href: '/#categories', targetId: 'categories', icon: Grid },
  ];

  const isActive = (path: string) => {
    if (path.startsWith('/#') || path.startsWith('/?')) {
      return location.pathname === '/' && !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/submit');
    }
    return location.pathname === path;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <Link
          to="/"
          className="flex items-center gap-2.5 text-base sm:text-lg font-bold tracking-tight text-zinc-100 whitespace-nowrap shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-md"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-display tracking-tight text-white group-hover:text-violet-200 transition-colors">
            Trendy Prompts <span className="text-violet-400 font-light">Universe</span>
          </span>
        </Link>

        {/* Zone 2: Single-line Text Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.targetId, link.href)}
              className="whitespace-nowrap shrink-0 text-zinc-400 hover:text-zinc-100 transition-colors py-1 cursor-pointer"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          {onOpenSubmit ? (
            <button
              onClick={onOpenSubmit}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 active:scale-[0.98] rounded-lg shadow-md shadow-violet-900/30 transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Submit Prompt</span>
            </button>
          ) : (
            <Link
              to="/submit"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 active:scale-[0.98] rounded-lg shadow-md shadow-violet-900/30 transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Submit Prompt</span>
            </Link>
          )}

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            aria-label="Toggle mobile navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-lg px-4 pt-3 pb-6 space-y-3"
          >
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.targetId, link.href)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/80 rounded-lg transition-colors cursor-pointer"
                  >
                    <Icon className="w-4 h-4 text-violet-400" />
                    <span>{link.label}</span>
                  </a>
                );
              })}
            </div>

            <div className="pt-2 border-t border-zinc-800/80">
              <Link
                to="/submit"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors shadow-lg shadow-violet-900/40"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Submit Your AI Prompt</span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
