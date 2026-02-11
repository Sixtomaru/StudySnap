import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (city: string) => void;
  isLoading: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSearch(input.trim());
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto relative z-10">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 to-cyan-300 rounded-full blur opacity-30 group-hover:opacity-70 transition duration-1000"></div>
        <div className="relative flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-full shadow-lg p-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Introduce una ciudad (ej: Madrid, Bogotá...)"
            className="flex-grow bg-transparent text-white placeholder-blue-100 px-6 py-4 outline-none text-base md:text-lg font-medium rounded-full select-text" 
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-white text-blue-600 p-3 rounded-full hover:bg-blue-50 hover:text-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {isLoading ? (
              <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
            ) : (
              <Search size={24} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchBar;