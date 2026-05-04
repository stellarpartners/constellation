import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataHealthView } from '@/components/DataHealthView';
import { api } from './api';
import type { Stats, NGO, OKOIPRecord, PlatformEntry, DataHealth, EnrichResult } from './api';

// ─── Route title helper ────────────────────────────────────────────────────────

function titleFromPath(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  if (pathname.startsWith('/ngos/')) return 'NGO';
  if (pathname === '/ngos') return 'NGOs';
  if (pathname.startsWith('/okoip/')) return 'OKOIP Record';
  if (pathname === '/okoip') return 'OKOIP Registry';
  if (pathname.startsWith('/journalists/')) return 'Journalist';
  if (pathname === '/journalists') return 'Journalists';
  if (pathname.startsWith('/outlets/')) return 'Media Outlet';
  if (pathname === '/outlets') return 'Media Outlets';
  if (pathname === '/data-health') return 'Data Health';
  return 'Constellation';
}

function App() {
  const location = useLocation();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <DashboardLayout title={titleFromPath(location.pathname)}>
      <Routes>
        <Route path="/" element={<DashboardView stats={stats} />} />
        <Route path="/ngos" element={<NGOListView />} />
        <Route path="/ngos/:id/:slug?" element={<NGODetailView />} />
        <Route path="/okoip" element={<OKOIPListView />} />
        <Route path="/okoip/:id" element={<OKOIPDetailView />} />
        <Route path="/journalists" element={<JournalistsView />} />
        <Route path="/journalists/:id" element={<JournalistDetailView />} />
        <Route path="/outlets" element={<OutletsView />} />
        <Route path="/outlets/:id" element={<OutletDetailView />} />
        <Route path="/data-health" element={<DataHealthView />} />
      </Routes>
    </DashboardLayout>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Newspaper,
  Link2,
  Building2,
  Database,
  GitCompare,
  ArrowRight,
} from 'lucide-react';

