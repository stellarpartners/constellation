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
  total_journalists:    number;
  total_outlets:        number;
  total_relationships:  number;
  outlets_with_eci:     number;
  progressive_outlets:  number;
  total_ngos:           number;
  total_okoip:          number;
  total_ngo_matches:    number;
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
  articles:     string | null;
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
  articles:            string | null;
  eci_articles:       string | null;
  progressive_score:   number | null;
  eu_coverage_score:   number | null;
  combined_score:      number | null;
  notes:               string | null;
  journalists?:        LinkedEntity[];
  total_journalists?:  number;
}

// ─── Top Outlet ───────────────────────────────────────────────────────────────

interface TopOutlet {
  id:                 number;
  name:               string;
  journalist_count:   number;
  type_of_media:      string | null;
  geographical_level: string | null;
  combined_score:     number | null;
}

// ─── NGO Types ────────────────────────────────────────────────────────────────

interface NGO {
  id:           number;
  company_name: string;
  slug:         string | null;
  category:     string | null;
  email:        string | null;
  phone:        string | null;
  address:      string | null;
  city:         string | null;
  website:      string | null;
  wordpress?:   string | null;
  wordpress_url?: string | null;
  hubspot_id?:  string | null;
  // Detail-only
  social?:           SocialProfile[];
  okoip_matches?:    OKOIPMatch[];
  platforms?:        Record<string, any[]>;
  linked_ngos?:      NGOLink[];
}

interface SocialProfile {
  platform:    string;
  profile_url: string | null;
  handle:      string | null;
  notes:       string | null;
}

interface OKOIPMatch {
  match_method:  string;
  match_score:   number;
  match_detail:  string | null;
  // OKOIP record fields
  okoip_id:      string;
  title:         string | null;
  tin:           string | null;
  okoip_email:   string | null;
  okoip_phone:   string | null;
  region:        string | null;
  prefecture:    string | null;
  municipality:  string | null;
  street:        string | null;
  postcode:      string | null;
  okoip_category: string | null;
  organization_type: number | null;
  form_status:   number | null;
  purpose:       string | null;
  grant_value:   number | null;
}

// ─── OKOIP Types ──────────────────────────────────────────────────────────────

interface OKOIPRecord {
  id:                number;
  okoip_id:          string;
  title:             string | null;
  tin:               string | null;
  category:          string | null;
  organization_type: number | null;
  form_status:       number | null;
  email:             string | null;
  legal_email:       string | null;
  phone:             string | null;
  street:            string | null;
  street_number:     string | null;
  postcode:          string | null;
  region:            string | null;
  prefecture:        string | null;
  municipality:      string | null;
  municipal_unit:    string | null;
  local_community:   string | null;
  legal_name:        string | null;
  legal_surname:     string | null;
  legal_tin:         string | null;
  purpose:           string | null;
  grant_value:       number | null;
  available_value:   number | null;
  linked_ngos?:      NGOLink[];
}

interface NGOLink {
  ngo_id:       number;
  company_name: string;
  email:        string | null;
  website:      string | null;
  ngo_category: string | null;
  match_method: string;
  match_score:  number;
  match_detail: string | null;
}

interface CategoryCount {
  category: string;
  count:    number;
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

  // ── NGOs ──────────────────────────────────────────────────────────────────

  getNGOs: (q?: string, page = 1) => {
    const params = new URLSearchParams({ page: String(page), per_page: '25' });
    if (q) params.set('q', q);
    return fetchJson<{ ngos: NGO[]; page: number; per_page: number; total: number }>(
      `${API_BASE}/ngos?${params}`
    );
  },

  getNGO: (id: number) => fetchJson<NGO>(`${API_BASE}/ngos/${id}`),

  // ── OKOIP ─────────────────────────────────────────────────────────────────

  getOKOIPRecords: (params: { q?: string; category?: string; region?: string; page?: number }) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.category) sp.set('category', params.category);
    if (params.region) sp.set('region', params.region);
    sp.set('page', String(params.page || 1));
    sp.set('per_page', '25');
    return fetchJson<{ okoip: OKOIPRecord[]; page: number; per_page: number; total: number }>(
      `${API_BASE}/okoip?${sp}`
    );
  },

  getOKOIPRecord: (id: number | string) => fetchJson<OKOIPRecord>(`${API_BASE}/okoip/${id}`),

  getOKOIPCategories: () =>
    fetchJson<{ categories: CategoryCount[] }>(`${API_BASE}/okoip/categories`),

  getOKOIPRegions: () =>
    fetchJson<{ regions: { region_name: string; count: number }[] }>(`${API_BASE}/okoip/regions`),
};

export type { Stats, Journalist, Outlet, TopOutlet, NGO, OKOIPRecord, OKOIPMatch, SocialProfile, NGOLink };
