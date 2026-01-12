import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

const SearchBar = ({ onSearch }) => {
    const [query, setQuery] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSearch(query);
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
                transition: 'all 0.3s ease'
            }}
        >
            <div style={{
                position: 'absolute',
                left: '1rem',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
                color: 'var(--text-secondary)',
                zIndex: 1
            }}>
                <Search size={18} />
            </div>

            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search AI news..."
                style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.75rem',
                    borderRadius: '1rem',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: 'none'
                }}
                className="search-input"
            />

            {query && (
                <button
                    type="button"
                    onClick={clearSearch}
                    style={{
                        position: 'absolute',
                        right: '0.75rem',
                        background: 'var(--bg-secondary)',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '50%',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                >
                    <X size={14} />
                </button>
            )}

            <style>{`
                .search-input:focus {
                    border-color: var(--accent-primary) !important;
                    background-color: var(--bg-secondary) !important;
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1) !important;
                }
                
                @media (max-width: 768px) {
                    .search-input {
                        font-size: 1rem; /* Prevent zoom on iOS */
                        padding: 0.625rem 1rem 0.625rem 2.5rem;
                    }
                }
            `}</style>
        </form>
    );
};

export default SearchBar;