function DashboardView({ stats }: { stats: Stats | null }) {
  if (!stats) return null;

  const cards = [
    { label: 'NGOs Curated', value: stats.total_ngos, icon: Building2, href: '/ngos', color: 'text-primary' },
    { label: 'OKOIP Registry', value: stats.total_okoip, icon: Database, href: '/okoip', color: 'text-[#5c3392]' },
    { label: 'Matched Pairs', value: stats.total_ngo_matches, icon: GitCompare, href: '', color: 'text-[#f2cc64]' },
    { label: 'Journalists', value: stats.total_journalists, icon: Users, href: '/journalists', color: 'text-[#fa7b62]' },
    { label: 'Media Outlets', value: stats.total_outlets, icon: Newspaper, href: '/outlets', color: 'text-[#117777]' },
    { label: 'Relationships', value: stats.total_relationships, icon: Link2, href: '', color: 'text-[#5c3392]' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-scale-h4 font-semibold text-foreground">Overview</h2>
        <p className="text-scale-small text-muted-foreground mt-1">
          All data across your Constellation database
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {cards.map((card) => (
          card.href ? (
            <Link key={card.label} to={card.href}>
              <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-scale-h6 font-medium text-muted-foreground">{card.label}</CardTitle>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-scale-h2 font-bold">{card.value.toLocaleString()}</div>
                  <div className="mt-2 flex items-center gap-1 text-scale-small text-muted-foreground group-hover:text-primary">
                    View all <ArrowRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-scale-h6 font-medium text-muted-foreground">{card.label}</CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-scale-h2 font-bold">{card.value.toLocaleString()}</div>
              </CardContent>
            </Card>
          )
        ))}
      </div>

      {/* Quick status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-scale-h6 font-medium">Data Quality</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="secondary">{stats.outlets_with_eci} outlets with EU coverage</Badge>
          <Badge variant="secondary">{stats.progressive_outlets} progressive outlets</Badge>
          <Badge variant="secondary">{stats.total_ngo_matches} NGO ↔ OKOIP links</Badge>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NGOs
// ═══════════════════════════════════════════════════════════════════════════════

import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Globe, Mail, MapPin } from 'lucide-react';

function NGOListView() {
  const navigate = useNavigate();
  const [ngos, setNGOs] = useState<NGO[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  const load = useCallback((q: string, p: number) => {
    setLoading(true);
    api.getNGOs(q || undefined, p)
      .then((r) => { setNGOs(r.ngos); setTotal(r.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(query, page); }, [query, page, load]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search NGOs by name..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
        <p className="text-scale-small text-muted-foreground">{total} NGOs</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">City</TableHead>
                  <TableHead className="w-20">Web</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ngos.map((n) => (
                  <TableRow
                    key={n.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/ngos/${n.id}/${n.slug || ''}`)}
                  >
                    <TableCell className="font-medium">{n.company_name}</TableCell>
                    <TableCell>{n.category && <Badge variant="secondary" className="text-[10px]">{n.category}</Badge>}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                      {n.email ? <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{n.email}</span> : '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                      {n.city ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{n.city}</span> : '—'}
                    </TableCell>
                    <TableCell>
                      {n.website ? <Globe className="h-3.5 w-3.5 text-muted-foreground" /> : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-scale-small text-muted-foreground px-2">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Platform label map ─────────────────────────────────────────────────────
const PLATFORM_LABELS: Record<string, string> = {
  youbehero:      'YouBeHero',
  social_dynamo:  'Social Dynamo',
  acf:            'ACF',
  ngheroes:       'ngoHeroes',
  ethelon:        'Ethelon',
  desmos:         'Desmos',
};

function NGODetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ngo, setNGO] = useState<NGO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getNGO(Number(id)).then(setNGO).catch(() => {}).finally(() => setLoading(false)); }, [id]);

  if (loading) return <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  if (!ngo) return <p className="text-scale-body text-muted-foreground">NGO not found.</p>;

  const platforms = ngo.platforms || {};
  const hasAnyPlatform = Object.values(platforms).some(arr => (arr?.length || 0) > 0);
  const audits = ngo.website_audits || [];

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/ngos')}>&larr; Back</Button>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-scale-h3 font-semibold">{ngo.company_name}</h2>
          {ngo.website && (
            <a href={ngo.website} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1 text-scale-body text-primary hover:underline">
              <Globe className="h-3.5 w-3.5" />
              {ngo.website.replace(/^https?:\/\//, '').replace(/\/$/, '').substring(0, 40)}
              {ngo.website.replace(/^https?:\/\//, '').length > 40 ? '…' : ''}
            </a>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {ngo.category && <Badge>{ngo.category}</Badge>}
          {ngo.city && <Badge variant="secondary"><MapPin className="h-3 w-3 mr-1" />{ngo.city}</Badge>}
          {ngo.wordpress === 'Yes' && (
            ngo.wordpress_url ? (
              <a href={ngo.wordpress_url} target="_blank" rel="noopener noreferrer">
                <Badge className="bg-[#e0f0f0] text-[#117777] hover:bg-[#d0e8e8]">WordPress ✓</Badge>
              </a>
            ) : <Badge className="bg-[#e0f0f0] text-[#117777]">WordPress ✓</Badge>
          )}
          {ngo.last_modified_raw && <span className="text-[11px] text-muted-foreground self-center">Updated: {ngo.last_modified_raw}</span>}
        </div>
      </div>

      {/* ── Contact & Online Presence ───────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-scale-h6">Contact</CardTitle></CardHeader>
          <CardContent className="text-scale-body space-y-1.5 text-muted-foreground">
            {ngo.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{ngo.email}</span></div>}
            {ngo.phone && <div>📞 {ngo.phone}</div>}
            {ngo.address && <div>📍 {ngo.address}</div>}
            {!ngo.email && !ngo.phone && !ngo.address && <p className="text-xs">No contact info</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-scale-h6">Online Presence</CardTitle></CardHeader>
          <CardContent className="text-scale-body space-y-1.5 text-muted-foreground">
            {ngo.website ? (
              <a href={ngo.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                <Globe className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{ngo.website}</span>
              </a>
            ) : <div className="flex items-center gap-2"><Globe className="h-3.5 w-3.5 shrink-0" />No website</div>}
            {ngo.wordpress === 'Yes' && (
              <div>
                🔧 WordPress
                {ngo.wordpress_url && ngo.wordpress_url !== 'No' ? (
                  <a href={ngo.wordpress_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">{ngo.wordpress_url}</a>
                ) : ''}
              </div>
            )}
            {ngo.last_modified_raw && <div className="text-xs">Last modified: {ngo.last_modified_raw}</div>}
          </CardContent>
        </Card>
      </div>

      {/* ── Social Profiles ─────────────────────────────────────── */}
      {ngo.social && ngo.social.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-scale-h6">Social Profiles</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {ngo.social.map((s, i) => (
              s.profile_url ? (
                <a key={i} href={s.profile_url} target="_blank" rel="noopener noreferrer">
                  <Badge variant="secondary" className="capitalize hover:bg-secondary/80 text-xs">{s.platform}</Badge>
                </a>
              ) : null
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── OKOIP Registry ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-scale-h6">OKOIP Registry {ngo.okoip_matches && ngo.okoip_matches.length > 0 ? `(${ngo.okoip_matches.length})` : ''}</CardTitle>
        </CardHeader>
        <CardContent>
          {ngo.okoip_matches && ngo.okoip_matches.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead className="hidden md:table-cell">TIN</TableHead>
                    <TableHead className="hidden lg:table-cell">Region</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ngo.okoip_matches.map((m, i) => (
                    <TableRow key={i} className="cursor-pointer" onClick={() => navigate(`/okoip/${m.okoip_id}`)}>
                      <TableCell className="font-medium text-scale-body">{m.title || 'Unnamed'}</TableCell>
                      <TableCell>
                        <Badge className={m.match_score >= 0.7 ? 'bg-green-100 text-green-800' : m.match_score >= 0.4 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                          {m.match_method}: {Number(m.match_score).toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs font-mono text-muted-foreground">{m.tin || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-scale-small text-muted-foreground">{m.region || m.prefecture || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-scale-small text-muted-foreground">Not matched to public registry.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Platform Memberships ────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-scale-h6">Platform Memberships</CardTitle></CardHeader>
        <CardContent>
          {hasAnyPlatform ? (
            <div className="space-y-3">
              {Object.entries(platforms).map(([key, entries]) => {
                if (!entries || entries.length === 0) return null;
                return (
                  <div key={key}>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">{PLATFORM_LABELS[key] || key} ({entries.length})</h4>
                    {entries.map((e: PlatformEntry, i: number) => {
                      const url = e.profile_url || (e.acf_slug ? `https://www.actionconservationfund.org/en/grantees/${e.acf_slug}` : null);
                      return url ? (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                           className="block text-xs text-primary hover:underline truncate py-0.5">
                          {url.replace(/^https?:\/\//, '')}
                        </a>
                      ) : null;
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-scale-small text-muted-foreground">No platform memberships recorded. Platforms tracked: YouBeHero, Social Dynamo, ACF, ngoHeroes, Ethelon, Desmos.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Website Audits ──────────────────────────────────────── */}
      {audits.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-scale-h6">Website Audits</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Errors</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">URL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audits.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{a.scan_date || '—'}</TableCell>
                      <TableCell className="text-xs">{a.status_note || '—'}</TableCell>
                      <TableCell className="text-xs">
                        {a.error_rate && <Badge variant={a.error_rate === '0%' || a.error_rate === '0' ? 'secondary' : 'destructive'} className="text-[10px]">{a.error_rate}</Badge>}
                      </TableCell>
                      <TableCell className="text-xs hidden md:table-cell max-w-[200px] truncate">
                        {a.audited_url ? <a href={a.audited_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{a.audited_url.replace(/^https?:\/\//, '')}</a> : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OKOIP
// ═══════════════════════════════════════════════════════════════════════════════

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function OKOIPListView() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<OKOIPRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  useEffect(() => {
    api.getOKOIPCategories().then(r => setCategories(r.categories)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    api.getOKOIPRecords({ q: query || undefined, category: category !== 'all' ? category : undefined, page })
      .then((r) => { setRecords(r.okoip); setTotal(r.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [query, category, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Search by name..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
        <Select value={category} onValueChange={(v) => { setCategory(v ?? 'all'); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.category} value={c.category}>{c.category} ({c.count})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-scale-small text-muted-foreground">{total} records</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden md:table-cell">Region</TableHead>
                  <TableHead className="hidden lg:table-cell">TIN</TableHead>
                  <TableHead className="hidden xl:table-cell">Established</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer"                    onClick={() => navigate(`/okoip/${r.id}`)}>
                    <TableCell className="font-medium">{(r.title || 'Unnamed').substring(0, 60)}</TableCell>
                    <TableCell>{r.category && <Badge variant="secondary" className="text-[10px]">{r.category}</Badge>}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                      {r.region ? (r.region || '').replace(/\(.*\)/, '').trim() : '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-xs font-mono">{r.tin || '—'}</TableCell>
                    <TableCell className="hidden xl:table-cell text-muted-foreground text-xs">
                      {r.incorporation_date_epoch
                        ? new Date(Number(r.incorporation_date_epoch)).toLocaleDateString('el-GR', { year: 'numeric', month: 'short' })
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-scale-small text-muted-foreground px-2">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OKOIPDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<OKOIPRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getOKOIPRecord(id!).then(setRecord).catch(() => {}).finally(() => setLoading(false)); }, [id]);

  if (loading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>;
  if (!record) return <p className="text-scale-body text-muted-foreground">OKOIP record not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/okoip')}>&larr; Back</Button>
      </div>

      <div>
        <h2 className="text-scale-h3 font-semibold">{record.title || 'Unnamed Organization'}</h2>
        <div className="flex flex-wrap gap-2 mt-2">
          {record.category && <Badge>{record.category}</Badge>}
          {record.form_status === 1 && <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>}
          {record.form_status === 2 && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Inactive</Badge>}
          {record.form_status === 3 && <Badge variant="secondary" className="bg-red-100 text-red-800">Deleted</Badge>}
          {record.tin && <Badge variant="outline" className="font-mono text-xs">TIN: {record.tin}</Badge>}
          {record.incorporation_date_epoch && (
            <Badge variant="outline" className="text-xs">
              Est. {new Date(Number(record.incorporation_date_epoch)).toLocaleDateString('el-GR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </Badge>
          )}
        </div>
      </div>

      {/* ── Linked NGOs (top, before everything) ─────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-scale-h6">Linked NGOs {record.linked_ngos?.length ? `(${record.linked_ngos.length})` : ''}</CardTitle>
        </CardHeader>
        <CardContent>
          {record.linked_ngos && record.linked_ngos.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NGO</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {record.linked_ngos.map((l, i) => (
                    <TableRow key={i} className="cursor-pointer" onClick={() => navigate(`/ngos/${l.ngo_id}/${l.slug || ''}`)}>
                      <TableCell className="font-medium">{l.company_name}</TableCell>
                      <TableCell>
                        <Badge className={l.match_score >= 0.7 ? 'bg-green-100 text-green-800' : l.match_score >= 0.4 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                          {l.match_method}: {l.match_score}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{l.email || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-scale-small text-muted-foreground">Not linked to any curated NGOs. Run matching to connect this record.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Contact + Geography ──────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-scale-h6">Contact</CardTitle></CardHeader>
          <CardContent className="text-scale-body space-y-1 text-muted-foreground">
            {record.email && <p>✉ {record.email}</p>}
            {record.phone && <p>📞 {record.phone}</p>}
            <p>📍 {[record.street, record.street_number].filter(Boolean).join(' ') || '—'}{record.postcode ? `, ${record.postcode}` : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-scale-h6">Geography</CardTitle></CardHeader>
          <CardContent className="text-scale-body space-y-1 text-muted-foreground">
            <p>🏛 {(record.region || '').replace(/\(.*\)/, '').trim() || '—'}</p>
            <p>📍 {record.prefecture || ''}{record.municipality ? ` / ${record.municipality}` : ''}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Registry Details ─────────────────────────────────────── */}
      {(record.incorporation_date_epoch || record.sectors) && (
        <Card>
          <CardHeader><CardTitle className="text-scale-h6">Registry Details</CardTitle></CardHeader>
          <CardContent className="text-scale-body space-y-2 text-muted-foreground">
            {record.incorporation_date_epoch && (
              <p>📅 Established: {new Date(Number(record.incorporation_date_epoch)).toLocaleDateString('el-GR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            )}
            {record.sectors ? (
              <div>
                <p className="font-medium text-foreground mb-1">Τομείς Δράσης:</p>
                <div className="flex flex-wrap gap-1">
                  {record.sectors.split(',').map((s, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{s.trim()}</Badge>
                  ))}
                </div>
              </div>
            ) : record.sector_count != null ? (
              <p>📋 Sectors data available ({record.sector_count}), pending scrape</p>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* ── Legal Representative ─────────────────────────────────── */}
      {(record.legal_name || record.legal_surname) && (
        <Card>
          <CardHeader><CardTitle className="text-scale-h6">Legal Representative</CardTitle></CardHeader>
          <CardContent className="text-scale-body text-muted-foreground">
            <p>{[record.legal_name, record.legal_surname].filter(Boolean).join(' ')}{record.legal_tin ? ` (TIN: ${record.legal_tin})` : ''}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Purpose ──────────────────────────────────────────────── */}
      {record.purpose && (
        <Card>
          <CardHeader><CardTitle className="text-scale-h6">Purpose</CardTitle></CardHeader>
          <CardContent className="text-scale-body text-muted-foreground whitespace-pre-line">{record.purpose}</CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// JOURNALISTS
// ═══════════════════════════════════════════════════════════════════════════════

import type { Journalist, Outlet } from './api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function JournalistsView() {
  const navigate = useNavigate();
  const [journalists, setJournalists] = useState<Journalist[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  const load = useCallback((q: string, p: number) => {
    setLoading(true);
    api.getJournalists(q || undefined, p)
      .then((r) => { setJournalists(r.journalists as Journalist[]); setTotal(r.per_page === pageSize && r.journalists.length < pageSize ? (p - 1) * pageSize + r.journalists.length : (p * pageSize)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(query, page); }, [query, page, load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input placeholder="Search journalists..." value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          className="max-w-sm" />
        <p className="text-scale-small text-muted-foreground">{journalists.length > 0 ? `Showing ${journalists.length}` : ''}</p>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Outlet</TableHead>
                <TableHead className="hidden md:table-cell">Beat</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead>Social</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journalists.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No journalists found.</TableCell></TableRow>
              ) : journalists.map((j) => (
                <TableRow key={j.id} className="cursor-pointer" onClick={() => navigate(`/journalists/${j.id}`)}>
                  <TableCell className="font-medium">{j.name}</TableCell>
                  <TableCell className="text-scale-small text-muted-foreground">{j.outlet_name || '—'}</TableCell>
                  <TableCell className="hidden md:table-cell text-scale-small text-muted-foreground">{j.primary_beat || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-scale-small text-muted-foreground">{j.email || '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {j.twitter && <Badge variant="secondary" className="text-[10px]">𝕏</Badge>}
                      {j.linkedin && <Badge variant="secondary" className="text-[10px]">in</Badge>}
                      {j.status && <Badge variant="outline" className="text-[10px]">{j.status.includes('Not') ? '✗' : '✓'}</Badge>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function JournalistDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [journalist, setJournalist] = useState<Journalist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getJournalist(Number(id)).then(setJournalist).catch(() => {}).finally(() => setLoading(false)); }, [id]);

  if (loading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>;
  if (!journalist) return <p className="text-scale-body text-muted-foreground">Journalist not found.</p>;

  const articles: string[] = journalist.articles ? JSON.parse(journalist.articles) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/journalists')}>&larr; Back</Button>
      </div>

      <div>
        <h2 className="text-scale-h3 font-semibold">{journalist.name}</h2>
        <div className="flex flex-wrap gap-2 mt-2">
          {journalist.outlet_name && <Badge variant="secondary">{journalist.outlet_name}</Badge>}
          {journalist.primary_beat && <Badge variant="outline">{journalist.primary_beat}</Badge>}
          {journalist.status && (
            <Badge className={journalist.status.includes('Not') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
              {journalist.status}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="articles">Articles ({articles.length})</TabsTrigger>
          {journalist.outlets && journalist.outlets.length > 0 && <TabsTrigger value="outlets">Outlets ({journalist.outlets.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <Card>
            <CardHeader><CardTitle className="text-scale-h6">Contact</CardTitle></CardHeader>
            <CardContent className="text-scale-body space-y-1 text-muted-foreground">
              {journalist.email && <p>✉ {journalist.email}</p>}
              {journalist.channel && <p>📺 {journalist.channel}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-scale-h6">Social</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {journalist.twitter ? (
                <a href={journalist.twitter} target="_blank" rel="noopener noreferrer"><Badge className="bg-sky-100 text-sky-800 hover:bg-sky-200">𝕏 Twitter</Badge></a>
              ) : null}
              {journalist.linkedin ? (
                <a href={journalist.linkedin} target="_blank" rel="noopener noreferrer"><Badge className="bg-[#e0f0f0] text-[#117777] hover:bg-[#d0e8e8]">in LinkedIn</Badge></a>
              ) : null}
              {!journalist.twitter && !journalist.linkedin && <p className="text-scale-small text-muted-foreground">No social links</p>}
            </CardContent>
          </Card>

          {journalist.bio_notes && (
            <Card>
              <CardHeader><CardTitle className="text-scale-h6">Notes</CardTitle></CardHeader>
              <CardContent className="text-scale-body text-muted-foreground">{journalist.bio_notes}</CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="articles" className="pt-4">
          {articles.length > 0 ? (
            <div className="space-y-1">
              {articles.slice(0, 20).map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                   className="block text-xs text-primary hover:underline truncate py-1 border-b border-border/50 last:border-0">
                  {url.replace(/^https?:\/\//, '').substring(0, 80)}…
                </a>
              ))}
              {articles.length > 20 && <p className="text-scale-small text-muted-foreground mt-2">+{articles.length - 20} more articles</p>}
            </div>
          ) : (
            <p className="text-scale-body text-muted-foreground">No articles recorded.</p>
          )}
        </TabsContent>

        <TabsContent value="outlets" className="pt-4">
          {journalist.outlets && journalist.outlets.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Outlet</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalist.outlets.map((o) => (
                    <TableRow key={o.id} className="cursor-pointer" onClick={() => navigate(`/outlets/${o.id}`)}>
                      <TableCell className="font-medium">{o.name}</TableCell>
                      <TableCell className="text-scale-small text-muted-foreground">{o.role || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-scale-body text-muted-foreground">Not linked to any outlets.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEDIA OUTLETS
// ═══════════════════════════════════════════════════════════════════════════════

function OutletsView() {
  const navigate = useNavigate();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback((q: string, p: number) => {
    setLoading(true);
    api.getOutlets(q || undefined, p)
      .then((r) => setOutlets(r.outlets))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(query, page); }, [query, page, load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input placeholder="Search outlets..." value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          className="max-w-sm" />
        <p className="text-scale-small text-muted-foreground">{outlets.length > 0 ? `Showing ${outlets.length}` : ''}</p>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden md:table-cell">Geo</TableHead>
                <TableHead className="hidden lg:table-cell">Topics</TableHead>
                <TableHead>Scores</TableHead>
                <TableHead>Social</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outlets.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No outlets found.</TableCell></TableRow>
              ) : outlets.map((o) => (
                <TableRow key={o.id} className="cursor-pointer" onClick={() => navigate(`/outlets/${o.id}`)}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell className="text-scale-small text-muted-foreground">{o.type_of_media || '—'}</TableCell>
                  <TableCell className="hidden md:table-cell text-scale-small text-muted-foreground">{o.geographical_level || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-scale-small text-muted-foreground max-w-[150px] truncate">{o.topics || '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {o.combined_score != null && (
                        <Badge className={o.combined_score >= 5 ? 'bg-green-100 text-green-800' : o.combined_score >= 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                          {o.combined_score}
                        </Badge>
                      )}
                      {o.progressive_score != null && o.progressive_score >= 3 && <Badge variant="secondary" className="text-[10px]">P{o.progressive_score}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {o.facebook && <Badge variant="secondary" className="text-[10px]">fb</Badge>}
                      {o.twitter && <Badge variant="secondary" className="text-[10px]">𝕏</Badge>}
                      {o.instagram && <Badge variant="secondary" className="text-[10px]">ig</Badge>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function OutletDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getOutlet(Number(id)).then(setOutlet).catch(() => {}).finally(() => setLoading(false)); }, [id]);

  if (loading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>;
  if (!outlet) return <p className="text-scale-body text-muted-foreground">Outlet not found.</p>;

  const eciArticles: string[] = outlet.eci_articles ? JSON.parse(outlet.eci_articles) : [];
  const people: string[] = outlet.people_names ? outlet.people_names.split(',').map(p => p.trim()).filter(Boolean) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/outlets')}>&larr; Back</Button>
      </div>

      <div>
        <h2 className="text-scale-h3 font-semibold">{outlet.name}</h2>
        {outlet.name_gr && <p className="text-scale-body text-muted-foreground italic">{outlet.name_gr}</p>}
        <div className="flex flex-wrap gap-2 mt-2">
          {outlet.type_of_media && <Badge variant="secondary">{outlet.type_of_media}</Badge>}
          {outlet.geographical_level && <Badge variant="outline">{outlet.geographical_level}</Badge>}
          {outlet.website && (
            <a href={outlet.website} target="_blank" rel="noopener noreferrer">
              <Badge variant="secondary" className="hover:bg-[#d0e8e8]">🌐 Website</Badge>
            </a>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {(outlet.combined_score != null || outlet.progressive_score != null) && <TabsTrigger value="scores">Scores</TabsTrigger>}
          {eciArticles.length > 0 && <TabsTrigger value="eci">ECI ({eciArticles.length})</TabsTrigger>}
          {outlet.journalists && outlet.journalists.length > 0 && <TabsTrigger value="journalists">Journalists ({outlet.journalists.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-scale-h6">Details</CardTitle></CardHeader>
              <CardContent className="text-scale-body space-y-1 text-muted-foreground">
                <p>📍 {outlet.geographical_level || '—'}</p>
                <p>🏷 {outlet.type_of_media || '—'}</p>
                {outlet.topics && <p>📋 {outlet.topics}</p>}
                {outlet.media_companies && <p>🏢 {outlet.media_companies}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-scale-h6">Social Media</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {outlet.facebook && <a href={outlet.facebook} target="_blank" rel="noopener noreferrer"><Badge className="bg-[#e0f0f0] text-[#117777]">Facebook</Badge></a>}
                {outlet.twitter && <a href={outlet.twitter} target="_blank" rel="noopener noreferrer"><Badge className="bg-sky-100 text-sky-800">Twitter</Badge></a>}
                {outlet.instagram && <a href={outlet.instagram} target="_blank" rel="noopener noreferrer"><Badge className="bg-pink-100 text-pink-800">Instagram</Badge></a>}
                {outlet.linkedin && <a href={outlet.linkedin} target="_blank" rel="noopener noreferrer"><Badge className="bg-[#e0f0f0] text-[#117777]">LinkedIn</Badge></a>}
                {outlet.youtube && <a href={outlet.youtube} target="_blank" rel="noopener noreferrer"><Badge className="bg-red-100 text-red-800">YouTube</Badge></a>}
                {!outlet.facebook && !outlet.twitter && !outlet.instagram && !outlet.linkedin && !outlet.youtube &&
                  <p className="text-scale-small text-muted-foreground">No social links recorded</p>}
              </CardContent>
            </Card>
          </div>

          {people.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-scale-h6">People on File ({people.length})</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-1">
                {people.map((p, i) => <Badge key={i} variant="secondary" className="text-[10px]">{p}</Badge>)}
              </CardContent>
            </Card>
          )}

          {outlet.description_gr && (
            <Card>
              <CardHeader><CardTitle className="text-scale-h6">Description</CardTitle></CardHeader>
              <CardContent className="text-scale-body text-muted-foreground">{outlet.description_gr}</CardContent>
            </Card>
          )}
          {outlet.notes && (
            <Card>
              <CardHeader><CardTitle className="text-scale-h6">Notes</CardTitle></CardHeader>
              <CardContent className="text-scale-body text-muted-foreground">{outlet.notes}</CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scores" className="pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            {outlet.combined_score != null && (
              <Card>
                <CardHeader><CardTitle className="text-scale-h6">Combined EU Score</CardTitle></CardHeader>
                <CardContent>
                  <div className={`text-scale-h2 font-bold ${outlet.combined_score >= 5 ? 'text-green-600' : outlet.combined_score >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {outlet.combined_score}
                  </div>
                </CardContent>
              </Card>
            )}
            {outlet.progressive_score != null && (
              <Card>
                <CardHeader><CardTitle className="text-scale-h6">Progressive Score</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-scale-h2 font-bold text-[#5c3392]">{outlet.progressive_score}</div>
                </CardContent>
              </Card>
            )}
            {outlet.eu_coverage_score != null && (
              <Card>
                <CardHeader><CardTitle className="text-scale-h6">EU Coverage Score</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-scale-h2 font-bold text-primary">{outlet.eu_coverage_score}</div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="eci" className="pt-4">
          <div className="space-y-1">
            {eciArticles.map((item, i) => (
              <p key={i} className="text-scale-small text-muted-foreground py-1 border-b border-border/50 last:border-0">{item}</p>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="journalists" className="pt-4">
          {outlet.journalists && outlet.journalists.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Social</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outlet.journalists.map((j) => (
                    <TableRow key={j.id} className="cursor-pointer" onClick={() => navigate(`/journalists/${j.id}`)}>
                      <TableCell className="font-medium">{j.name}</TableCell>
                      <TableCell className="text-scale-small text-muted-foreground">{j.role || '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {j.twitter && <Badge variant="secondary" className="text-[10px]">𝕏</Badge>}
                          {j.linkedin && <Badge variant="secondary" className="text-[10px]">in</Badge>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-scale-body text-muted-foreground">No journalists linked.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default App;
