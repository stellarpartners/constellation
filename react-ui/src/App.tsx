import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import type { Stats, Journalist, Outlet, TopOutlet, NGO, OKOIPRecord } from './api';

// ─── Views ───────────────────────────────────────────────────────────────────

type View = 'top-outlets' | 'cross-platform' | 'search-journalists' | 'search-outlets' | 'journalist-detail' | 'outlet-detail' | 'ngo-list' | 'okoip-list' | 'ngo-detail' | 'okoip-detail';
type Entity = { kind: 'journalist' | 'outlet' | 'ngo' | 'okoip'; id: number | string } | null;

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

  const isDetail = ['journalist-detail', 'outlet-detail', 'ngo-detail', 'okoip-detail'].includes(view);

  return (
    <div className="app-container">
      {error && <div className="error-msg">{error}</div>}

      <header className="header">
        <h1>Constellation Studio</h1>
        <p className="subtitle">Media, Journalist & NGO Intelligence</p>
      </header>

      {stats && (
        <div className="stats-grid">
          <StatCard label="Journalists" value={stats.total_journalists} />
          <StatCard label="Media Outlets" value={stats.total_outlets} />
          <StatCard label="Relationships" value={stats.total_relationships} />
          <StatCard label="NGOs" value={stats.total_ngos} sub="curated" />
          <StatCard label="OKOIP Registry" value={stats.total_okoip} sub={stats.total_ngo_matches + ' linked'} />
        </div>
      )}

      {!isDetail && (
        <nav className="nav-tabs">
          <div className="tab-buttons">
            <button className={view === 'top-outlets' ? 'active' : ''} onClick={() => navigate('top-outlets')}>Top Outlets</button>
            <button className={view === 'cross-platform' ? 'active' : ''} onClick={() => navigate('cross-platform')}>Cross-Platform</button>
            <button className={`secondary ${view === 'search-journalists' ? 'active' : ''}`} onClick={() => navigate('search-journalists')}>Journalists</button>
            <button className={`secondary ${view === 'search-outlets' ? 'active' : ''}`} onClick={() => navigate('search-outlets')}>Outlets</button>
            <button className={`secondary ${view === 'ngo-list' ? 'active' : ''}`} onClick={() => navigate('ngo-list')}>NGOs</button>
            <button className={`secondary ${view === 'okoip-list' ? 'active' : ''}`} onClick={() => navigate('okoip-list')}>OKOIP Registry</button>
          </div>

          {view === 'top-outlets' && <TopOutletsView onSelect={(id) => navigate('outlet-detail', { kind: 'outlet', id })} />}
          {view === 'cross-platform' && <CrossPlatformView onSelect={(id) => navigate('journalist-detail', { kind: 'journalist', id })} />}
          {view === 'search-journalists' && <SearchJournalistsView onSelect={(id) => navigate('journalist-detail', { kind: 'journalist', id })} />}
          {view === 'search-outlets' && <SearchOutletsView onSelect={(id) => navigate('outlet-detail', { kind: 'outlet', id })} />}
          {view === 'ngo-list' && <NGOListView onSelect={(id) => navigate('ngo-detail', { kind: 'ngo', id })} />}
          {view === 'okoip-list' && <OKOIPListView onSelect={(id) => navigate('okoip-detail', { kind: 'okoip', id })} />}
        </nav>
      )}

      {view === 'journalist-detail' && entity?.kind === 'journalist' && (
        <JournalistDetail id={entity.id as number} onBack={() => navigate('top-outlets')} onSelectOutlet={(id) => navigate('outlet-detail', { kind: 'outlet', id })} />
      )}
      {view === 'outlet-detail' && entity?.kind === 'outlet' && (
        <OutletDetail id={entity.id as number} onBack={() => navigate('top-outlets')} onSelectJournalist={(id) => navigate('journalist-detail', { kind: 'journalist', id })} />
      )}
      {view === 'ngo-detail' && entity?.kind === 'ngo' && (
        <NGODetailView id={entity.id as number} onBack={() => navigate('ngo-list')} onSelectOKOIP={(id) => navigate('okoip-detail', { kind: 'okoip', id })} />
      )}
      {view === 'okoip-detail' && entity?.kind === 'okoip' && (
        <OKOIPDetailView id={entity.id as number | string} onBack={() => navigate('okoip-list')} onSelectNGO={(id) => navigate('ngo-detail', { kind: 'ngo', id })} />
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
              <span className="item-meta">{o.journalist_count} journalist{o.journalist_count !== 1 ? 's' : ''}</span>
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
              <span className="item-meta">{j.total_outlets ?? j.outlets?.length ?? '?'} outlets</span>
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

// ─── Search Journalists ───────────────────────────────────────────────────────

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
        <input className="search-input" placeholder="Type a journalist name…" value={query}
          onChange={(e) => { setQuery(e.target.value); doSearch(e.target.value); }} />
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
        {!loading && query && journalists.length === 0 && <p className="loading">No journalists match "{query}"</p>}
      </div>
    </div>
  );
}

// ─── Search Outlets ───────────────────────────────────────────────────────────

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
        <input className="search-input" placeholder="Type an outlet name…" value={query}
          onChange={(e) => { setQuery(e.target.value); doSearch(e.target.value); }} />
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
              {o.combined_score != null && <span className={`tag score ${o.combined_score >= 5 ? 'high' : o.combined_score >= 3 ? 'med' : 'low'}`}>EU: {o.combined_score}</span>}
              {o.progressive_score != null && <span className={`tag ${o.progressive_score >= 3 ? 'pos' : 'neutral'}`}>Prog: {o.progressive_score}</span>}
              {o.website && <span className="tag web">web</span>}
            </div>
          </div>
        ))}
        {!loading && query && outlets.length === 0 && <p className="loading">No outlets match "{query}"</p>}
      </div>
    </div>
  );
}

