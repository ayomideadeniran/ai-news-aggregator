import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

const SearchBar = ({ onSearch }) => {
    const [query, setQuery] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query);
        }
    };

    const clearSearch = () => {
        setQuery('');
        onSearch('');
    };

    return (
        <form
            onSubmit={handleSubmit}
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                maxWidth: '400px'
            }}
        >
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search AI news..."
                style={{
                    width: '100%',
                    padding: '0.5rem 1rem 0.5rem 2.5rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: '0.95rem',
                    transition: 'border-color 0.2s'
                }}
                className="search-input"
            />
            <Search
                size={18}
                style={{
                    position: 'absolute',
                    left: '0.75rem',
                    color: 'var(--text-secondary)'
                }}
            />
            {query && (
                <button
                    type="button"
                    onClick={clearSearch}
                    style={{
                        position: 'absolute',
                        right: '0.5rem',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <X size={16} />
                </button>
            )}
            <style>{`
        .search-input:focus {
          border-color: var(--accent-primary) !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
      `}</style>
        </form>
    );
};

export default SearchBar;
