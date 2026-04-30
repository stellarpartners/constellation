import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import type { Stats, Journalist, Outlet, TopOutlet } from './api';

// ─── Views ───────────────────────────────────────────────────────────────────

type View = 'top-outlets' | 'cross-platform' | 'search-journalists' | 'search-outlets' | 'journalist-detail' | 'outlet-detail';
type Entity = { kind: 'journalist' | 'outlet'; id: number } | null;

function App() {
  const [view, setView] = useState<View>('top-outlets');
  const [entity, setEntity] = useState<Entity>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch(() => setError('Failed to connect to API'));
  }, []);

  const navigate = useCallback((v: View, e?: Entity) => {
    setView(v);
    setEntity(e ?? null);
  }, []);

  return (
    <div className="app-container">
      {error && <div className="error-msg">{error}</div>}

      <header className="header">
        <h1>Constellation Studio</h1>
        <p className="subtitle">Media & Journalist Intelligence</p>
      </header>

      {stats && (
        <div className="stats-grid">
          <StatCard label="Journalists" value={stats.total_journalists} />
          <StatCard label="Media Outlets" value={stats.total_outlets} />
          <StatCard label="Relationships" value={stats.total_relationships} />
          <StatCard label="EU Coverage" value={stats.outlets_with_eci} sub="outlets with ECI articles" />
          <StatCard label="Progressive" value={stats.progressive_outlets} sub="outlets (score ≥ 2)" />
        </div>
      )}

      {view !== 'journalist-detail' && view !== 'outlet-detail' && (
        <nav className="nav-tabs">
          <div className="tab-buttons">
            <button
              className={view === 'top-outlets' ? 'active' : ''}
              onClick={() => navigate('top-outlets')}
            >
              Top Outlets
            </button>
            <button
              className={view === 'cross-platform' ? 'active' : ''}
              onClick={() => navigate('cross-platform')}
            >
              Cross-Platform
            </button>
            <button
              className={`secondary ${view === 'search-journalists' ? 'active' : ''}`}
              onClick={() => navigate('search-journalists')}
            >
              Journalists
            </button>
            <button
              className={`secondary ${view === 'search-outlets' ? 'active' : ''}`}
              onClick={() => navigate('search-outlets')}
            >
              Outlets
            </button>
          </div>

          {view === 'top-outlets' && <TopOutletsView onSelect={(id) => navigate('outlet-detail', { kind: 'outlet', id })} />}
          {view === 'cross-platform' && <CrossPlatformView onSelect={(id) => navigate('journalist-detail', { kind: 'journalist', id })} />}
          {view === 'search-journalists' && <SearchJournalistsView onSelect={(id) => navigate('journalist-detail', { kind: 'journalist', id })} />}
          {view === 'search-outlets' && <SearchOutletsView onSelect={(id) => navigate('outlet-detail', { kind: 'outlet', id })} />}
        </nav>
      )}

      {view === 'journalist-detail' && entity?.kind === 'journalist' && (
        <JournalistDetail
          id={entity.id}
          onBack={() => navigate('top-outlets')}
          onSelectOutlet={(id) => navigate('outlet-detail', { kind: 'outlet', id })}
        />
      )}

      {view === 'outlet-detail' && entity?.kind === 'outlet' && (
        <OutletDetail
          id={entity.id}
          onBack={() => navigate('top-outlets')}
          onSelectJournalist={(id) => navigate('journalist-detail', { kind: 'journalist', id })}
        />
      )}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-number">{value.toLocaleString()}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// ─── Top Outlets View ────────────────────────────────────────────────────────

function TopOutletsView({ onSelect }: { onSelect: (id: number) => void }) {
  const [outlets, setOutlets] = useState<TopOutlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.getTopOutlets(20)
      .then(({ outlets }) => setOutlets(outlets))
      .catch(() => setErr('Failed to load outlets'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading">Loading outlets…</p>;
  if (err) return <p className="error-msg">{err}</p>;
  if (outlets.length === 0) return <p className="loading">No outlets found.</p>;

  return (
    <div className="section active">
      <p className="section-title">Top Media Outlets by Journalist Count</p>
      <div className="list-container">
        {outlets.map((o) => (
          <div key={o.id} className="list-item" onClick={() => onSelect(o.id)}>
            <div className="item-primary">
              <span className="item-name">{o.name}</span>
              <span className="item-meta">
                {o.journalist_count} journalist{o.journalist_count !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="item-tags">
              {o.type_of_media && <span className="tag">{o.type_of_media}</span>}
              {o.geographical_level && <span className="tag geo">{o.geographical_level}</span>}
              {o.combined_score != null && (
                <span className={`tag score ${o.combined_score >= 5 ? 'high' : o.combined_score >= 3 ? 'med' : 'low'}`}>
                  EU score: {o.combined_score}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Cross-Platform View ───────────────────────────────────────────────────────

function CrossPlatformView({ onSelect }: { onSelect: (id: number) => void }) {
  const [journalists, setJournalists] = useState<Journalist[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.getCrossPlatformJournalists()
      .then(({ journalists }) => setJournalists(journalists as any))
      .catch(() => setErr('Failed to load journalists'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading">Loading cross-platform journalists…</p>;
  if (err) return <p className="error-msg">{err}</p>;
  if (journalists.length === 0) return <p className="loading">No cross-platform journalists found.</p>;

  return (
    <div className="section active">
      <p className="section-title">Journalists Working at Multiple Outlets</p>
      <div className="list-container">
        {journalists.map((j) => (
          <div key={j.id} className="list-item" onClick={() => onSelect(j.id)}>
            <div className="item-primary">
              <span className="item-name">{j.name}</span>
              <span className="item-meta">
                {j.total_outlets ?? j.outlets?.length ?? '?'} outlets
              </span>
            </div>
            <div className="item-tags">
              {j.primary_beat && <span className="tag">{j.primary_beat}</span>}
              {j.twitter && <span className="tag social">Twitter</span>}
              {j.linkedin && <span className="tag social">LinkedIn</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Search Journalists View ─────────────────────────────────────────────────

function SearchJournalistsView({ onSelect }: { onSelect: (id: number) => void }) {
  const [query, setQuery] = useState('');
  const [journalists, setJournalists] = useState<Journalist[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback((q: string) => {
    if (!q.trim()) { setJournalists([]); return; }
    setLoading(true);
    api.search(q)
      .then(({ journalists }) => setJournalists(journalists))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="section active">
      <p className="section-title">Search Journalists</p>
      <div className="search-container">
        <input
          className="search-input"
          placeholder="Type a journalist name…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            doSearch(e.target.value);
          }}
        />
      </div>
      <div className="list-container">
        {loading && <p className="loading">Searching…</p>}
        {!loading && query && journalists.map((j) => (
          <div key={j.id} className="list-item" onClick={() => onSelect(j.id)}>
            <div className="item-primary">
              <span className="item-name">{j.name}</span>
              <span className="item-meta">{j.outlet_name || j.primary_beat || '—'}</span>
            </div>
            <div className="item-tags">
              {j.twitter && <span className="tag social">Twitter</span>}
              {j.linkedin && <span className="tag social">LinkedIn</span>}
              {j.status && <span className={`tag ${j.status.includes('Not') ? 'neg' : 'pos'}`}>{j.status}</span>}
            </div>
          </div>
        ))}
        {!loading && query && journalists.length === 0 && (
          <p className="loading">No journalists match "{query}"</p>
        )}
      </div>
    </div>
  );
}

// ─── Search Outlets View ─────────────────────────────────────────────────────

function SearchOutletsView({ onSelect }: { onSelect: (id: number) => void }) {
  const [query, setQuery] = useState('');
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback((q: string) => {
    if (!q.trim()) { setOutlets([]); return; }
    setLoading(true);
    api.search(q)
      .then(({ outlets }) => setOutlets(outlets))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="section active">
      <p className="section-title">Search Media Outlets</p>
      <div className="search-container">
        <input
          className="search-input"
          placeholder="Type an outlet name…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            doSearch(e.target.value);
          }}
        />
      </div>
      <div className="list-container">
        {loading && <p className="loading">Searching…</p>}
        {!loading && query && outlets.map((o) => (
          <div key={o.id} className="list-item" onClick={() => onSelect(o.id)}>
            <div className="item-primary">
              <span className="item-name">{o.name}</span>
              <span className="item-meta">{o.type_of_media || o.geographical_level || '—'}</span>
            </div>
            <div className="item-tags">
              {o.combined_score != null && (
                <span className={`tag score ${o.combined_score >= 5 ? 'high' : o.combined_score >= 3 ? 'med' : 'low'}`}>
                  EU: {o.combined_score}
                </span>
              )}
              {o.progressive_score != null && (
                <span className={`tag ${o.progressive_score >= 3 ? 'pos' : 'neutral'}`}>
                  Prog: {o.progressive_score}
                </span>
              )}
              {o.website && <span className="tag web">web</span>}
            </div>
          </div>
        ))}
        {!loading && query && outlets.length === 0 && (
          <p className="loading">No outlets match "{query}"</p>
        )}
      </div>
    </div>
  );
}

// ─── Journalist Detail ───────────────────────────────────────────────────────

function JournalistDetail({
  id, onBack, onSelectOutlet,
}: {
  id: number; onBack: () => void; onSelectOutlet: (id: number) => void;
}) {
  const [journalist, setJournalist] = useState<Journalist | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.getJournalist(id)
      .then(setJournalist)
      .catch(() => setErr('Failed to load journalist'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="loading">Loading journalist…</p>;
  if (err || !journalist) return <p className="error-msg">{err || 'Not found'}</p>;

  const articles: string[] = journalist.articles ? JSON.parse(journalist.articles) : [];

  return (
    <div className="detail-view">
      <span className="back-btn" onClick={onBack}>&larr; Back</span>

      <div className="detail-header">
        <h2>{journalist.name}</h2>
        {journalist.outlet_name && <p className="detail-meta">Primary outlet: {journalist.outlet_name}</p>}
        {journalist.primary_beat && <p className="detail-meta">Beat: {journalist.primary_beat}</p>}
        {journalist.email && <p className="detail-meta">Email: <a href={`mailto:${journalist.email}`}>{journalist.email}</a></p>}
        {journalist.status && (
          <p className={`detail-meta status-badge ${journalist.status.includes('Not') ? 'neg' : 'pos'}`}>
            {journalist.status}
          </p>
        )}
      </div>

      <div className="detail-stats">
        <div className="detail-stat">
          <div className="detail-stat-value">{journalist.total_outlets ?? journalist.outlets?.length ?? 0}</div>
          <div className="detail-stat-label">Outlets</div>
        </div>
        {journalist.channel && (
          <div className="detail-stat">
            <div className="detail-stat-value">{journalist.channel}</div>
            <div className="detail-stat-label">Channel</div>
          </div>
        )}
      </div>

      {/* Social Links */}
      <div className="detail-section">
        <p className="detail-section-title">Contact & Social</p>
        <div className="social-links">
          {journalist.twitter && (
            <a href={journalist.twitter} target="_blank" rel="noopener noreferrer" className="social-link twitter">
              Twitter / X
            </a>
          )}
          {journalist.linkedin && (
            <a href={journalist.linkedin} target="_blank" rel="noopener noreferrer" className="social-link linkedin">
              LinkedIn
            </a>
          )}
          {!journalist.twitter && !journalist.linkedin && <p className="no-data">No social links on file</p>}
        </div>
      </div>

      {/* Articles */}
      {articles.length > 0 && (
        <div className="detail-section">
          <p className="detail-section-title">Articles in Dataset ({articles.length})</p>
          <div className="article-list">
            {articles.slice(0, 10).map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="article-link">
                {url.replace(/^https?:\/\//, '').substring(0, 60)}…
              </a>
            ))}
            {articles.length > 10 && <p className="more-note">+{articles.length - 10} more</p>}
          </div>
        </div>
      )}

      {/* Notes */}
      {journalist.bio_notes && (
        <div className="detail-section">
          <p className="detail-section-title">Notes</p>
          <p className="notes-text">{journalist.bio_notes}</p>
        </div>
      )}

      {/* Linked Outlets */}
      {journalist.outlets && journalist.outlets.length > 0 && (
        <>
          <p className="detail-section-title">Linked Media Outlets</p>
          <div className="detail-links">
            {journalist.outlets.map((o) => (
              <div key={o.id} className="detail-link-item" onClick={() => onSelectOutlet(o.id)}>
                <span className="item-name">{o.name}</span>
                {o.role && <span className="item-meta">{o.role}</span>}
                {o.twitter && <span className="item-meta">Twitter</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Outlet Detail ───────────────────────────────────────────────────────────

function OutletDetail({
  id, onBack, onSelectJournalist,
}: {
  id: number; onBack: () => void; onSelectJournalist: (id: number) => void;
}) {
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.getOutlet(id)
      .then(setOutlet)
      .catch(() => setErr('Failed to load outlet'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="loading">Loading outlet…</p>;
  if (err || !outlet) return <p className="error-msg">{err || 'Not found'}</p>;

  const eciArticles: string[] = outlet.eci_articles ? JSON.parse(outlet.eci_articles) : [];
  const people: string[] = outlet.people_names ? outlet.people_names.split(',').map(p => p.trim()).filter(Boolean) : [];

  return (
    <div className="detail-view">
      <span className="back-btn" onClick={onBack}>&larr; Back</span>

      <div className="detail-header">
        <h2>{outlet.name}</h2>
        {outlet.name_gr && <p className="detail-meta greek">{outlet.name_gr}</p>}
        <div className="meta-row">
          {outlet.type_of_media && <span className="meta-chip">{outlet.type_of_media}</span>}
          {outlet.geographical_level && <span className="meta-chip geo">{outlet.geographical_level}</span>}
          {outlet.website && (
            <a href={outlet.website} target="_blank" rel="noopener noreferrer" className="meta-chip web">
              Website
            </a>
          )}
        </div>
      </div>

      {/* Scores */}
      {(outlet.combined_score != null || outlet.progressive_score != null || outlet.eu_coverage_score != null) && (
        <div className="detail-stats">
          {outlet.combined_score != null && (
            <div className="detail-stat">
              <div className={`detail-stat-value ${outlet.combined_score >= 5 ? 'high' : outlet.combined_score >= 3 ? 'med' : 'low'}`}>
                {outlet.combined_score}
              </div>
              <div className="detail-stat-label">EU Score</div>
            </div>
          )}
          {outlet.progressive_score != null && (
            <div className="detail-stat">
              <div className="detail-stat-value">{outlet.progressive_score}</div>
              <div className="detail-stat-label">Prog. Score</div>
            </div>
          )}
          {outlet.eu_coverage_score != null && (
            <div className="detail-stat">
              <div className="detail-stat-value">{outlet.eu_coverage_score}</div>
              <div className="detail-stat-label">EU Coverage</div>
            </div>
          )}
          {outlet.total_journalists != null && (
            <div className="detail-stat">
              <div className="detail-stat-value">{outlet.total_journalists}</div>
              <div className="detail-stat-label">Journalists</div>
            </div>
          )}
        </div>
      )}

      {/* Social */}
      {(outlet.facebook || outlet.twitter || outlet.instagram || outlet.linkedin || outlet.youtube) && (
        <div className="detail-section">
          <p className="detail-section-title">Social Media</p>
          <div className="social-chips">
            {outlet.facebook && <a href={outlet.facebook} target="_blank" rel="noopener noreferrer" className="social-chip fb">Facebook</a>}
            {outlet.twitter && <a href={outlet.twitter} target="_blank" rel="noopener noreferrer" className="social-chip tw">Twitter</a>}
            {outlet.instagram && <a href={outlet.instagram} target="_blank" rel="noopener noreferrer" className="social-chip ig">Instagram</a>}
            {outlet.linkedin && <a href={outlet.linkedin} target="_blank" rel="noopener noreferrer" className="social-chip li">LinkedIn</a>}
            {outlet.youtube && <a href={outlet.youtube} target="_blank" rel="noopener noreferrer" className="social-chip yt">YouTube</a>}
          </div>
        </div>
      )}

      {/* People (journalists listed on outlet) */}
      {people.length > 0 && (
        <div className="detail-section">
          <p className="detail-section-title">Journalists ({people.length})</p>
          <div className="people-list">
            {people.map((p, i) => <span key={i} className="person-chip">{p}</span>)}
          </div>
        </div>
      )}

      {/* ECI Articles */}
      {eciArticles.length > 0 && (
        <div className="detail-section">
          <p className="detail-section-title">ECI Articles ({eciArticles.length})</p>
          <div className="article-list">
            {eciArticles.slice(0, 10).map((item, i) => (
              <p key={i} className="eci-item">{item}</p>
            ))}
            {eciArticles.length > 10 && <p className="more-note">+{eciArticles.length - 10} more</p>}
          </div>
        </div>
      )}

      {/* Description */}
      {outlet.description_gr && (
        <div className="detail-section">
          <p className="detail-section-title">Description</p>
          <p className="notes-text">{outlet.description_gr}</p>
        </div>
      )}

      {/* Notes */}
      {outlet.notes && (
        <div className="detail-section">
          <p className="detail-section-title">Notes</p>
          <p className="notes-text">{outlet.notes}</p>
        </div>
      )}

      {/* Media Companies */}
      {outlet.media_companies && (
        <div className="detail-section">
          <p className="detail-section-title">Media Companies</p>
          <p className="notes-text">{outlet.media_companies}</p>
        </div>
      )}

      {/* Linked Journalists */}
      {outlet.journalists && outlet.journalists.length > 0 && (
        <>
          <p className="detail-section-title">Linked Journalists</p>
          <div className="detail-links">
            {outlet.journalists.map((j) => (
              <div key={j.id} className="detail-link-item" onClick={() => onSelectJournalist(j.id)}>
                <span className="item-name">{j.name}</span>
                {j.role && <span className="item-meta">{j.role}</span>}
                {j.twitter && <span className="item-meta">Twitter</span>}
                {j.linkedin && <span className="item-meta">LinkedIn</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
