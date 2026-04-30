// API client for Constellation Workers API

const API_BASE = 'https://constellation-api.stellarpartners.workers.dev/api';

// ─── Shared Types ─────────────────────────────────────────────────────────────

interface LinkedEntity {
  id: number;
  name: string;
  role: string | null;
  twitter?: string | null;
  linkedin?: string | null;
}

// ─── Stats ───────────────────────────────────────────────────────────────────

interface Stats {
  total_journalists:  number;
  total_outlets:      number;
  total_relationships: number;
  outlets_with_eci:   number;
  progressive_outlets: number;
}

// ─── Journalist ───────────────────────────────────────────────────────────────

interface Journalist {
  id:           number;
  name:         string;
  email:        string | null;
  primary_beat: string | null;
  bio_notes:    string | null;
  twitter:      string | null;
  linkedin:     string | null;
  status:       string | null;
  channel:      string | null;
  articles:     string | null;   // JSON array string
  outlet_name:  string | null;
  outlets?:     LinkedEntity[];
  total_outlets?: number;
}

// ─── Outlet ──────────────────────────────────────────────────────────────────

interface Outlet {
  id:                  number;
  name:                string;
  name_gr:             string | null;
  website:             string | null;
  type_of_media:       string | null;
  geographical_level:   string | null;
  topics:              string | null;
  description_gr:      string | null;
  media_companies:     string | null;
  facebook:            string | null;
  twitter:             string | null;
  instagram:           string | null;
  linkedin:            string | null;
  youtube:             string | null;
  people_names:        string | null;
  articles:            string | null;   // JSON array string
  eci_articles:       string | null;   // JSON array string
  progressive_score:   number | null;
  eu_coverage_score:   number | null;
  combined_score:      number | null;
  notes:               string | null;
  journalists?:        LinkedEntity[];
  total_journalists?:  number;
}

// ─── Top Outlet (summary row) ─────────────────────────────────────────────────

interface TopOutlet {
  id:                 number;
  name:               string;
  journalist_count:   number;
  type_of_media:      string | null;
  geographical_level: string | null;
  combined_score:     number | null;
}

// ─── Fetch Helper ─────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const api = {
  getStats: () => fetchJson<Stats>(`${API_BASE}/stats`),

  getTopOutlets: (limit = 15) =>
    fetchJson<{ outlets: TopOutlet[] }>(`${API_BASE}/top-outlets/${limit}`),

  getJournalists: (q?: string, page = 1) => {
    const params = new URLSearchParams({ page: String(page) });
    if (q) params.set('q', q);
    return fetchJson<{ journalists: Journalist[]; page: number; per_page: number }>(
      `${API_BASE}/journalists?${params}`
    );
  },

  getJournalist: (id: number) => fetchJson<Journalist>(`${API_BASE}/journalists/${id}`),

  getOutlets: (q?: string, page = 1) => {
    const params = new URLSearchParams({ page: String(page) });
    if (q) params.set('q', q);
    return fetchJson<{ outlets: Outlet[]; page: number; per_page: number }>(
      `${API_BASE}/outlets?${params}`
    );
  },

  getOutlet: (id: number) => fetchJson<Outlet>(`${API_BASE}/outlets/${id}`),

  getCrossPlatformJournalists: () =>
    fetchJson<{ journalists: Journalist[] }>(`${API_BASE}/cross-platform-journalists`),

  search: (q: string) =>
    fetchJson<{ journalists: Journalist[]; outlets: Outlet[] }>(
      `${API_BASE}/search?q=${encodeURIComponent(q)}`
    ),
};

export type { Stats, Journalist, Outlet, TopOutlet };
