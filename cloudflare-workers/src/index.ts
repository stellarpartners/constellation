import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { neon } from '@neondatabase/serverless';

const app = new Hono<{ Bindings: { NEON_CONNECTION_STRING: string } }>();

app.use('*', logger());
app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'OPTIONS'], allowHeaders: ['Content-Type'] }));

type Env = { NEON_CONNECTION_STRING: string };

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getConn(c: any) {
  const conn = c.env.NEON_CONNECTION_STRING;
  if (!conn) return null;
  return neon(conn);
}

function pagination(c: any) {
  const page    = Math.max(1, Number(c.req.query('page') || 1));
  const perPage = Math.min(100, Number(c.req.query('per_page') || 25));
  const offset  = (page - 1) * perPage;
  return { page, perPage, offset };
}

function buildSearch(base: string, whereClause: string, orderClause: string, params: any) {
  const { page, perPage, offset } = pagination(params);
  const where = whereClause ? `WHERE ${whereClause}` : '';
  const dataQuery  = `${base} ${where} ${orderClause} LIMIT ${perPage} OFFSET ${offset}`;
  const countQuery = `SELECT COUNT(*) as count FROM (${base} ${where}) sub`;
  return { dataQuery, countQuery, page, perPage };
}

// ─── Stats ─────────────────────────────────────────────────────────────────────

