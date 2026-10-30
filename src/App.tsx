import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { PromptDetail } from './pages/PromptDetail';
import { SubmitPrompt } from './pages/SubmitPrompt';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-[#09090b] text-[#f4f4f5]">
          <Navbar />
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/prompts/:slug" element={<PromptDetail />} />
              <Route path="/prompt/:slug" element={<PromptDetail />} />
              <Route path="/prompts/id/:slug" element={<PromptDetail />} />
              <Route path="/submit" element={<SubmitPrompt />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </ToastProvider>
  );
}
