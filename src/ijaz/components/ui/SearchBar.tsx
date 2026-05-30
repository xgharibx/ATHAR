
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { searchMiracles, getSemanticSuggestions } from '@/ijaz/lib/search';
import { SearchResult } from '@/ijaz/types';
import { getCategoryLabel, getVisualizationColor, truncate } from '@/ijaz/lib/utils';

interface SearchBarProps {
  large?: boolean;
  autoFocus?: boolean;
}

export default function SearchBar({ large = false, autoFocus = false }: SearchBarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (value.trim().length >= 2) {
      const searchResults = searchMiracles(value);
      setResults(searchResults.slice(0, 8));
      setSuggestions(getSemanticSuggestions(value));
      setIsOpen(true);
      setSelectedIndex(-1);
    } else {
      setResults([]);
      setSuggestions([]);
      setIsOpen(false);
    }
  }, []);

  const handleSelect = useCallback(
    (slug: string) => {
      setIsOpen(false);
      setQuery('');
      navigate(`/ijaz/miracles/${slug}`);
    },
    [navigate]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
      } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
        handleSelect(results[selectedIndex].miracle.slug);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    },
    [results, selectedIndex, handleSelect]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input */}
      <div
        className={`relative flex items-center gap-3 ${
          large ? 'px-6 py-4' : 'px-4 py-3'
        } rounded-2xl bg-deep-navy/80 backdrop-blur-xl border transition-all duration-300 ${
          isOpen ? 'border-gold-primary/50 shadow-gold-md' : 'border-border-subtle hover:border-border-gold'
        }`}
      >
        {/* Search Icon */}
        <svg
          width={large ? '22' : '18'}
          height={large ? '22' : '18'}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gold-primary flex-shrink-0"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          aria-label="بحث في المعجزات"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder="ابحث عن معجزة... كيف بدأ الكون؟ ما هي مراحل الجنين؟"
          autoFocus={autoFocus}
          className={`flex-1 bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted font-tajawal ${
            large ? 'text-lg' : 'text-sm'
          }`}
          dir="rtl"
        />

        {query && (
          <button
            type="button"
            aria-label="مسح البحث"
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Semantic Suggestions */}
      {suggestions.length > 0 && isOpen && (
        <div className="flex flex-wrap gap-2 mt-3">
          {suggestions.map((suggestion) => (
            <button
              type="button"
              key={suggestion}
              aria-label={`ابحث عن ${suggestion}`}
              onClick={() => handleSearch(suggestion)}
              className="px-3 py-1 rounded-full bg-gold-primary/10 border border-gold-primary/20 text-gold-primary text-xs font-tajawal hover:bg-gold-primary/20 transition-all"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Results Dropdown */}
      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 rounded-2xl bg-deep-navy/95 backdrop-blur-xl border border-border-gold shadow-gold-lg overflow-hidden"
          >
            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {results.map((result, i) => {
                const accentColor = getVisualizationColor(result.miracle.visualizationType);
                return (
                  <button
                    type="button"
                    key={result.miracle.id}
                    aria-label={`فتح ${result.miracle.titleAr}`}
                    onClick={() => handleSelect(result.miracle.slug)}
                    className={`w-full text-right p-4 rounded-xl transition-all flex items-start gap-4 ${
                      selectedIndex === i
                        ? 'bg-gold-primary/10 border border-gold-primary/20'
                        : 'hover:bg-space-blue/50 border border-transparent'
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                      style={{ background: `${accentColor}15` }}
                    >
                      {result.miracle.visualizationType === 'cosmos' && '🌌'}
                      {result.miracle.visualizationType === 'microscopic' && '🧬'}
                      {result.miracle.visualizationType === 'earth' && '🌍'}
                      {result.miracle.visualizationType === 'timeline' && '📜'}
                      {result.miracle.visualizationType === 'logic' && '🧠'}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-gold-primary font-amiri text-base font-bold truncate">
                        {result.miracle.titleAr}
                      </h4>
                      <p className="text-text-secondary text-xs font-tajawal mt-0.5">
                        {result.miracle.title}
                      </p>
                      <p className="text-text-muted text-xs font-tajawal mt-1 line-clamp-1">
                        {truncate(result.miracle.summaryAr, 100)}
                      </p>
                    </div>

                    {/* Score */}
                    <div className="flex-shrink-0">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: accentColor,
                          boxShadow: `0 0 8px ${accentColor}`,
                          opacity: result.score,
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-border-subtle px-4 py-2 text-center">
              <span className="text-text-muted text-xs font-tajawal">
                {results.length} نتيجة • اضغط Enter للاختيار
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
