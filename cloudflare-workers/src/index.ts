import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { neon } from '@neondatabase/serverless';

// ─── Types ───────────────────────────────────────────────────────────────────

interface JournalistRow {
  id: string;
  name: string;
  email: string | null;
  primary_beat: string | null;
  bio_notes: string | null;
  twitter: string | null;
  linkedin: string | null;
  status: string | null;
  channel: string | null;
  articles: string | null;
  outlet_name: string | null;
}

interface OutletRow {
  id: string;
  name: string;
  name_gr: string | null;
  website: string | null;
  type_of_media: string | null;
  geographical_level: string | null;
  topics: string | null;
  description_gr: string | null;
  media_companies: string | null;
  facebook: string | null;
  twitter: string | null;
  instagram: string | null;
  linkedin: string | null;
  youtube: string | null;
  people_names: string | null;
  articles: string | null;
  eci_articles: string | null;
  progressive_score: string | null;
  eu_coverage_score: string | null;
  combined_score: string | null;
  notes: string | null;
}

interface TopOutletRow {
  id: string;
  name: string;
  journalist_count: string;
  type_of_media: string | null;
  geographical_level: string | null;
  combined_score: string | null;
}

// ─── App ──────────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: { NEON_CONNECTION_STRING: string } }>();

app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Routes ─────────────────────────────────────────────────────────────────

