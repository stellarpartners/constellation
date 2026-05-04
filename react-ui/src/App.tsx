import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from './api';
import type { Stats, NGO, OKOIPRecord } from './api';

// ─── Views ───────────────────────────────────────────────────────────────────

type View = 'dashboard' | 'ngo-list' | 'ngo-detail' | 'okoip-list' | 'okoip-detail' | 'journalists' | 'journalist-detail' | 'outlets' | 'outlet-detail';

function App() {
  const [view, setView] = useState<View>('dashboard');
  const [entityId, setEntityId] = useState<number | string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {});
  }, []);

  const navigate = useCallback((v: View, id?: number | string) => {
    setView(v);
    setEntityId(id ?? null);
  }, []);

  const title = view === 'dashboard' ? 'Dashboard' :
    view === 'ngo-list' ? 'NGOs' :
    view === 'okoip-list' ? 'OKOIP Registry' :
    view === 'journalists' ? 'Journalists' :
    view === 'outlets' ? 'Media Outlets' :
    view === 'journalist-detail' ? 'Journalist' :
    view === 'outlet-detail' ? 'Media Outlet' : 'Constellation';

  return (
    <DashboardLayout title={title}>
      {view === 'dashboard' && <DashboardView stats={stats} onNavigate={navigate} />}
      {view === 'ngo-list' && <NGOListView onSelect={(id) => navigate('ngo-detail', id)} />}
      {view === 'ngo-detail' && <NGODetailView id={entityId as number} onBack={() => navigate('ngo-list')} onSelectOKOIP={(id) => navigate('okoip-detail', id)} />}
      {view === 'okoip-list' && <OKOIPListView onSelect={(id) => navigate('okoip-detail', id)} />}
      {view === 'okoip-detail' && <OKOIPDetailView id={entityId as number | string} onBack={() => navigate('okoip-list')} onSelectNGO={(id) => navigate('ngo-detail', id)} />}
      {view === 'journalists' && <JournalistsView onSelect={(id) => navigate('journalist-detail', id)} />}
      {view === 'journalist-detail' && <JournalistDetailView id={entityId as number} onBack={() => navigate('journalists')} onSelectOutlet={(id) => navigate('outlet-detail', id)} />}
      {view === 'outlets' && <OutletsView onSelect={(id) => navigate('outlet-detail', id)} />}
      {view === 'outlet-detail' && <OutletDetailView id={entityId as number} onBack={() => navigate('outlets')} onSelectJournalist={(id) => navigate('journalist-detail', id)} />}
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

function DashboardView({ stats, onNavigate }: { stats: Stats | null; onNavigate: (v: View, id?: number | string) => void }) {
  if (!stats) return null;

  const cards = [
    { label: 'NGOs Curated', value: stats.total_ngos, icon: Building2, href: 'ngo-list', color: 'text-blue-600' },
    { label: 'OKOIP Registry', value: stats.total_okoip, icon: Database, href: 'okoip-list', color: 'text-emerald-600' },
    { label: 'Matched Pairs', value: stats.total_ngo_matches, icon: GitCompare, href: '', color: 'text-purple-600' },
    { label: 'Journalists', value: stats.total_journalists, icon: Users, href: 'journalists', color: 'text-orange-600' },
    { label: 'Media Outlets', value: stats.total_outlets, icon: Newspaper, href: 'outlets', color: 'text-rose-600' },
    { label: 'Relationships', value: stats.total_relationships, icon: Link2, href: '', color: 'text-cyan-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">
          All data across your Constellation database
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {cards.map((card) => (
          <Card
            key={card.label}
            className={card.href ? 'cursor-pointer hover:border-primary/50 transition-colors' : ''}
            onClick={() => card.href && onNavigate(card.href as View)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value.toLocaleString()}</div>
              {card.href && (
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                  View all <ArrowRight className="h-3 w-3" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
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

function NGOListView({ onSelect }: { onSelect: (id: number) => void }) {
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
        <p className="text-xs text-muted-foreground">{total} NGOs</p>
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
                    onClick={() => onSelect(n.id)}
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
              <span className="text-xs text-muted-foreground px-2">{page} / {totalPages}</span>
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

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function NGODetailView({ id, onBack, onSelectOKOIP }: { id: number; onBack: () => void; onSelectOKOIP: (id: number) => void }) {
  const [ngo, setNGO] = useState<NGO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getNGO(id).then(setNGO).catch(() => {}).finally(() => setLoading(false)); }, [id]);

  if (loading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>;
  if (!ngo) return <p className="text-sm text-muted-foreground">NGO not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>&larr; Back</Button>
      </div>

      <div>
        <h2 className="text-xl font-semibold">{ngo.company_name}</h2>
        <div className="flex flex-wrap gap-2 mt-2">
          {ngo.category && <Badge>{ngo.category}</Badge>}
          {ngo.city && <Badge variant="secondary"><MapPin className="h-3 w-3 mr-1" />{ngo.city}</Badge>}
          {ngo.website && <Badge variant="outline" className="text-xs"><Globe className="h-3 w-3 mr-1" />Website</Badge>}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="okoip">OKOIP Links ({ngo.okoip_matches?.length || 0})</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Contact</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1 text-muted-foreground">
              {ngo.email && <p>✉ {ngo.email}</p>}
              {ngo.phone && <p>📞 {ngo.phone}</p>}
              {ngo.address && <p>📍 {ngo.address}</p>}
              {ngo.hubspot_id && <p>🏢 HubSpot ID: {ngo.hubspot_id}</p>}
            </CardContent>
          </Card>

          {ngo.social && ngo.social.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Social Profiles</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {ngo.social.map((s, i) => (
                  s.profile_url ? (
                    <a key={i} href={s.profile_url} target="_blank" rel="noopener noreferrer">
                      <Badge variant="secondary" className="text-xs capitalize">{s.platform}</Badge>
                    </a>
                  ) : null
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="okoip" className="pt-4">
          {ngo.okoip_matches && ngo.okoip_matches.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ngo.okoip_matches.map((m, i) => (
                    <TableRow key={i} className="cursor-pointer" onClick={() => onSelectOKOIP(m.okoip_id as unknown as number)}>
                      <TableCell className="font-medium">{m.title || 'Unnamed'}</TableCell>
                      <TableCell>
                        <Badge className={m.match_score >= 0.7 ? 'bg-green-100 text-green-800' : m.match_score >= 0.4 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                          {m.match_method}: {m.match_score}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{m.okoip_email || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No OKOIP matches.</p>
          )}
        </TabsContent>

        <TabsContent value="platforms" className="pt-4">
          {ngo.platforms && Object.keys(ngo.platforms).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(ngo.platforms).map(([platform, links]) => (
                <Card key={platform}>
                  <CardHeader><CardTitle className="text-sm capitalize">{platform}</CardTitle></CardHeader>
                  <CardContent className="space-y-1">
                    {(links as any[]).map((l, i) => (
                      l.profile_url ? (
                        <a key={i} href={l.profile_url} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-600 hover:underline truncate">
                          {l.profile_url}
                        </a>
                      ) : null
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No platform links.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OKOIP
// ═══════════════════════════════════════════════════════════════════════════════

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function OKOIPListView({ onSelect }: { onSelect: (id: number | string) => void }) {
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
        <p className="text-xs text-muted-foreground">{total} records</p>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => onSelect(r.id)}>
                    <TableCell className="font-medium">{(r.title || 'Unnamed').substring(0, 60)}</TableCell>
                    <TableCell>{r.category && <Badge variant="secondary" className="text-[10px]">{r.category}</Badge>}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                      {r.region ? (r.region || '').replace(/\(.*\)/, '').trim() : '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-xs font-mono">{r.tin || '—'}</TableCell>
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
              <span className="text-xs text-muted-foreground px-2">{page} / {totalPages}</span>
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

function OKOIPDetailView({ id, onBack, onSelectNGO }: { id: number | string; onBack: () => void; onSelectNGO: (id: number) => void }) {
  const [record, setRecord] = useState<OKOIPRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getOKOIPRecord(id).then(setRecord).catch(() => {}).finally(() => setLoading(false)); }, [id]);

  if (loading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>;
  if (!record) return <p className="text-sm text-muted-foreground">OKOIP record not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>&larr; Back</Button>
      </div>

      <div>
        <h2 className="text-xl font-semibold">{record.title || 'Unnamed Organization'}</h2>
        <div className="flex flex-wrap gap-2 mt-2">
          {record.category && <Badge>{record.category}</Badge>}
          {record.form_status === 1 && <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>}
          {record.tin && <Badge variant="outline" className="font-mono text-xs">TIN: {record.tin}</Badge>}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ngos">Linked NGOs ({record.linked_ngos?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Contact</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1 text-muted-foreground">
                {record.email && <p>✉ {record.email}</p>}
                {record.phone && <p>📞 {record.phone}</p>}
                <p>📍 {[record.street, record.street_number].filter(Boolean).join(' ') || '—'}{record.postcode ? `, ${record.postcode}` : ''}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Geography</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1 text-muted-foreground">
                <p>🏛 {(record.region || '').replace(/\(.*\)/, '').trim() || '—'}</p>
                <p>📍 {record.prefecture || ''}{record.municipality ? ` / ${record.municipality}` : ''}</p>
              </CardContent>
            </Card>
          </div>

          {(record.legal_name || record.legal_surname) && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Legal Representative</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>{[record.legal_name, record.legal_surname].filter(Boolean).join(' ')}{record.legal_tin ? ` (TIN: ${record.legal_tin})` : ''}</p>
              </CardContent>
            </Card>
          )}

          {record.purpose && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Purpose</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground whitespace-pre-line">{record.purpose}</CardContent>
            </Card>
          )}

          {record.grant_value != null && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Grant</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">€{Number(record.grant_value).toLocaleString()}</CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ngos" className="pt-4">
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
                    <TableRow key={i} className="cursor-pointer" onClick={() => onSelectNGO(l.ngo_id)}>
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
            <p className="text-sm text-muted-foreground">Not linked to any curated NGOs.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// JOURNALISTS
// ═══════════════════════════════════════════════════════════════════════════════

import type { Journalist, Outlet, Stats } from './api';

function JournalistsView({ onSelect }: { onSelect: (id: number) => void }) {
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
        <p className="text-xs text-muted-foreground">{journalists.length > 0 ? `Showing ${journalists.length}` : ''}</p>
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
                <TableRow key={j.id} className="cursor-pointer" onClick={() => onSelect(j.id)}>
                  <TableCell className="font-medium">{j.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{j.outlet_name || '—'}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{j.primary_beat || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{j.email || '—'}</TableCell>
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

function JournalistDetailView({ id, onBack, onSelectOutlet }: { id: number; onBack: () => void; onSelectOutlet: (id: number) => void }) {
  const [journalist, setJournalist] = useState<Journalist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getJournalist(id).then(setJournalist).catch(() => {}).finally(() => setLoading(false)); }, [id]);

  if (loading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>;
  if (!journalist) return <p className="text-sm text-muted-foreground">Journalist not found.</p>;

  const articles: string[] = journalist.articles ? JSON.parse(journalist.articles) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>&larr; Back</Button>
      </div>

      <div>
        <h2 className="text-xl font-semibold">{journalist.name}</h2>
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
            <CardHeader><CardTitle className="text-sm">Contact</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1 text-muted-foreground">
              {journalist.email && <p>✉ {journalist.email}</p>}
              {journalist.channel && <p>📺 {journalist.channel}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Social</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {journalist.twitter ? (
                <a href={journalist.twitter} target="_blank" rel="noopener noreferrer"><Badge className="bg-sky-100 text-sky-800 hover:bg-sky-200">𝕏 Twitter</Badge></a>
              ) : null}
              {journalist.linkedin ? (
                <a href={journalist.linkedin} target="_blank" rel="noopener noreferrer"><Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">in LinkedIn</Badge></a>
              ) : null}
              {!journalist.twitter && !journalist.linkedin && <p className="text-xs text-muted-foreground">No social links</p>}
            </CardContent>
          </Card>

          {journalist.bio_notes && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">{journalist.bio_notes}</CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="articles" className="pt-4">
          {articles.length > 0 ? (
            <div className="space-y-1">
              {articles.slice(0, 20).map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                   className="block text-xs text-blue-600 hover:underline truncate py-1 border-b border-border/50 last:border-0">
                  {url.replace(/^https?:\/\//, '').substring(0, 80)}…
                </a>
              ))}
              {articles.length > 20 && <p className="text-xs text-muted-foreground mt-2">+{articles.length - 20} more articles</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No articles recorded.</p>
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
                    <TableRow key={o.id} className="cursor-pointer" onClick={() => onSelectOutlet(o.id)}>
                      <TableCell className="font-medium">{o.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{o.role || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not linked to any outlets.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEDIA OUTLETS
// ═══════════════════════════════════════════════════════════════════════════════

function OutletsView({ onSelect }: { onSelect: (id: number) => void }) {
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
        <p className="text-xs text-muted-foreground">{outlets.length > 0 ? `Showing ${outlets.length}` : ''}</p>
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
                <TableRow key={o.id} className="cursor-pointer" onClick={() => onSelect(o.id)}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{o.type_of_media || '—'}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{o.geographical_level || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[150px] truncate">{o.topics || '—'}</TableCell>
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

function OutletDetailView({ id, onBack, onSelectJournalist }: { id: number; onBack: () => void; onSelectJournalist: (id: number) => void }) {
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getOutlet(id).then(setOutlet).catch(() => {}).finally(() => setLoading(false)); }, [id]);

  if (loading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>;
  if (!outlet) return <p className="text-sm text-muted-foreground">Outlet not found.</p>;

  const eciArticles: string[] = outlet.eci_articles ? JSON.parse(outlet.eci_articles) : [];
  const people: string[] = outlet.people_names ? outlet.people_names.split(',').map(p => p.trim()).filter(Boolean) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>&larr; Back</Button>
      </div>

      <div>
        <h2 className="text-xl font-semibold">{outlet.name}</h2>
        {outlet.name_gr && <p className="text-sm text-muted-foreground italic">{outlet.name_gr}</p>}
        <div className="flex flex-wrap gap-2 mt-2">
          {outlet.type_of_media && <Badge variant="secondary">{outlet.type_of_media}</Badge>}
          {outlet.geographical_level && <Badge variant="outline">{outlet.geographical_level}</Badge>}
          {outlet.website && (
            <a href={outlet.website} target="_blank" rel="noopener noreferrer">
              <Badge variant="secondary" className="hover:bg-blue-100">🌐 Website</Badge>
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
              <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1 text-muted-foreground">
                <p>📍 {outlet.geographical_level || '—'}</p>
                <p>🏷 {outlet.type_of_media || '—'}</p>
                {outlet.topics && <p>📋 {outlet.topics}</p>}
                {outlet.media_companies && <p>🏢 {outlet.media_companies}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Social Media</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {outlet.facebook && <a href={outlet.facebook} target="_blank" rel="noopener noreferrer"><Badge className="bg-blue-100 text-blue-800">Facebook</Badge></a>}
                {outlet.twitter && <a href={outlet.twitter} target="_blank" rel="noopener noreferrer"><Badge className="bg-sky-100 text-sky-800">Twitter</Badge></a>}
                {outlet.instagram && <a href={outlet.instagram} target="_blank" rel="noopener noreferrer"><Badge className="bg-pink-100 text-pink-800">Instagram</Badge></a>}
                {outlet.linkedin && <a href={outlet.linkedin} target="_blank" rel="noopener noreferrer"><Badge className="bg-blue-100 text-blue-800">LinkedIn</Badge></a>}
                {outlet.youtube && <a href={outlet.youtube} target="_blank" rel="noopener noreferrer"><Badge className="bg-red-100 text-red-800">YouTube</Badge></a>}
                {!outlet.facebook && !outlet.twitter && !outlet.instagram && !outlet.linkedin && !outlet.youtube &&
                  <p className="text-xs text-muted-foreground">No social links recorded</p>}
              </CardContent>
            </Card>
          </div>

          {people.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">People on File ({people.length})</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-1">
                {people.map((p, i) => <Badge key={i} variant="secondary" className="text-[10px]">{p}</Badge>)}
              </CardContent>
            </Card>
          )}

          {outlet.description_gr && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Description</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">{outlet.description_gr}</CardContent>
            </Card>
          )}
          {outlet.notes && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">{outlet.notes}</CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scores" className="pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            {outlet.combined_score != null && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Combined EU Score</CardTitle></CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${outlet.combined_score >= 5 ? 'text-green-600' : outlet.combined_score >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {outlet.combined_score}
                  </div>
                </CardContent>
              </Card>
            )}
            {outlet.progressive_score != null && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Progressive Score</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">{outlet.progressive_score}</div>
                </CardContent>
              </Card>
            )}
            {outlet.eu_coverage_score != null && (
              <Card>
                <CardHeader><CardTitle className="text-sm">EU Coverage Score</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{outlet.eu_coverage_score}</div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="eci" className="pt-4">
          <div className="space-y-1">
            {eciArticles.map((item, i) => (
              <p key={i} className="text-xs text-muted-foreground py-1 border-b border-border/50 last:border-0">{item}</p>
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
                    <TableRow key={j.id} className="cursor-pointer" onClick={() => onSelectJournalist(j.id)}>
                      <TableCell className="font-medium">{j.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{j.role || '—'}</TableCell>
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
            <p className="text-sm text-muted-foreground">No journalists linked.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default App;