// ─── Journalist Detail ───────────────────────────────────────────────────────

function JournalistDetail({ id, onBack, onSelectOutlet }: { id: number; onBack: () => void; onSelectOutlet: (id: number) => void }) {
  const [journalist, setJournalist] = useState<Journalist | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { api.getJournalist(id).then(setJournalist).catch(() => setErr('Failed to load journalist')).finally(() => setLoading(false)); }, [id]);

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
        {journalist.status && <p className={`detail-meta status-badge ${journalist.status.includes('Not') ? 'neg' : 'pos'}`}>{journalist.status}</p>}
      </div>
      <div className="detail-stats">
        <div className="detail-stat"><div className="detail-stat-value">{journalist.total_outlets ?? journalist.outlets?.length ?? 0}</div><div className="detail-stat-label">Outlets</div></div>
        {journalist.channel && <div className="detail-stat"><div className="detail-stat-value">{journalist.channel}</div><div className="detail-stat-label">Channel</div></div>}
      </div>
      <div className="detail-section">
        <p className="detail-section-title">Contact & Social</p>
        <div className="social-links">
          {journalist.twitter && <a href={journalist.twitter} target="_blank" rel="noopener noreferrer" className="social-link twitter">Twitter / X</a>}
          {journalist.linkedin && <a href={journalist.linkedin} target="_blank" rel="noopener noreferrer" className="social-link linkedin">LinkedIn</a>}
          {!journalist.twitter && !journalist.linkedin && <p className="no-data">No social links on file</p>}
        </div>
      </div>
      {articles.length > 0 && (
        <div className="detail-section">
          <p className="detail-section-title">Articles in Dataset ({articles.length})</p>
          <div className="article-list">
            {articles.slice(0, 10).map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="article-link">{url.replace(/^https?:\/\//, '').substring(0, 60)}…</a>
            ))}
            {articles.length > 10 && <p className="more-note">+{articles.length - 10} more</p>}
          </div>
        </div>
      )}
      {journalist.bio_notes && (
        <div className="detail-section"><p className="detail-section-title">Notes</p><p className="notes-text">{journalist.bio_notes}</p></div>
      )}
      {journalist.outlets && journalist.outlets.length > 0 && (
        <><p className="detail-section-title">Linked Media Outlets</p><div className="detail-links">
          {journalist.outlets.map((o) => (
            <div key={o.id} className="detail-link-item" onClick={() => onSelectOutlet(o.id)}>
              <span className="item-name">{o.name}</span>
              {o.role && <span className="item-meta">{o.role}</span>}
              {o.twitter && <span className="item-meta">Twitter</span>}
            </div>
          ))}
        </div></>
      )}
    </div>
  );
}