// GET /api/stats
app.get('/api/stats', async (c) => {
  const connectionString = c.env.NEON_CONNECTION_STRING;
  if (!connectionString) {
    return c.json({ error: 'Database not configured' }, 500);
  }

  try {
    const sql = neon(connectionString);

    const [journalistCount] = await sql<[{ count: string }]>`
      SELECT COUNT(*) as count FROM journalists
    `;
    const [outletCount] = await sql<[{ count: string }]>`
      SELECT COUNT(*) as count FROM media_outlets
    `;
    const [relCount] = await sql<[{ count: string }]>`
      SELECT COUNT(*) as count FROM outlet_journalist_relations
    `;
    const [eciOutlets] = await sql<[{ count: string }]>`
      SELECT COUNT(*) as count FROM media_outlets WHERE eci_articles IS NOT NULL
    `;
    const [progOutlets] = await sql<[{ count: string }]>`
      SELECT COUNT(*) as count FROM media_outlets WHERE progressive_score >= 2
    `;

    return c.json({
      total_journalists:   Number(journalistCount.count),
      total_outlets:      Number(outletCount.count),
      total_relationships: Number(relCount.count),
      outlets_with_eci:    Number(eciOutlets.count),
      progressive_outlets:  Number(progOutlets.count),
    });
  } catch (err) {
    console.error('Stats error:', err);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

// GET /api/top-outlets/:limit
app.get('/api/top-outlets/:limit', async (c) => {
  const connectionString = c.env.NEON_CONNECTION_STRING;
  if (!connectionString) {
    return c.json({ error: 'Database not configured' }, 500);
  }

  const limit = Math.min(Number(c.req.param('limit')) || 15, 100);

  try {
    const sql = neon(connectionString);
    const rows = await sql<TopOutletRow[]>`
      SELECT mo.id, mo.name,
             COUNT(ojr.journalist_id) as journalist_count,
             mo.type_of_media,
             mo.geographical_level,
             mo.combined_score
      FROM media_outlets mo
      LEFT JOIN outlet_journalist_relations ojr ON mo.id = ojr.media_outlet_id
      GROUP BY mo.id, mo.name, mo.type_of_media, mo.geographical_level, mo.combined_score
      ORDER BY journalist_count DESC, mo.name ASC
      LIMIT ${limit}
    `;

    return c.json({
      outlets: rows.map(r => ({
        id:                Number(r.id),
        name:              r.name,
        journalist_count:  Number(r.journalist_count),
        type_of_media:     r.type_of_media ?? null,
        geographical_level: r.geographical_level ?? null,
        combined_score:    r.combined_score != null ? Number(r.combined_score) : null,
      })),
    });
  } catch (err) {
    console.error('Top outlets error:', err);
    return c.json({ error: 'Failed to fetch top outlets' }, 500);
  }
});

// GET /api/journalists
app.get('/api/journalists', async (c) => {
  const connectionString = c.env.NEON_CONNECTION_STRING;
  if (!connectionString) {
    return c.json({ error: 'Database not configured' }, 500);
  }

  const search  = c.req.query('q') || '';
  const page    = Math.max(1, Number(c.req.query('page') || 1));
  const perPage = Math.min(50, Number(c.req.query('per_page') || 20));
  const offset  = (page - 1) * perPage;

  try {
    const sql = neon(connectionString);

    if (search) {
      const rows = await sql<JournalistRow[]>`
        SELECT * FROM journalists
        WHERE name ILIKE ${'%' + search + '%'}
        ORDER BY name ASC
        LIMIT ${perPage} OFFSET ${offset}
      `;
      return c.json({ journalists: rows.map(r => ({ ...r, id: Number(r.id) })), page, per_page: perPage });
    }

    const rows = await sql<JournalistRow[]>`
      SELECT * FROM journalists
      ORDER BY name ASC
      LIMIT ${perPage} OFFSET ${offset}
    `;
    return c.json({ journalists: rows.map(r => ({ ...r, id: Number(r.id) })), page, per_page: perPage });
  } catch (err) {
    console.error('Journalists list error:', err);
    return c.json({ error: 'Failed to fetch journalists' }, 500);
  }
});

// GET /api/journalists/:id
app.get('/api/journalists/:id', async (c) => {
  const connectionString = c.env.NEON_CONNECTION_STRING;
  if (!connectionString) {
    return c.json({ error: 'Database not configured' }, 500);
  }

  const id = c.req.param('id');

  try {
    const sql = neon(connectionString);

    const [journalist] = await sql<JournalistRow[]>`
      SELECT * FROM journalists WHERE id = ${id}
    `;

    if (!journalist) {
      return c.json({ error: 'Journalist not found' }, 404);
    }

    const outlets = await sql<{ id: string; name: string; role: string | null; twitter: string | null }[]>`
      SELECT mo.id, mo.name, ojr.role, mo.twitter
      FROM outlet_journalist_relations ojr
      JOIN media_outlets mo ON ojr.media_outlet_id = mo.id
      WHERE ojr.journalist_id = ${id}
    `;

    const [countRow] = await sql<[{ count: string }]>`
      SELECT COUNT(*) as count FROM outlet_journalist_relations
      WHERE journalist_id = ${id}
    `;

    return c.json({
      ...journalist,
      id: Number(journalist.id),
      outlets: outlets.map(o => ({ id: Number(o.id), name: o.name, role: o.role, twitter: o.twitter })),
      total_outlets: Number(countRow.count),
    });
  } catch (err) {
    console.error('Journalist detail error:', err);
    return c.json({ error: 'Failed to fetch journalist' }, 500);
  }
});

// GET /api/outlets
app.get('/api/outlets', async (c) => {
  const connectionString = c.env.NEON_CONNECTION_STRING;
  if (!connectionString) {
    return c.json({ error: 'Database not configured' }, 500);
  }

  const search   = c.req.query('q') || '';
  const page     = Math.max(1, Number(c.req.query('page') || 1));
  const perPage  = Math.min(50, Number(c.req.query('per_page') || 20));
  const offset   = (page - 1) * perPage;

  try {
    const sql = neon(connectionString);

    if (search) {
      const rows = await sql<OutletRow[]>`
        SELECT * FROM media_outlets
        WHERE name ILIKE ${'%' + search + '%'}
        ORDER BY combined_score DESC NULLS LAST, name ASC
        LIMIT ${perPage} OFFSET ${offset}
      `;
      return c.json({ outlets: rows.map(r => ({ ...r, id: Number(r.id) })), page, per_page: perPage });
    }

    const rows = await sql<OutletRow[]>`
      SELECT * FROM media_outlets
      ORDER BY combined_score DESC NULLS LAST, name ASC
      LIMIT ${perPage} OFFSET ${offset}
    `;
    return c.json({ outlets: rows.map(r => ({ ...r, id: Number(r.id) })), page, per_page: perPage });
  } catch (err) {
    console.error('Outlets list error:', err);
    return c.json({ error: 'Failed to fetch outlets' }, 500);
  }
});

// GET /api/outlets/:id
app.get('/api/outlets/:id', async (c) => {
  const connectionString = c.env.NEON_CONNECTION_STRING;
  if (!connectionString) {
    return c.json({ error: 'Database not configured' }, 500);
  }

  const id = c.req.param('id');

  try {
    const sql = neon(connectionString);

    const [outlet] = await sql<OutletRow[]>`
      SELECT * FROM media_outlets WHERE id = ${id}
    `;

    if (!outlet) {
      return c.json({ error: 'Outlet not found' }, 404);
    }

    const journalists = await sql<{ id: string; name: string; role: string | null; twitter: string | null; linkedin: string | null }[]>`
      SELECT j.id, j.name, ojr.role, j.twitter, j.linkedin
      FROM outlet_journalist_relations ojr
      JOIN journalists j ON ojr.journalist_id = j.id
      WHERE ojr.media_outlet_id = ${id}
    `;

    const [countRow] = await sql<[{ count: string }]>`
      SELECT COUNT(*) as count FROM outlet_journalist_relations
      WHERE media_outlet_id = ${id}
    `;

    return c.json({
      ...outlet,
      id: Number(outlet.id),
      journalists: journalists.map(j => ({ id: Number(j.id), name: j.name, role: j.role, twitter: j.twitter, linkedin: j.linkedin })),
      total_journalists: Number(countRow.count),
    });
  } catch (err) {
    console.error('Outlet detail error:', err);
    return c.json({ error: 'Failed to fetch outlet' }, 500);
  }
});

// GET /api/cross-platform-journalists
app.get('/api/cross-platform-journalists', async (c) => {
  const connectionString = c.env.NEON_CONNECTION_STRING;
  if (!connectionString) {
    return c.json({ error: 'Database not configured' }, 500);
  }

  try {
    const sql = neon(connectionString);

    const rows = await sql<JournalistRow[]>`
      SELECT j.*, COUNT(ojr.media_outlet_id) as outlet_count
      FROM journalists j
      JOIN outlet_journalist_relations ojr ON j.id = ojr.journalist_id
      GROUP BY j.id
      HAVING COUNT(ojr.media_outlet_id) > 1
      ORDER BY outlet_count DESC, j.name ASC
    `;

    return c.json({ journalists: rows.map(r => ({ ...r, id: Number(r.id) })) });
  } catch (err) {
    console.error('Cross-platform error:', err);
    return c.json({ error: 'Failed to fetch cross-platform journalists' }, 500);
  }
});

// GET /api/search?q=...
app.get('/api/search', async (c) => {
  const connectionString = c.env.NEON_CONNECTION_STRING;
  if (!connectionString) {
    return c.json({ error: 'Database not configured' }, 500);
  }

  const q = c.req.query('q') || '';
  if (!q.trim()) {
    return c.json({ journalists: [], outlets: [] });
  }

  try {
    const sql = neon(connectionString);
    const pattern = '%' + q + '%';

    const journalists = await sql<JournalistRow[]>`
      SELECT * FROM journalists WHERE name ILIKE ${pattern} ORDER BY name ASC LIMIT 10
    `;
    const outlets = await sql<OutletRow[]>`
      SELECT * FROM media_outlets WHERE name ILIKE ${pattern} ORDER BY combined_score DESC NULLS LAST LIMIT 10
    `;

    return c.json({
      journalists: journalists.map(r => ({ ...r, id: Number(r.id) })),
      outlets:     outlets.map(r => ({ ...r, id: Number(r.id) })),
    });
  } catch (err) {
    console.error('Search error:', err);
    return c.json({ error: 'Search failed' }, 500);
  }
});

// ─── Export ───────────────────────────────────────────────────────────────────

export default {
  fetch: app.fetch,
};
