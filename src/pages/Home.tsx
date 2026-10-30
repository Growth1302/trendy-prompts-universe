import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Hero } from '../components/Hero';
import { Gallery } from '../components/Gallery';
import { useStore } from '../services/store';
import { updatePageSEO } from '../utils/seo';

export const Home: React.FC = () => {
  const store = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const categories = store.getCategories();

  useEffect(() => {
    updatePageSEO({
      title: 'Trendy Prompts Universe — Discover the Prompt Behind Every Image',
      description: 'Explore incredible AI art. Copy verified prompts. Discover trending styles, lighting recipes, and models across 10+ categories.',
    });
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const newParams = new URLSearchParams(searchParams);
    if (query.trim()) {
      newParams.set('q', query.trim());
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams);
  };

  return (
    <main>
      <Hero onSearch={handleSearch} />
      <Gallery
        categories={categories}
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
      />
    </main>
  );
};