app.get('/api/stats', async (c) => {
  const sql = getConn(c);
  if (!sql) return c.json({ error: 'No DB config' }, 500);
  try {
    const [j] = await sql`SELECT COUNT(*) as c FROM journalists`;
    const [o] = await sql`SELECT COUNT(*) as c FROM media_outlets`;
    const [r] = await sql`SELECT COUNT(*) as c FROM outlet_journalist_relations`;
    const [e] = await sql`SELECT COUNT(*) as c FROM media_outlets WHERE eci_articles IS NOT NULL`;
    const [p] = await sql`SELECT COUNT(*) as c FROM media_outlets WHERE progressive_score >= 2`;
    const [n] = await sql`SELECT COUNT(*) as c FROM ngos`;
    const [ok] = await sql`SELECT COUNT(*) as c FROM okoip_registry`;
    const [m] = await sql`SELECT COUNT(*) as c FROM ngo_okoip_matches`;
    return c.json({
      total_journalists: Number(j.c),
      total_outlets: Number(o.c),
      total_relationships: Number(r.c),
      outlets_with_eci: Number(e.c),
      progressive_outlets: Number(p.c),
      total_ngos: Number(n.c),
      total_okoip: Number(ok.c),
      total_ngo_matches: Number(m.c),
    });
  } catch (err) {
    console.error('Stats error:', err);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

// ─── Top Outlets ───────────────────────────────────────────────────────────────

app.get('/api/top-outlets/:limit', async (c) => {
  const sql = getConn(c);
  if (!sql) return c.json({ error: 'No DB config' }, 500);
  const limit = Math.min(Number(c.req.param('limit')) || 15, 100);
  try {
    const rows = await sql`
      SELECT mo.id, mo.name,
             COUNT(ojr.journalist_id) as journalist_count,
             mo.type_of_media, mo.geographical_level, mo.combined_score
      FROM media_outlets mo
      LEFT JOIN outlet_journalist_relations ojr ON mo.id = ojr.media_outlet_id
      GROUP BY mo.id, mo.name, mo.type_of_media, mo.geographical_level, mo.combined_score
      ORDER BY journalist_count DESC, mo.name ASC LIMIT ${limit}
    `;
    return c.json({ outlets: rows.map(r => ({ ...r, id: Number(r.id), journalist_count: Number(r.journalist_count), combined_score: r.combined_score != null ? Number(r.combined_score) : null })) });
  } catch (err) {
    return c.json({ error: 'Failed to fetch top outlets' }, 500);
  }
});

// ─── Journalists ───────────────────────────────────────────────────────────────

app.get('/api/journalists', async (c) => {
  const sql = getConn(c);
  if (!sql) return c.json({ error: 'No DB config' }, 500);
  const { page, perPage, offset } = pagination(c);
  const q = c.req.query('q') || '';
  try {
    if (q) {
      const rows = await sql`SELECT * FROM journalists WHERE name ILIKE ${'%' + q + '%'} ORDER BY name ASC LIMIT ${perPage} OFFSET ${offset}`;
      return c.json({ journalists: rows.map(r => ({ ...r, id: Number(r.id) })), page, per_page: perPage });
    }
    const rows = await sql`SELECT * FROM journalists ORDER BY name ASC LIMIT ${perPage} OFFSET ${offset}`;
    return c.json({ journalists: rows.map(r => ({ ...r, id: Number(r.id) })), page, per_page: perPage });
  } catch (err) {
    return c.json({ error: 'Failed to fetch journalists' }, 500);
  }
});

app.get('/api/journalists/:id', async (c) => {
  const sql = getConn(c);
  if (!sql) return c.json({ error: 'No DB config' }, 500);
  const id = c.req.param('id');
  try {
    const [journalist] = await sql`SELECT * FROM journalists WHERE id = ${id}`;
    if (!journalist) return c.json({ error: 'Journalist not found' }, 404);
    const outlets = await sql`
      SELECT mo.id, mo.name, ojr.role, mo.twitter
      FROM outlet_journalist_relations ojr
      JOIN media_outlets mo ON ojr.media_outlet_id = mo.id
      WHERE ojr.journalist_id = ${id}
    `;
    const [countRow] = await sql`SELECT COUNT(*) as count FROM outlet_journalist_relations WHERE journalist_id = ${id}`;
    return c.json({ ...journalist, id: Number(journalist.id), outlets: outlets.map(o => ({ id: Number(o.id), name: o.name, role: o.role, twitter: o.twitter })), total_outlets: Number(countRow.count) });
  } catch (err) {
    return c.json({ error: 'Failed to fetch journalist' }, 500);
  }
});

// ─── Outlets ───────────────────────────────────────────────────────────────────

app.get('/api/outlets', async (c) => {
  const sql = getConn(c);
  if (!sql) return c.json({ error: 'No DB config' }, 500);
  const { page, perPage, offset } = pagination(c);
  const q = c.req.query('q') || '';
  try {
    if (q) {
      const rows = await sql`SELECT * FROM media_outlets WHERE name ILIKE ${'%' + q + '%'} ORDER BY combined_score DESC NULLS LAST, name ASC LIMIT ${perPage} OFFSET ${offset}`;
      return c.json({ outlets: rows.map(r => ({ ...r, id: Number(r.id) })), page, per_page: perPage });
    }
    const rows = await sql`SELECT * FROM media_outlets ORDER BY combined_score DESC NULLS LAST, name ASC LIMIT ${perPage} OFFSET ${offset}`;
    return c.json({ outlets: rows.map(r => ({ ...r, id: Number(r.id) })), page, per_page: perPage });
  } catch (err) {
    return c.json({ error: 'Failed to fetch outlets' }, 500);
  }
});

app.get('/api/outlets/:id', async (c) => {
  const sql = getConn(c);
  if (!sql) return c.json({ error: 'No DB config' }, 500);
  const id = c.req.param('id');
  try {
    const [outlet] = await sql`SELECT * FROM media_outlets WHERE id = ${id}`;
    if (!outlet) return c.json({ error: 'Outlet not found' }, 404);
    const journalists = await sql`
      SELECT j.id, j.name, ojr.role, j.twitter, j.linkedin
      FROM outlet_journalist_relations ojr
      JOIN journalists j ON ojr.journalist_id = j.id
      WHERE ojr.media_outlet_id = ${id}
    `;
    const [countRow] = await sql`SELECT COUNT(*) as count FROM outlet_journalist_relations WHERE media_outlet_id = ${id}`;
    return c.json({ ...outlet, id: Number(outlet.id), journalists: journalists.map(j => ({ id: Number(j.id), name: j.name, role: j.role, twitter: j.twitter, linkedin: j.linkedin })), total_journalists: Number(countRow.count) });
  } catch (err) {
    return c.json({ error: 'Failed to fetch outlet' }, 500);
  }
});

// ─── Cross-Platform ────────────────────────────────────────────────────────────

app.get('/api/cross-platform-journalists', async (c) => {
  const sql = getConn(c);
  if (!sql) return c.json({ error: 'No DB config' }, 500);
  try {
    const rows = await sql`
      SELECT j.*, COUNT(ojr.media_outlet_id) as outlet_count
      FROM journalists j JOIN outlet_journalist_relations ojr ON j.id = ojr.journalist_id
      GROUP BY j.id HAVING COUNT(ojr.media_outlet_id) > 1
      ORDER BY outlet_count DESC, j.name ASC
    `;
    return c.json({ journalists: rows.map(r => ({ ...r, id: Number(r.id) })) });
  } catch (err) {
    return c.json({ error: 'Failed to fetch cross-platform journalists' }, 500);
  }
});

// ─── Search ────────────────────────────────────────────────────────────────────

app.get('/api/search', async (c) => {
  const sql = getConn(c);
  if (!sql) return c.json({ error: 'No DB config' }, 500);
  const q = (c.req.query('q') || '').trim();
  if (!q) return c.json({ journalists: [], outlets: [] });
  try {
    const pattern = '%' + q + '%';
    const journalists = await sql`SELECT * FROM journalists WHERE name ILIKE ${pattern} ORDER BY name ASC LIMIT 10`;
    const outlets = await sql`SELECT * FROM media_outlets WHERE name ILIKE ${pattern} ORDER BY combined_score DESC NULLS LAST LIMIT 10`;
    return c.json({ journalists: journalists.map(r => ({ ...r, id: Number(r.id) })), outlets: outlets.map(r => ({ ...r, id: Number(r.id) })) });
  } catch (err) {
    return c.json({ error: 'Search failed' }, 500);
  }
});

// ─── Sample URLs (platform table lookup) ──────────────────────────────────────

const ALLOWED_TABLES = ['ethelon', 'desmos', 'social_dynamo'];

app.get('/api/sample-urls', async (c) => {
  const sql = getConn(c);
  if (!sql) return c.json({ error: 'No DB config' }, 500);
  const table = c.req.query('table');
  const limit = Math.min(Number(c.req.query('limit') || 5), 20);
  if (!ALLOWED_TABLES.includes(table)) {
    return c.json({ error: 'Invalid table. Use: ethelon, desmos, social_dynamo' }, 400);
  }
  try {
    const query = `SELECT id, profile_url, source_name FROM ngo_${table} WHERE source_name IS NULL OR trim(source_name) = '' LIMIT ${limit}`;
    const rows = await sql(query);
    return c.json({ table, samples: rows });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// NGO Routes
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/ngos?q=&page=&per_page=
app.get('/api/ngos', async (c) => {
  const sql = getConn(c);
  if (!sql) return c.json({ error: 'No DB config' }, 500);
  const { page, perPage, offset } = pagination(c);
  const q = c.req.query('q') || '';
  try {
    if (q) {
      const rows = await sql`
        SELECT id, company_name, slug, category, email, phone, address, city, website, wordpress, hubspot_id
        FROM ngos WHERE company_name ILIKE ${'%' + q + '%'}
        ORDER BY company_name ASC LIMIT ${perPage} OFFSET ${offset}
      `;
      const [countRow] = await sql`SELECT COUNT(*) as c FROM ngos WHERE company_name ILIKE ${'%' + q + '%'}`;
      return c.json({ ngos: rows, page, per_page: perPage, total: Number(countRow.c) });
    }
    const rows = await sql`
      SELECT id, company_name, slug, category, email, phone, address, city, website, wordpress, hubspot_id
      FROM ngos ORDER BY company_name ASC LIMIT ${perPage} OFFSET ${offset}
    `;
    const [countRow] = await sql`SELECT COUNT(*) as c FROM ngos`;
    return c.json({ ngos: rows, page, per_page: perPage, total: Number(countRow.c) });
  } catch (err) {
    console.error('NGOs list error:', err);
    return c.json({ error: 'Failed to fetch NGOs' }, 500);
  }
});

// GET /api/ngos/:id — NGO detail with OKOIP links
app.get('/api/ngos/:id', async (c) => {
  const sql = getConn(c);
  if (!sql) return c.json({ error: 'No DB config' }, 500);
  const id = c.req.param('id');
  try {
    const [ngo] = await sql`
      SELECT id, company_name, slug, category, email, phone, address, city, website,
             wordpress, wordpress_url, hubspot_id, last_modified_raw, created_at, updated_at
      FROM ngos WHERE id = ${id}
    `;
    if (!ngo) return c.json({ error: 'NGO not found' }, 404);

    // Social profiles
    const social = await sql`
      SELECT platform, profile_url, handle, notes FROM ngo_social_profiles WHERE ngo_id = ${id}
    `;

    // OKOIP matches
    const okoipMatches = await sql`
      SELECT m.match_method, m.match_score, m.match_detail,
             r.okoip_id, r.title, r.tin, r.email as okoip_email, r.phone as okoip_phone,
             r.region, r.prefecture, r.municipality, r.street, r.postcode,
             r.category as okoip_category, r.organization_type, r.form_status,
             r.purpose, r.grant_value
      FROM ngo_okoip_matches m
      JOIN okoip_registry r ON r.id = m.okoip_id
      WHERE m.ngo_id = ${id}
      ORDER BY m.match_score DESC
    `;

    // Platform links
    const platforms: Record<string, any> = {};
    for (const table of ALLOWED_TABLES) {
      try {
        const rows = await sql(`SELECT profile_url, source_name FROM ngo_${table} WHERE ngo_id = ${id}`);
        if (rows.length > 0) platforms[table] = rows;
      } catch {}
    }
    // Extra platforms
    for (const table of ['youbehero', 'acf', 'ngheroes']) {
      try {
        const rows = await sql(`SELECT profile_url, source_name FROM ngo_${table} WHERE ngo_id = ${id}`);
        if (rows.length > 0) platforms[table] = rows;
      } catch {}
    }

    return c.json({ ...ngo, social, okoip_matches: okoipMatches, platforms });
  } catch (err) {
    console.error('NGO detail error:', err);
    return c.json({ error: 'Failed to fetch NGO' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// OKOIP Registry Routes
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/okoip?q=&category=&region=&page=&per_page=
app.get('/api/okoip', async (c) => {
  const sql = getConn(c);
  if (!sql) return c.json({ error: 'No DB config' }, 500);
  const { page, perPage, offset } = pagination(c);
  const q = c.req.query('q') || '';
  const cat = c.req.query('category') || '';
  const region = c.req.query('region') || '';

  try {
    let conditions: string[] = [];

    if (q) {
      const escaped = q.replace(/'/g, "''");
      conditions.push(`title ILIKE '%${escaped}%'`);
    }
    if (cat) {
      const escaped = cat.replace(/'/g, "''");
      conditions.push(`category = '${escaped}'`);
    }
    if (region) {
      const escaped = region.replace(/'/g, "''");
      conditions.push(`region ILIKE '%${escaped}%'`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const baseSql = `SELECT id, okoip_id, title, tin, category, organization_type, form_status,
      email, phone, region, prefecture, municipality, street, postcode, purpose, scraped_at
      FROM okoip_registry ${where} ORDER BY title ASC LIMIT ${perPage} OFFSET ${offset}`;
    const countSql = `SELECT COUNT(*) as c FROM okoip_registry ${where}`;

    const rows = await sql(baseSql);
    const [countRow] = await sql(countSql);

    return c.json({ okoip: rows, page, per_page: perPage, total: Number(countRow.c) });
  } catch (err) {
    console.error('OKOIP list error:', err);
    return c.json({ error: 'Failed to fetch OKOIP records' }, 500);
  }
});

// GET /api/okoip/categories — distinct categories available
app.get('/api/okoip/categories', async (c) => {
  const sql = getConn(c);
  if (!sql) return c.json({ error: 'No DB config' }, 500);
  try {
    const rows = await sql`SELECT category, COUNT(*) as count FROM okoip_registry WHERE category IS NOT NULL AND category != '' GROUP BY category ORDER BY count DESC`;
    return c.json({ categories: rows });
  } catch (err) {
    return c.json({ error: 'Failed to fetch categories' }, 500);
  }
});

// GET /api/okoip/regions — distinct regions available
app.get('/api/okoip/regions', async (c) => {
  const sql = getConn(c);
  if (!sql) return c.json({ error: 'No DB config' }, 500);
  try {
    const rows = await sql`SELECT REGEXP_REPLACE(region, '\\(.*\\)', '') as region_name, COUNT(*) as count FROM okoip_registry WHERE region IS NOT NULL AND region != '' GROUP BY region_name ORDER BY count DESC`;
    return c.json({ regions: rows });
  } catch (err) {
    return c.json({ error: 'Failed to fetch regions' }, 500);
  }
});

// GET /api/okoip/:id — detail with NGO links
app.get('/api/okoip/:id', async (c) => {
  const sql = getConn(c);
  if (!sql) return c.json({ error: 'No DB config' }, 500);
  const id = c.req.param('id');
  try {
    const [record] = await sql`SELECT * FROM okoip_registry WHERE id = ${id}`;
    if (!record) {
      // Try by okoip_id
      const [record2] = await sql`SELECT * FROM okoip_registry WHERE okoip_id = ${id}`;
      if (!record2) return c.json({ error: 'OKOIP record not found' }, 404);
      const ngoLinks = await sql`
        SELECT n.id as ngo_id, n.company_name, n.email, n.website, n.category as ngo_category,
               m.match_method, m.match_score, m.match_detail
        FROM ngo_okoip_matches m
        JOIN ngos n ON n.id = m.ngo_id
        WHERE m.okoip_id = ${record2.id}
        ORDER BY m.match_score DESC
      `;
      return c.json({ ...record2, linked_ngos: ngoLinks });
    }
    const ngoLinks = await sql`
      SELECT n.id as ngo_id, n.company_name, n.email, n.website, n.category as ngo_category,
             m.match_method, m.match_score, m.match_detail
      FROM ngo_okoip_matches m
      JOIN ngos n ON n.id = m.ngo_id
      WHERE m.okoip_id = ${id}
      ORDER BY m.match_score DESC
    `;
    return c.json({ ...record, linked_ngos: ngoLinks });
  } catch (err) {
    console.error('OKOIP detail error:', err);
    return c.json({ error: 'Failed to fetch OKOIP record' }, 500);
  }
});

// ─── 404 ───────────────────────────────────────────────────────────────────────

app.all('*', c => c.json({ error: 'not found' }, 404));

export default { fetch: app.fetch };
