import { useState, useEffect } from 'react';
import { api, type DataHealth, type EnrichResult } from '@/api';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Heart, Mail, Phone, MapPin, Globe, Building2, Sparkles, AlertCircle,
} from 'lucide-react';

function pct(filled: number, total: number): string {
  if (!total) return '0%';
  return Math.round((filled / total) * 100) + '%';
}

export function DataHealthView() {
  const [health, setHealth] = useState<DataHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [result, setResult] = useState<EnrichResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getDataHealth()
      .then(setHealth)
      .catch(() => setError('Failed to load data health metrics'))
      .finally(() => setLoading(false));
  }, []);

  const handleEnrich = async () => {
    setEnriching(true);
    setError('');
    try {
      const r = await api.applyEnrichment();
      setResult(r);
      // Refresh health data
      const fresh = await api.getDataHealth();
      setHealth(fresh);
    } catch {
      setError('Enrichment failed');
    } finally {
      setEnriching(false);
    }
  };

  if (loading) return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
    </div>
  );

  if (!health) return <p className="text-scale-body text-muted-foreground">No data health metrics available.</p>;

  const { ngos, matches, enrich_opportunities: opps } = health;

  const fields = [
    { label: 'Email', filled: ngos.with_email, icon: Mail, color: 'text-primary' },
    { label: 'Phone', filled: ngos.with_phone, icon: Phone, color: 'text-[#5c3392]' },
    { label: 'Address', filled: ngos.with_address, icon: MapPin, color: 'text-[#fa7b62]' },
    { label: 'Website', filled: ngos.with_website, icon: Globe, color: 'text-[#f2cc64]' },
    { label: 'City', filled: ngos.with_city, icon: Building2, color: 'text-[#117777]' },
  ];

  const oppFields = [
    { label: 'Email', count: opps.email, icon: Mail },
    { label: 'Phone', count: opps.phone, icon: Phone },
    { label: 'Address', count: opps.address, icon: MapPin },
    { label: 'City', count: opps.city, icon: Building2 },
  ];

  const overallPct = pct(
    ngos.with_email + ngos.with_phone + ngos.with_address + ngos.with_website + ngos.with_city,
    ngos.total * 5,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-scale-h4 font-semibold text-foreground">Data Health</h2>
        <p className="text-scale-small text-muted-foreground mt-1">
          NGO field completeness and OKOIP enrichment readiness
        </p>
      </div>

      {/* Overview cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-scale-h6 font-medium text-muted-foreground">Overall</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-scale-h2 font-bold">{overallPct}</div>
            <p className="text-scale-small text-muted-foreground mt-1">{ngos.total} NGOs tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-scale-h6 font-medium text-muted-foreground">Matched</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-scale-h2 font-bold text-primary">{matches.total}</div>
            <p className="text-scale-small text-muted-foreground mt-1">
              {matches.high_confidence} high · {matches.medium_confidence} med · {matches.low_confidence} low
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-scale-h6 font-medium text-muted-foreground">Unmatched</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-scale-h2 font-bold text-[#fa7b62]">{health.unmatched_ngos}</div>
            <p className="text-scale-small text-muted-foreground mt-1">NGOs without OKOIP link</p>
          </CardContent>
        </Card>

        <Card className={opps.total > 0 ? 'border-[#f2cc64]/50 bg-[#fdf8e8]' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-scale-h6 font-medium text-muted-foreground">Ready to Enrich</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-scale-h2 font-bold text-[#f2cc64]">{opps.total}</div>
            <p className="text-scale-small text-muted-foreground mt-1">gaps OKOIP can fill</p>
          </CardContent>
        </Card>
      </div>

      {/* Field completeness */}
      <Card>
        <CardHeader>
          <CardTitle className="text-scale-h6 font-medium">Field Completeness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {fields.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <f.icon className={`h-4 w-4 shrink-0 ${f.color}`} />
                <span className="text-scale-body w-20">{f.label}</span>
                <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: pct(f.filled, ngos.total),
                      backgroundColor: f.label === 'Email' ? '#117777'
                        : f.label === 'Phone' ? '#5c3392'
                        : f.label === 'Address' ? '#fa7b62'
                        : f.label === 'Website' ? '#f2cc64'
                        : '#117777',
                    }}
                  />
                </div>
                <span className="text-scale-small text-muted-foreground w-14 text-right">
                  {pct(f.filled, ngos.total)}
                </span>
                <span className="text-scale-small text-muted-foreground w-20 text-right">
                  {f.filled}/{ngos.total}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Enrichment opportunities + match quality */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-scale-h6 font-medium">Enrichment Opportunities</CardTitle>
            <Button
              size="sm"
              disabled={opps.total === 0 || enriching}
              onClick={handleEnrich}
              className="gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {enriching ? 'Enriching…' : 'Apply Enrichment'}
            </Button>
          </CardHeader>
          <CardContent>
            {opps.total === 0 ? (
              <p className="text-scale-small text-muted-foreground">All fields are complete for matched NGOs. 🎉</p>
            ) : (
              <div className="space-y-2">
                {oppFields.map((f) => (
                  <div key={f.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <f.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-scale-body">{f.label}</span>
                    </div>
                    <Badge variant={f.count > 0 ? 'secondary' : 'outline'}>{f.count} gaps</Badge>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="mt-3 flex items-center gap-2 text-scale-small text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />{error}
              </div>
            )}

            {result && (
              <div className="mt-3 p-3 rounded-lg bg-[#e0f0f0] text-scale-small text-[#117777]">
                <p className="font-medium">Enrichment applied ✨</p>
                <p className="mt-1">
                  Updated fields: {result.enriched_fields.join(', ')}<br />
                  After: {result.after.with_email} emails, {result.after.with_phone} phones,{' '}
                  {result.after.with_address} addresses, {result.after.with_city} cities
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-scale-h6 font-medium">Match Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-scale-body">High (≥70%)</span>
                </div>
                <span className="text-scale-h2 font-bold text-green-600">{matches.high_confidence}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-scale-body">Medium (40-69%)</span>
                </div>
                <span className="text-scale-h2 font-bold text-yellow-600">{matches.medium_confidence}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-scale-body">Low (&lt;40%)</span>
                </div>
                <span className="text-scale-h2 font-bold text-red-600">{matches.low_confidence}</span>
              </div>
            </div>
            <p className="text-scale-small text-muted-foreground mt-3">
              Enrichment only applies to high-confidence matches (≥70%)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
