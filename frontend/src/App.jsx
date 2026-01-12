import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Zap, RefreshCw, AlertCircle, Filter, Bookmark, TrendingUp } from 'lucide-react';
import NewsCard from './components/NewsCard';
import SearchBar from './components/SearchBar';
import ThemeToggle from './components/ThemeToggle';
import { ThemeProvider } from './context/ThemeContext';
import { getUserId } from './utils/session';

const CATEGORIES = ['All', 'AI/ML', 'Web3/Crypto', 'FinTech', 'Cloud/Infra', 'Mobile/Consumer', 'Other'];

function AppContent() {
  const [news, setNews] = useState([]);
  const [savedArticles, setSavedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [currentQuery, setCurrentQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [view, setView] = useState('trending'); // 'trending' or 'saved'

  const fetchNews = async (query = '', forceRefresh = false) => {
    setLoading(true);
    setError(null);
    setCurrentQuery(query);
    setActiveCategory('All');
    setView('trending');

    try {
      let url = '/api/v1/trending';
      const params = [];

      if (query) params.push(`q=${encodeURIComponent(query)}`);
      if (forceRefresh) params.push('refresh=true');

      if (query) {
        url = `/api/v1/trending/search?${params.join('&')}`;
      } else if (forceRefresh) {
        url = `/api/v1/trending?refresh=true`;
      }

      const response = await axios.get(url, {
        headers: { 'x-user-id': getUserId() }
      });

      const data = response.data.articles || response.data || [];
      setNews(Array.isArray(data) ? data : []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching news:', err);
      setError('Failed to load news. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedArticles = async () => {
    setLoading(true);
    setError(null);
    setView('saved');
    try {
      const response = await axios.get('/api/v1/trending/saved', {
        headers: { 'x-user-id': getUserId() }
      });
      setSavedArticles(response.data.articles || []);
    } catch (err) {
      console.error('Error fetching saved articles:', err);
      setError('Failed to load saved articles.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (article) => {
    console.log('handleSave called for:', article.title);
    try {
      await axios.post('/api/v1/trending/save', { article }, {
        headers: { 'x-user-id': getUserId() }
      });
      console.log('Article saved successfully on server');
      // Refresh saved articles list
      const response = await axios.get('/api/v1/trending/saved', {
        headers: { 'x-user-id': getUserId() }
      });
      setSavedArticles(response.data.articles || []);
    } catch (err) {
      console.error('Error saving article:', err);
    }
  };

  useEffect(() => {
    fetchNews();
    // Initial fetch of saved articles to know which ones are saved
    const loadInitialSaved = async () => {
      try {
        const response = await axios.get('/api/v1/trending/saved', {
          headers: { 'x-user-id': getUserId() }
        });
        setSavedArticles(response.data.articles || []);
      } catch (e) { }
    };
    loadInitialSaved();
  }, []);

  const displayNews = view === 'trending' ? news : savedArticles;

  const filteredNews = activeCategory === 'All'
    ? displayNews
    : displayNews.filter(article =>
      article.ai_category && article.ai_category.includes(activeCategory.split('/')[0])
    );

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
      {/* Navbar */}
      <nav style={{
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--nav-bg)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        marginBottom: '2rem',
        transition: 'background-color 0.3s'
      }}>
        <div className="container" style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem' }}>
          {/* Logo */}
          <div
            onClick={() => fetchNews()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 'fit-content', cursor: 'pointer' }}
          >
            <div style={{
              background: 'var(--accent-gradient)',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              display: 'flex'
            }}>
              <Zap color="white" size={24} fill="white" />
            </div>
            <h1 className="logo-text" style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.025em' }}>
              AI News<span style={{ color: 'var(--accent-primary)' }}>Aggregator</span>
            </h1>
          </div>

          {/* Search Bar */}
          <div style={{ flex: 1, maxWidth: '500px' }} className="desktop-search">
            <SearchBar onSearch={fetchNews} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => view === 'trending' ? fetchSavedArticles() : fetchNews()}
              className="btn"
              style={{
                background: view === 'saved' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: view === 'saved' ? 'white' : 'var(--text-primary)',
                gap: '0.5rem'
              }}
            >
              {view === 'trending' ? <Bookmark size={18} /> : <TrendingUp size={18} />}
              <span className="mobile-hide">{view === 'trending' ? 'Saved' : 'Trending'}</span>
            </button>

            <ThemeToggle />

            <button
              onClick={() => fetchNews(currentQuery, true)}
              className="btn"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                gap: '0.5rem',
                minWidth: 'fit-content'
              }}
              disabled={loading}
            >
              <RefreshCw size={18} className={loading ? 'spin' : ''} />
              <span className="mobile-hide">Refresh</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container">
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                {view === 'saved' ? 'Your Saved Articles' : (currentQuery ? `Results for "${currentQuery}"` : 'Trending Now')}
              </h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                {view === 'saved' ? `You have ${savedArticles.length} saved stories.` : (currentQuery ? `Found ${news.length} articles` : 'Top tech stories curated by AI.')}
                {lastUpdated && view === 'trending' && ` Updated at ${lastUpdated.toLocaleTimeString()}`}
              </p>
            </div>

            {/* Category Filter */}
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', maxWidth: '100%' }} className="no-scrollbar">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`badge ${activeCategory === cat ? 'badge-active' : ''}`}
                  style={{
                    cursor: 'pointer',
                    border: '1px solid var(--border-color)',
                    background: activeCategory === cat ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                    color: activeCategory === cat ? 'white' : 'var(--text-secondary)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--danger)',
            borderRadius: '0.5rem',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <AlertCircle /> {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem' }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card" style={{ height: '300px', opacity: 0.5, animation: 'pulse 2s infinite' }}></div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem' }}>
            {filteredNews.map((article, index) => (
              <NewsCard
                key={article.link || index}
                article={article}
                index={index}
                onSave={handleSave}
                isSaved={savedArticles.some(a => a.link === article.link)}
              />
            ))}
          </div>
        )}

        {!loading && filteredNews.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
            <Filter size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ fontSize: '1.25rem' }}>{view === 'saved' ? "You haven't saved any articles yet." : "No articles found matching your criteria."}</p>
            {activeCategory !== 'All' && (
              <button
                onClick={() => setActiveCategory('All')}
                className="btn btn-primary"
                style={{ marginTop: '1rem' }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </main>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.3; } }
        
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        @media (max-width: 768px) {
          .desktop-search { display: none !important; }
          .mobile-search { display: block !important; }
          .mobile-hide { display: none; }
          .logo-text { font-size: 1.25rem !important; }
        }
      `}</style>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
