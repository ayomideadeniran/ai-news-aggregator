import React from 'react';
import { ExternalLink, TrendingUp, Tag, Globe, Bookmark, Share2 } from 'lucide-react';

const NewsCard = ({ article, index, onSave, isSaved, onShare }) => {
    const { title, ai_summary, ai_score, ai_category, source, link, sentiment } = article;

    const getScoreColor = (score) => {
        if (score >= 8) return 'var(--success)';
        if (score >= 6) return 'var(--warning)';
        return 'var(--danger)';
    };

    const getSentimentClass = (s) => {
        const lower = (s || 'neutral').toLowerCase();
        if (lower.includes('bullish') || lower.includes('positive')) return 'sentiment-bullish';
        if (lower.includes('bearish') || lower.includes('negative')) return 'sentiment-bearish';
        return 'sentiment-neutral';
    };

    return (
        <div
            className="card animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-purple">
                        <Tag size={12} style={{ marginRight: '0.25rem' }} /> {ai_category || 'Tech'}
                    </span>
                    <span className="badge badge-blue">
                        <Globe size={12} style={{ marginRight: '0.25rem' }} /> {source}
                    </span>
                    <span className={`badge ${getSentimentClass(sentiment)}`}>
                        {sentiment || 'Neutral'}
                    </span>
                </div>

                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSave(article);
                    }}
                    className="btn-icon"
                    style={{
                        color: isSaved ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        flexShrink: 0,
                        marginTop: '-0.25rem',
                        marginRight: '-0.25rem'
                    }}
                    title={isSaved ? "Saved" : "Save Article"}
                >
                    <Bookmark size={20} fill={isSaved ? 'currentColor' : 'none'} />
                </button>
            </div>

            <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '700',
                marginBottom: '0.75rem',
                lineHeight: '1.5',
                color: 'var(--text-primary)',
                display: '-webkit-box',
                WebkitLineClamp: '3',
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
            }}>
                {title}
            </h3>

            <p style={{
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
                marginBottom: '1.5rem',
                lineHeight: '1.6',
                display: '-webkit-box',
                WebkitLineClamp: '4',
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
            }}>
                {ai_summary}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: '700', fontSize: '0.875rem' }}>
                    <TrendingUp size={16} style={{ color: getScoreColor(ai_score) }} />
                    <span style={{ color: 'var(--text-primary)' }}>{ai_score}/10</span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onShare(article);
                        }}
                        className="btn"
                        style={{
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-primary)',
                            padding: '0.5rem',
                            minWidth: 'auto',
                            borderRadius: '0.5rem'
                        }}
                        title="Share"
                    >
                        <Share2 size={18} />
                    </button>

                    <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                        style={{
                            textDecoration: 'none',
                            padding: '0.5rem 1rem',
                            fontSize: '0.8125rem',
                            borderRadius: '0.5rem'
                        }}
                    >
                        Read <ExternalLink size={14} style={{ marginLeft: '0.25rem' }} />
                    </a>
                </div>
            </div>
        </div>
    );
};

export default NewsCard;
