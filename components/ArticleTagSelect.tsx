import React, { useState, useRef, useEffect } from 'react';
import { X, Search } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  slug: string;
  is_active?: boolean;
}

interface ArticleTagSelectProps {
  tags: Tag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  maxTags?: number;
}

export function ArticleTagSelect({ tags, selectedIds, onChange, maxTags = 5 }: ArticleTagSelectProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeTags = tags.filter(t => t.is_active !== false);
  const selectedTags = activeTags.filter(t => selectedIds.includes(t.id));
  
  const filteredTags = activeTags.filter(t => 
    t.name.toLowerCase().includes(query.toLowerCase()) && !selectedIds.includes(t.id)
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (tagId: string) => {
    if (selectedIds.length < maxTags) {
      onChange([...selectedIds, tagId]);
      setQuery('');
      setIsOpen(false);
    }
  };

  const handleRemove = (tagId: string) => {
    onChange(selectedIds.filter(id => id !== tagId));
  };

  return (
    <div className="w-full relative" ref={containerRef}>
      {/* Selected Chips */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedTags.map(tag => (
            <span key={tag.id} className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 text-sm font-medium rounded-full border border-slate-200">
              {tag.name}
              <button
                type="button"
                onClick={() => handleRemove(tag.id)}
                className="hover:bg-slate-200 p-0.5 rounded-full transition-colors"
                aria-label={`Hapus tag ${tag.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all disabled:opacity-50 disabled:bg-slate-50"
          placeholder={selectedIds.length >= maxTags ? 'Batas maksimal tag tercapai' : 'Cari dan pilih tag...'}
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          disabled={selectedIds.length >= maxTags}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
           <span className="text-xs text-slate-400 font-medium">{selectedIds.length}/{maxTags}</span>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && query && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filteredTags.length > 0 ? (
            <ul className="py-1">
              {filteredTags.map(tag => (
                <li key={tag.id}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    onClick={() => handleSelect(tag.id)}
                  >
                    {tag.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 text-sm text-slate-500 text-center">
              Tag tidak ditemukan
            </div>
          )}
        </div>
      )}
    </div>
  );
}
