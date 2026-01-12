import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Zap, RefreshCw, AlertCircle, Filter, Bookmark, TrendingUp, Info, CheckCircle, XCircle, Share2, Search, Menu, X } from 'lucide-react';
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
  const [activeSource, setActiveSource] = useState('All');
  const [view, setView] = useState('trending'); // 'trending' or 'saved'
  const [toasts, setToasts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleShare = async (article) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.ai_summary,
          url: article.link,
        });
        addToast('Shared successfully!', 'success');
      } catch (err) {
        if (err.name !== 'AbortError') {
          addToast('Could not share.', 'error');
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(article.link);
        addToast('Link copied to clipboard!', 'success');
      } catch (err) {
        addToast('Failed to copy link.', 'error');
      }
    }
  };

  const fetchNews = async (query = '', forceRefresh = false, pageNum = 1) => {
    if (pageNum === 1) {
      setLoading(true);
      if (!forceRefresh) setNews([]);
    }
    setError(null);
    setCurrentQuery(query);
    setActiveCategory('All');
    setActiveSource('All');
    setView('trending');
    setIsMobileSearchOpen(false);

    try {
      let url = `/api/v1/trending?page=${pageNum}&limit=12`;
      if (query) {
        url = `/api/v1/trending/search?q=${encodeURIComponent(query)}&page=${pageNum}&limit=12`;
      }
      if (forceRefresh) {
        url += '&refresh=true';
      }

      const response = await axios.get(url, {
        headers: { 'x-user-id': getUserId() }
      });

      const data = response.data.articles || [];
      setNews(prev => pageNum === 1 ? data : [...prev, ...data]);
      setHasMore(response.data.hasMore);
      setPage(pageNum);
      setLastUpdated(new Date());

      if (forceRefresh) addToast('News feed refreshed!', 'success');
    } catch (err) {
      console.error('Error fetching news:', err);
      setError('Failed to load news. Please try again later.');
      addToast('Failed to load news.', 'error');
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
      addToast('Failed to load saved articles.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (article) => {
    try {
      const response = await axios.post('/api/v1/trending/save', { article }, {
        headers: { 'x-user-id': getUserId() }
      });

      if (response.data.message === 'Article already saved.') {
        addToast('Article already in your collection.', 'info');
      } else {
        addToast('Article saved successfully!', 'success');
      }

      const savedRes = await axios.get('/api/v1/trending/saved', {
        headers: { 'x-user-id': getUserId() }
      });
      setSavedArticles(savedRes.data.articles || []);
    } catch (err) {
      console.error('Error saving article:', err);
      addToast('Failed to save article.', 'error');
    }
  };

  useEffect(() => {
    fetchNews();
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

  const loadMore = () => {
    if (!loading && hasMore && view === 'trending') {
      fetchNews(currentQuery, false, page + 1);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop + 200 >= document.documentElement.offsetHeight) {
        loadMore();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore, page, currentQuery, view]);

  const displayNews = view === 'trending' ? news : savedArticles;
  const sources = ['All', ...new Set(displayNews.map(a => a.source).filter(Boolean))];

  const filteredNews = displayNews.filter(article => {
    const categoryMatch = activeCategory === 'All' ||
      (article.ai_category && article.ai_category.includes(activeCategory.split('/')[0]));
    const sourceMatch = activeSource === 'All' || article.source === activeSource;
    return categoryMatch && sourceMatch;
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav style={{
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--nav-bg)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        transition: 'all 0.3s ease'
      }}>
        <div className="container" style={{ height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
          {/* Logo */}
          <div onClick={() => fetchNews()} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', flexShrink: 0 }}>
            <div style={{ background: 'var(--accent-gradient)', padding: '0.5rem', borderRadius: '0.75rem', display: 'flex', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>
              <Zap color="white" size={20} fill="white" />
            </div>
            <h1 className="logo-text" style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em', margin: 0 }}>
              AI News<span style={{ color: 'var(--accent-primary)' }}>Aggregator</span>
            </h1>
          </div>

          {/* Desktop Search */}
          <div style={{ flex: 1, maxWidth: '480px' }} className="desktop-only">
            <SearchBar onSearch={fetchNews} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className="btn-icon mobile-only"
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              style={{ color: isMobileSearchOpen ? 'var(--accent-primary)' : 'inherit' }}
            >
              {isMobileSearchOpen ? <X size={20} /> : <Search size={20} />}
            </button>

            <button
              onClick={() => view === 'trending' ? fetchSavedArticles() : fetchNews()}
              className="btn"
              style={{
                background: view === 'saved' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: view === 'saved' ? 'white' : 'var(--text-primary)',
                padding: '0.5rem 0.75rem'
              }}
            >
              {view === 'trending' ? <Bookmark size={18} /> : <TrendingUp size={18} />}
              <span className="desktop-only">{view === 'trending' ? 'Saved' : 'Trending'}</span>
            </button>

            <ThemeToggle />

            <button
              onClick={() => fetchNews(currentQuery, true)}
              className="btn desktop-only"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              disabled={loading}
            >
              <RefreshCw size={18} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Mobile Search Overlay */}
        {isMobileSearchOpen && (
          <div className="mobile-only animate-fade-in" style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
            <SearchBar onSearch={fetchNews} />
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="container" style={{ flex: 1, padding: '2rem 1.5rem 4rem' }}>
        <header style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.25rem)', fontWeight: '800', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                {view === 'saved' ? 'Your Saved Articles' : (currentQuery ? `Results for "${currentQuery}"` : 'Trending Now')}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                {view === 'saved' ? `You have ${savedArticles.length} saved stories.` : (currentQuery ? `Found ${news.length} articles` : 'Top tech stories curated by AI.')}
                {lastUpdated && view === 'trending' && ` • Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Category Filter */}
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }} className="no-scrollbar">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`badge ${activeCategory === cat ? 'badge-active' : ''}`}
                    style={{
                      cursor: 'pointer',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Source Filter */}
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem', alignItems: 'center' }} className="no-scrollbar">
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.25rem', flexShrink: 0 }}>Sources</span>
                {sources.map(src => (
                  <button
                    key={src}
                    onClick={() => setActiveSource(src)}
                    className={`badge ${activeSource === src ? 'badge-active' : ''}`}
                    style={{
                      cursor: 'pointer',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      textTransform: 'none'
                    }}
                  >
                    {src}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '1rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <AlertCircle size={20} /> {error}
          </div>
        )}

        <div className="news-grid">
          {filteredNews.map((article, index) => (
            <NewsCard
              key={article.link || index}
              article={article}
              index={index}
              onSave={handleSave}
              isSaved={savedArticles.some(a => a.link === article.link)}
              onShare={handleShare}
            />
          ))}
          {loading && [1, 2, 3].map((i) => (
            <div key={`skeleton-${i}`} className="card" style={{ height: '320px', opacity: 0.5, animation: 'pulse 2s infinite' }}></div>
          ))}
        </div>

        {!loading && filteredNews.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-secondary)' }}>
            <Filter size={48} style={{ marginBottom: '1.5rem', opacity: 0.3 }} />
            <p style={{ fontSize: '1.125rem', fontWeight: '500' }}>{view === 'saved' ? "You haven't saved any articles yet." : "No articles found matching your criteria."}</p>
            {(activeCategory !== 'All' || activeSource !== 'All') && (
              <button onClick={() => { setActiveCategory('All'); setActiveSource('All'); }} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
                Clear Filters
              </button>
            )}
          </div>
        )}

        {hasMore && view === 'trending' && !loading && (
          <div style={{ textAlign: 'center', marginTop: '3rem', padding: '2rem' }}>
            <div className="spin" style={{ color: 'var(--accent-primary)' }}><RefreshCw size={32} /></div>
          </div>
        )}
      </main>

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.type === 'success' && <CheckCircle size={20} color="var(--success)" />}
            {toast.type === 'error' && <XCircle size={20} color="var(--danger)" />}
            {toast.type === 'info' && <Info size={20} color="var(--accent-primary)" />}
            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{toast.message}</span>
          </div>
        ))}
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.2; } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
        }
        
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .toast-container { top: 1rem; right: 1rem; left: 1rem; }
          .toast { min-width: auto; width: 100%; }
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