// ─── Outlet Detail ───────────────────────────────────────────────────────────

function OutletDetail({ id, onBack, onSelectJournalist }: { id: number; onBack: () => void; onSelectJournalist: (id: number) => void }) {
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { api.getOutlet(id).then(setOutlet).catch(() => setErr('Failed to load outlet')).finally(() => setLoading(false)); }, [id]);

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
          {outlet.website && <a href={outlet.website} target="_blank" rel="noopener noreferrer" className="meta-chip web">Website</a>}
        </div>
      </div>
      {(outlet.combined_score != null || outlet.progressive_score != null || outlet.eu_coverage_score != null) && (
        <div className="detail-stats">
          {outlet.combined_score != null && <div className="detail-stat"><div className={`detail-stat-value ${outlet.combined_score >= 5 ? 'high' : outlet.combined_score >= 3 ? 'med' : 'low'}`}>{outlet.combined_score}</div><div className="detail-stat-label">EU Score</div></div>}
          {outlet.progressive_score != null && <div className="detail-stat"><div className="detail-stat-value">{outlet.progressive_score}</div><div className="detail-stat-label">Prog. Score</div></div>}
          {outlet.eu_coverage_score != null && <div className="detail-stat"><div className="detail-stat-value">{outlet.eu_coverage_score}</div><div className="detail-stat-label">EU Coverage</div></div>}
          {outlet.total_journalists != null && <div className="detail-stat"><div className="detail-stat-value">{outlet.total_journalists}</div><div className="detail-stat-label">Journalists</div></div>}
        </div>
      )}
      {(outlet.facebook || outlet.twitter || outlet.instagram || outlet.linkedin || outlet.youtube) && (
        <div className="detail-section"><p className="detail-section-title">Social Media</p><div className="social-chips">
          {outlet.facebook && <a href={outlet.facebook} target="_blank" rel="noopener noreferrer" className="social-chip fb">Facebook</a>}
          {outlet.twitter && <a href={outlet.twitter} target="_blank" rel="noopener noreferrer" className="social-chip tw">Twitter</a>}
          {outlet.instagram && <a href={outlet.instagram} target="_blank" rel="noopener noreferrer" className="social-chip ig">Instagram</a>}
          {outlet.linkedin && <a href={outlet.linkedin} target="_blank" rel="noopener noreferrer" className="social-chip li">LinkedIn</a>}
          {outlet.youtube && <a href={outlet.youtube} target="_blank" rel="noopener noreferrer" className="social-chip yt">YouTube</a>}
        </div></div>
      )}
      {people.length > 0 && (
        <div className="detail-section"><p className="detail-section-title">Journalists ({people.length})</p><div className="people-list">{people.map((p, i) => <span key={i} className="person-chip">{p}</span>)}</div></div>
      )}
      {eciArticles.length > 0 && (
        <div className="detail-section"><p className="detail-section-title">ECI Articles ({eciArticles.length})</p><div className="article-list">
          {eciArticles.slice(0, 10).map((item, i) => <p key={i} className="eci-item">{item}</p>)}
          {eciArticles.length > 10 && <p className="more-note">+{eciArticles.length - 10} more</p>}
        </div></div>
      )}
      {outlet.description_gr && <div className="detail-section"><p className="detail-section-title">Description</p><p className="notes-text">{outlet.description_gr}</p></div>}
      {outlet.notes && <div className="detail-section"><p className="detail-section-title">Notes</p><p className="notes-text">{outlet.notes}</p></div>}
      {outlet.media_companies && <div className="detail-section"><p className="detail-section-title">Media Companies</p><p className="notes-text">{outlet.media_companies}</p></div>}
      {outlet.journalists && outlet.journalists.length > 0 && (
        <><p className="detail-section-title">Linked Journalists</p><div className="detail-links">
          {outlet.journalists.map((j) => (
            <div key={j.id} className="detail-link-item" onClick={() => onSelectJournalist(j.id)}>
              <span className="item-name">{j.name}</span>
              {j.role && <span className="item-meta">{j.role}</span>}
              {j.twitter && <span className="item-meta">Twitter</span>}
              {j.linkedin && <span className="item-meta">LinkedIn</span>}
            </div>
          ))}
        </div></>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NGO Views
// ═══════════════════════════════════════════════════════════════════════════════

function NGOListView({ onSelect }: { onSelect: (id: number) => void }) {
  const [ngos, setNGOs] = useState<NGO[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback((q: string, p: number) => {
    setLoading(true);
    api.getNGOs(q || undefined, p)
      .then((r) => { setNGOs(r.ngos); setTotal(r.total); })
      .catch(() => setErr('Failed to load NGOs'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(query, page); }, [query, page, load]);

  const totalPages = Math.ceil(total / 25);

  return (
    <div className="section active">
      <p className="section-title">Curated NGOs ({total})</p>
      <div className="search-container">
        <input className="search-input" placeholder="Search by name…" value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
      </div>
      {loading && <p className="loading">Loading…</p>}
      {err && <p className="error-msg">{err}</p>}
      {!loading && !err && (
        <>
          <div className="list-container">
            {ngos.map((n) => (
              <div key={n.id} className="list-item" onClick={() => onSelect(n.id)}>
                <div className="item-primary">
                  <span className="item-name">{n.company_name}</span>
                  <span className="item-meta">{n.email || '—'}</span>
                </div>
                <div className="item-tags">
                  {n.category && <span className="tag">{n.category}</span>}
                  {n.website && <span className="tag web">web</span>}
                  {n.city && <span className="tag geo">{n.city}</span>}
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>&larr; Prev</button>
              <span className="page-info">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next &rarr;</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NGODetailView({ id, onBack, onSelectOKOIP }: { id: number; onBack: () => void; onSelectOKOIP: (id: number) => void }) {
  const [ngo, setNGO] = useState<NGO | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { api.getNGO(id).then(setNGO).catch(() => setErr('Failed to load NGO')).finally(() => setLoading(false)); }, [id]);

  if (loading) return <p className="loading">Loading NGO…</p>;
  if (err || !ngo) return <p className="error-msg">{err || 'Not found'}</p>;

  return (
    <div className="detail-view">
      <span className="back-btn" onClick={onBack}>&larr; Back</span>

      <div className="detail-header">
        <h2>{ngo.company_name}</h2>
        <div className="meta-row">
          {ngo.category && <span className="meta-chip">{ngo.category}</span>}
          {ngo.city && <span className="meta-chip geo">{ngo.city}</span>}
          {ngo.website && <a href={ngo.website} target="_blank" rel="noopener noreferrer" className="meta-chip web">Website</a>}
        </div>
      </div>

      {ngo.email && <div className="detail-section"><p className="detail-section-title">Contact</p><p className="notes-text">{ngo.email}{ngo.phone ? ` | ${ngo.phone}` : ''}{ngo.address ? `<br/>${ngo.address}` : ''}</p></div>}

      {/* Social Profiles */}
      {ngo.social && ngo.social.length > 0 && (
        <div className="detail-section">
          <p className="detail-section-title">Social Profiles</p>
          <div className="social-chips">
            {ngo.social.map((s, i) => (
              s.profile_url ? <a key={i} href={s.profile_url} target="_blank" rel="noopener noreferrer" className={`social-chip ${s.platform === 'facebook' ? 'fb' : s.platform === 'twitter' ? 'tw' : s.platform === 'instagram' ? 'ig' : s.platform === 'linkedin' ? 'li' : s.platform === 'youtube' ? 'yt' : ''}`}>{s.platform}</a> : null
            ))}
          </div>
        </div>
      )}

      {/* Platform Links */}
      {ngo.platforms && Object.keys(ngo.platforms).length > 0 && (
        <div className="detail-section">
          <p className="detail-section-title">Platform Profiles</p>
          {Object.entries(ngo.platforms).map(([platform, links]) => (
            <div key={platform} style={{ marginBottom: '0.4rem' }}>
              <p className="detail-meta" style={{ fontWeight: 600 }}>{platform}</p>
              {(links as any[]).map((l, i) => (
                l.profile_url ? <a key={i} href={l.profile_url} target="_blank" rel="noopener noreferrer" className="article-link">{l.profile_url}</a> : null
              ))}
            </div>
          ))}
        </div>
      )}

      {/* HubSpot */}
      {ngo.hubspot_id && <div className="detail-section"><p className="detail-section-title">HubSpot</p><p className="notes-text">Company ID: {ngo.hubspot_id}</p></div>}

      {/* OKOIP Matches */}
      {ngo.okoip_matches && ngo.okoip_matches.length > 0 && (
        <div className="detail-section">
          <p className="detail-section-title">OKOIP Registry Matches ({ngo.okoip_matches.length})</p>
          <div className="detail-links">
            {ngo.okoip_matches.map((m, i) => (
              <div key={i} className="detail-link-item" onClick={() => onSelectOKOIP(m.okoip_id as unknown as number)}>
                <div>
                  <span className="item-name">{m.title || 'Unnamed'}</span>
                  <div className="item-tags" style={{ marginTop: '0.25rem' }}>
                    <span className={`tag ${m.match_score >= 0.7 ? 'high' : m.match_score >= 0.4 ? 'med' : 'low'}`}>{m.match_method}: {m.match_score}</span>
                    {m.okoip_category && <span className="tag">{m.okoip_category}</span>}
                    {m.region && <span className="tag geo">{m.region}</span>}
                  </div>
                </div>
                <span className="item-meta">{m.okoip_email || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!ngo.okoip_matches || ngo.okoip_matches.length === 0) && (
        <div className="detail-section">
          <p className="detail-section-title">OKOIP Registry</p>
          <p className="no-data">No OKOIP matches found. This NGO was not automatically linked to the public registry.</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OKOIP Registry Views
// ═══════════════════════════════════════════════════════════════════════════════

function OKOIPListView({ onSelect }: { onSelect: (id: number | string) => void }) {
  const [records, setRecords] = useState<OKOIPRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    api.getOKOIPCategories().then(r => setCategories(r.categories)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    api.getOKOIPRecords({ q: query || undefined, category: category || undefined, page })
      .then((r) => { setRecords(r.okoip); setTotal(r.total); })
      .catch(() => setErr('Failed to load OKOIP records'))
      .finally(() => setLoading(false));
  }, [query, category, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 25);

  return (
    <div className="section active">
      <p className="section-title">OKOIP Public Registry ({total} active CSOs)</p>
      <div className="search-container" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input className="search-input" style={{ flex: 1, minWidth: '200px' }} placeholder="Search by name or TIN…" value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
        <select className="search-input" style={{ width: 'auto', minWidth: '160px' }} value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.category} value={c.category}>{c.category} ({c.count})</option>)}
        </select>
      </div>
      {loading && <p className="loading">Loading…</p>}
      {err && <p className="error-msg">{err}</p>}
      {!loading && !err && (
        <>
          <div className="list-container">
            {records.map((r) => (
              <div key={r.id} className="list-item" onClick={() => onSelect(r.id)}>
                <div className="item-primary">
                  <span className="item-name">{(r.title || 'Unnamed').substring(0, 60)}</span>
                  <span className="item-meta">{r.email || '—'}</span>
                </div>
                <div className="item-tags">
                  {r.category && <span className="tag">{r.category}</span>}
                  {r.region && <span className="tag geo">{(r.region || '').replace(/\(.*\)/, '').trim()}</span>}
                  {r.tin && <span className="tag">TIN: {r.tin}</span>}
                  {r.form_status === 1 && <span className="tag pos">Active</span>}
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>&larr; Prev</button>
              <span className="page-info">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next &rarr;</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OKOIPDetailView({ id, onBack, onSelectNGO }: { id: number | string; onBack: () => void; onSelectNGO: (id: number) => void }) {
  const [record, setRecord] = useState<OKOIPRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { api.getOKOIPRecord(id).then(setRecord).catch(() => setErr('Failed to load OKOIP record')).finally(() => setLoading(false)); }, [id]);

  if (loading) return <p className="loading">Loading OKOIP record…</p>;
  if (err || !record) return <p className="error-msg">{err || 'Not found'}</p>;

  return (
    <div className="detail-view">
      <span className="back-btn" onClick={onBack}>&larr; Back</span>

      <div className="detail-header">
        <h2>{record.title || 'Unnamed Organization'}</h2>
        <div className="meta-row">
          {record.category && <span className="meta-chip">{record.category}</span>}
          {record.form_status === 1 && <span className="meta-chip" style={{ background: '#dcfce7', color: '#16a34a' }}>Active</span>}
          {record.tin && <span className="meta-chip">TIN: {record.tin}</span>}
        </div>
      </div>

      {/* Contact */}
      <div className="detail-stats">
        {record.email && <div className="detail-stat"><div className="detail-stat-value" style={{ fontSize: '0.9rem', fontWeight: 600 }}>✉</div><div className="detail-stat-label">{record.email}</div></div>}
        {record.phone && <div className="detail-stat"><div className="detail-stat-value" style={{ fontSize: '0.9rem', fontWeight: 600 }}>📞</div><div className="detail-stat-label">{record.phone}</div></div>}
      </div>

      <div className="detail-section">
        <p className="detail-section-title">Address</p>
        <p className="notes-text">
          {[record.street, record.street_number].filter(Boolean).join(' ') || '—'}
          {record.postcode ? `, ${record.postcode}` : ''}
        </p>
      </div>

      <div className="detail-section">
        <p className="detail-section-title">Geography</p>
        <p className="notes-text">
          {record.region ? (record.region || '').replace(/\(.*\)/, '').trim() + ', ' : ''}
          {record.prefecture || ''}
          {record.municipality ? ` / ${record.municipality}` : ''}
        </p>
      </div>

      {/* Legal Representative */}
      {(record.legal_name || record.legal_surname) && (
        <div className="detail-section">
          <p className="detail-section-title">Legal Representative</p>
          <p className="notes-text">
            {[record.legal_name, record.legal_surname].filter(Boolean).join(' ')}
            {record.legal_tin ? ` (TIN: ${record.legal_tin})` : ''}
          </p>
        </div>
      )}

      {/* Purpose */}
      {record.purpose && (
        <div className="detail-section">
          <p className="detail-section-title">Purpose / Activities</p>
          <p className="notes-text">{record.purpose}</p>
        </div>
      )}

      {/* Grant */}
      {record.grant_value != null && (
        <div className="detail-section">
          <p className="detail-section-title">Grant</p>
          <p className="notes-text">&euro;{Number(record.grant_value).toLocaleString()}</p>
        </div>
      )}

      {/* Linked NGOs */}
      {record.linked_ngos && record.linked_ngos.length > 0 && (
        <div className="detail-section">
          <p className="detail-section-title">Linked Constellation NGOs ({record.linked_ngos.length})</p>
          <div className="detail-links">
            {record.linked_ngos.map((l, i) => (
              <div key={i} className="detail-link-item" onClick={() => onSelectNGO(l.ngo_id)}>
                <div>
                  <span className="item-name">{l.company_name}</span>
                  <div className="item-tags" style={{ marginTop: '0.25rem' }}>
                    <span className={`tag ${l.match_score >= 0.7 ? 'high' : l.match_score >= 0.4 ? 'med' : 'low'}`}>{l.match_method}: {l.match_score}</span>
                    {l.ngo_category && <span className="tag">{l.ngo_category}</span>}
                  </div>
                </div>
                <span className="item-meta">{l.email || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!record.linked_ngos || record.linked_ngos.length === 0) && (
        <div className="detail-section">
          <p className="detail-section-title">Constellation Links</p>
          <p className="no-data">Not linked to any curated NGO. This registry entry exists separately.</p>
        </div>
      )}
    </div>
  );
}

export default App;
