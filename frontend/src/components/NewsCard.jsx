import React from 'react';
import { ExternalLink, TrendingUp, Tag, Globe } from 'lucide-react';

const NewsCard = ({ article, index }) => {
    const { title, ai_summary, ai_score, ai_category, source, url } = article;

    // Determine score color
    const getScoreColor = (score) => {
        if (score >= 8) return 'text-green-400';
        if (score >= 6) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div
            className="card animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <span className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Tag size={12} /> {ai_category || 'Tech'}
                </span>
                <span className="badge badge-blue" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Globe size={12} /> {source}
                </span>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.75rem', lineHeight: '1.4' }}>
                {title}
            </h3>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                {ai_summary}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
                    <TrendingUp size={16} className={getScoreColor(ai_score)} />
                    <span style={{ color: 'var(--text-primary)' }}>{ai_score}/10</span>
                </div>

                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ textDecoration: 'none', gap: '0.5rem' }}
                >
                    Read Article <ExternalLink size={16} />
                </a>
            </div>
        </div>
    );
};

export default NewsCard;
