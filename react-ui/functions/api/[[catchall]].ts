// Constellation API — runs as a Pages Function on constellation.stellarpartners.gr
// Queries Neon directly, bypassing Cloudflare Access on the workers.dev URL.

import { neon } from '@neondatabase/serverless';

interface Env {
  NEON_CONNECTION_STRING: string;
}

function pagination(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const perPage = Math.min(100, Number(url.searchParams.get('per_page') || 25));
  const offset = (page - 1) * perPage;
  return { page, perPage, offset };
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  const conn = env.NEON_CONNECTION_STRING;
  if (!conn) return json({ error: 'No DB config' }, 500);
  const sql = neon(conn);

  // Helper: use tagged template queries everywhere, build dynamic WHERE with sql.query()
  const query = (q: string) => (sql as any).query(q);

  try {
    // ── Stats ──────────────────────────────────────────────────────────
    if (path === '/api/stats') {
      const [j] = await sql`SELECT COUNT(*) as c FROM journalists`;
      const [o] = await sql`SELECT COUNT(*) as c FROM media_outlets`;
      const [r] = await sql`SELECT COUNT(*) as c FROM outlet_journalist_relations`;
      const [e] = await sql`SELECT COUNT(*) as c FROM media_outlets WHERE eci_articles IS NOT NULL`;
      const [p] = await sql`SELECT COUNT(*) as c FROM media_outlets WHERE progressive_score >= 2`;
      const [n] = await sql`SELECT COUNT(*) as c FROM ngos`;
      const [ok] = await sql`SELECT COUNT(*) as c FROM okoip_registry`;
      const [m] = await sql`SELECT COUNT(*) as c FROM ngo_okoip_matches`;
      return json({
        total_journalists: Number(j.c), total_outlets: Number(o.c),
        total_relationships: Number(r.c), outlets_with_eci: Number(e.c),
        progressive_outlets: Number(p.c), total_ngos: Number(n.c),
        total_okoip: Number(ok.c), total_ngo_matches: Number(m.c),
      });
    }

    // ── NGOs list ──────────────────────────────────────────────────────
    if (path === '/api/ngos') {
      const { page, perPage, offset } = pagination(url);
      const q = url.searchParams.get('q') || '';
      if (q) {
        const rows = await sql`SELECT id, company_name, slug, category, email, phone, address, city, website, wordpress, hubspot_id FROM ngos WHERE company_name ILIKE ${'%' + q + '%'} ORDER BY company_name ASC LIMIT ${perPage} OFFSET ${offset}`;
        const [cr] = await sql`SELECT COUNT(*) as c FROM ngos WHERE company_name ILIKE ${'%' + q + '%'}`;
        return json({ ngos: rows, page, per_page: perPage, total: Number(cr.c) });
      }
      const rows = await sql`SELECT id, company_name, slug, category, email, phone, address, city, website, wordpress, hubspot_id FROM ngos ORDER BY company_name ASC LIMIT ${perPage} OFFSET ${offset}`;
      const [cr] = await sql`SELECT COUNT(*) as c FROM ngos`;
      return json({ ngos: rows, page, per_page: perPage, total: Number(cr.c) });
    }

    // ── NGO detail ─────────────────────────────────────────────────────
    const ngoMatch = path.match(/^\/api\/ngos\/(\d+)$/);
    if (ngoMatch) {
      const id = ngoMatch[1];
      const [ngo] = await sql`SELECT * FROM ngos WHERE id = ${id}`;
      if (!ngo) return json({ error: 'NGO not found' }, 404);
      const social = await sql`SELECT platform, profile_url, handle, notes FROM ngo_social_profiles WHERE ngo_id = ${id}`;
      const okoipMatches = await sql`
        SELECT m.match_method, m.match_score, m.match_detail,
               r.okoip_id, r.title, r.tin, r.email as okoip_email, r.phone as okoip_phone,
               r.region, r.prefecture, r.municipality, r.street, r.postcode,
               r.category as okoip_category, r.organization_type, r.form_status, r.purpose, r.grant_value
        FROM ngo_okoip_matches m JOIN okoip_registry r ON r.id = m.okoip_id
        WHERE m.ngo_id = ${id} ORDER BY m.match_score DESC`;
      return json({ ...ngo, social, okoip_matches: okoipMatches });
    }

    // ── OKOIP list ─────────────────────────────────────────────────────
    if (path === '/api/okoip') {
      const { page, perPage, offset } = pagination(url);
      const q = url.searchParams.get('q') || '';
      const cat = url.searchParams.get('category') || '';
      const region = url.searchParams.get('region') || '';
      const conditions: string[] = [];
      if (q) conditions.push(`title ILIKE '%${q.replace(/'/g, "''")}%'`);
      if (cat) conditions.push(`category = '${cat.replace(/'/g, "''")}'`);
      if (region) conditions.push(`region ILIKE '%${region.replace(/'/g, "''")}%'`);
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const dataSql = `SELECT id, okoip_id, title, tin, category, organization_type, form_status, email, phone, region, prefecture, municipality, street, postcode, purpose, incorporation_date_epoch, sectors, sector_count, scraped_at FROM okoip_registry ${where} ORDER BY title ASC LIMIT ${perPage} OFFSET ${offset}`;
      const countSql = `SELECT COUNT(*) as c FROM okoip_registry ${where}`;

      // Use sql.query() for dynamic SQL
      const [rows, countResult] = await Promise.all([
        query(dataSql),
        query(countSql),
      ]);
      const cr = countResult.rows?.[0] || countResult[0] || { c: '0' };
      return json({ okoip: rows, page, per_page: perPage, total: Number(cr.c) });
    }

    // ── OKOIP categories ───────────────────────────────────────────────
    if (path === '/api/okoip/categories') {
      const rows = await sql`SELECT category, COUNT(*) as count FROM okoip_registry WHERE category IS NOT NULL AND category != '' GROUP BY category ORDER BY count DESC`;
      return json({ categories: rows });
    }

    // ── OKOIP detail ───────────────────────────────────────────────────
    const okoipMatch = path.match(/^\/api\/okoip\/(\d+)$/);
    if (okoipMatch) {
      const id = okoipMatch[1];
      const [record] = await sql`SELECT * FROM okoip_registry WHERE id = ${id}`;
      if (!record) {
        const [r2] = await sql`SELECT * FROM okoip_registry WHERE okoip_id = ${id}`;
        if (!r2) return json({ error: 'OKOIP record not found' }, 404);
        const ngoLinks = await sql`SELECT n.id as ngo_id, n.company_name, n.email, n.website, n.category as ngo_category, m.match_method, m.match_score, m.match_detail FROM ngo_okoip_matches m JOIN ngos n ON n.id = m.ngo_id WHERE m.okoip_id = ${r2.id} ORDER BY m.match_score DESC`;
        return json({ ...r2, linked_ngos: ngoLinks });
      }
      const ngoLinks = await sql`SELECT n.id as ngo_id, n.company_name, n.email, n.website, n.category as ngo_category, m.match_method, m.match_score, m.match_detail FROM ngo_okoip_matches m JOIN ngos n ON n.id = m.ngo_id WHERE m.okoip_id = ${id} ORDER BY m.match_score DESC`;
      return json({ ...record, linked_ngos: ngoLinks });
    }

    // ── Search ─────────────────────────────────────────────────────────
    if (path === '/api/search') {
      const q = (url.searchParams.get('q') || '').trim();
      if (!q) return json({ journalists: [], outlets: [] });
      const pattern = '%' + q + '%';
      const journalists = await sql`SELECT * FROM journalists WHERE name ILIKE ${pattern} ORDER BY name ASC LIMIT 10`;
      const outlets = await sql`SELECT * FROM media_outlets WHERE name ILIKE ${pattern} ORDER BY combined_score DESC NULLS LAST LIMIT 10`;
      return json({ journalists: journalists.map((r: any) => ({ ...r, id: Number(r.id) })), outlets: outlets.map((r: any) => ({ ...r, id: Number(r.id) })) });
    }

    // ── Journalists list ───────────────────────────────────────────────
    if (path === '/api/journalists') {
      const { page, perPage, offset } = pagination(url);
      const q = url.searchParams.get('q') || '';
      if (q) {
        const rows = await sql`SELECT * FROM journalists WHERE name ILIKE ${'%' + q + '%'} ORDER BY name ASC LIMIT ${perPage} OFFSET ${offset}`;
        return json({ journalists: rows.map((r: any) => ({ ...r, id: Number(r.id) })), page, per_page: perPage });
      }
      const rows = await sql`SELECT * FROM journalists ORDER BY name ASC LIMIT ${perPage} OFFSET ${offset}`;
      return json({ journalists: rows.map((r: any) => ({ ...r, id: Number(r.id) })), page, per_page: perPage });
    }

    // ── Journalist detail ──────────────────────────────────────────────
    const journoMatch = path.match(/^\/api\/journalists\/(\d+)$/);
    if (journoMatch) {
      const id = journoMatch[1];
      const [journalist] = await sql`SELECT * FROM journalists WHERE id = ${id}`;
      if (!journalist) return json({ error: 'Journalist not found' }, 404);
      const outlets = await sql`
        SELECT mo.id, mo.name, ojr.role, mo.twitter
        FROM outlet_journalist_relations ojr JOIN media_outlets mo ON ojr.media_outlet_id = mo.id
        WHERE ojr.journalist_id = ${id}
      `;
      const [countRow] = await sql`SELECT COUNT(*) as count FROM outlet_journalist_relations WHERE journalist_id = ${id}`;
      return json({ ...journalist, id: Number(journalist.id), outlets: outlets.map((o: any) => ({ id: Number(o.id), name: o.name, role: o.role, twitter: o.twitter })), total_outlets: Number(countRow.count) });
    }

    // ── Outlets list ───────────────────────────────────────────────────
    if (path === '/api/outlets') {
      const { page, perPage, offset } = pagination(url);
      const q = url.searchParams.get('q') || '';
      if (q) {
        const rows = await sql`SELECT * FROM media_outlets WHERE name ILIKE ${'%' + q + '%'} ORDER BY combined_score DESC NULLS LAST, name ASC LIMIT ${perPage} OFFSET ${offset}`;
        return json({ outlets: rows.map((r: any) => ({ ...r, id: Number(r.id) })), page, per_page: perPage });
      }
      const rows = await sql`SELECT * FROM media_outlets ORDER BY combined_score DESC NULLS LAST, name ASC LIMIT ${perPage} OFFSET ${offset}`;
      return json({ outlets: rows.map((r: any) => ({ ...r, id: Number(r.id) })), page, per_page: perPage });
    }

    // ── Outlet detail ──────────────────────────────────────────────────
    const outletMatch = path.match(/^\/api\/outlets\/(\d+)$/);
    if (outletMatch) {
      const id = outletMatch[1];
      const [outlet] = await sql`SELECT * FROM media_outlets WHERE id = ${id}`;
      if (!outlet) return json({ error: 'Outlet not found' }, 404);
      const journalists = await sql`
        SELECT j.id, j.name, ojr.role, j.twitter, j.linkedin
        FROM outlet_journalist_relations ojr JOIN journalists j ON ojr.journalist_id = j.id
        WHERE ojr.media_outlet_id = ${id}
      `;
      const [countRow] = await sql`SELECT COUNT(*) as count FROM outlet_journalist_relations WHERE media_outlet_id = ${id}`;
      return json({ ...outlet, id: Number(outlet.id), journalists: journalists.map((j: any) => ({ id: Number(j.id), name: j.name, role: j.role, twitter: j.twitter, linkedin: j.linkedin })), total_journalists: Number(countRow.count) });
    }

    // ── Top Outlets ────────────────────────────────────────────────────
    if (path === '/api/top-outlets') {
      const limit = Math.min(Number(url.searchParams.get('limit') || 15), 100);
      const rows = await sql`
        SELECT mo.id, mo.name, COUNT(ojr.journalist_id) as journalist_count,
               mo.type_of_media, mo.geographical_level, mo.combined_score
        FROM media_outlets mo LEFT JOIN outlet_journalist_relations ojr ON mo.id = ojr.media_outlet_id
        GROUP BY mo.id, mo.name, mo.type_of_media, mo.geographical_level, mo.combined_score
        ORDER BY journalist_count DESC, mo.name ASC LIMIT ${limit}
      `;
      return json({ outlets: rows.map((r: any) => ({ ...r, id: Number(r.id), journalist_count: Number(r.journalist_count), combined_score: r.combined_score != null ? Number(r.combined_score) : null })) });
    }
    const topMatch = path.match(/^\/api\/top-outlets\/(\d+)$/);
    if (topMatch) {
      const limit = Math.min(Number(topMatch[1]) || 15, 100);
      const rows = await sql`
        SELECT mo.id, mo.name, COUNT(ojr.journalist_id) as journalist_count,
               mo.type_of_media, mo.geographical_level, mo.combined_score
        FROM media_outlets mo LEFT JOIN outlet_journalist_relations ojr ON mo.id = ojr.media_outlet_id
        GROUP BY mo.id, mo.name, mo.type_of_media, mo.geographical_level, mo.combined_score
        ORDER BY journalist_count DESC, mo.name ASC LIMIT ${limit}
      `;
      return json({ outlets: rows.map((r: any) => ({ ...r, id: Number(r.id), journalist_count: Number(r.journalist_count), combined_score: r.combined_score != null ? Number(r.combined_score) : null })) });
    }

    // ── Cross-platform journalists ─────────────────────────────────────
    if (path === '/api/cross-platform-journalists') {
      const rows = await sql`
        SELECT j.*, COUNT(ojr.media_outlet_id) as outlet_count
        FROM journalists j JOIN outlet_journalist_relations ojr ON j.id = ojr.journalist_id
        GROUP BY j.id HAVING COUNT(ojr.media_outlet_id) > 1
        ORDER BY outlet_count DESC, j.name ASC
      `;
      return json({ journalists: rows.map((r: any) => ({ ...r, id: Number(r.id) })) });
    }

    // ── Data Health ──────────────────────────────────────────────────────
    if (path === '/api/data-health') {
      // NGO field completeness (NULLIF handles empty strings from import)
      const ngoEmail = await sql`SELECT COUNT(*) as total, COUNT(NULLIF(email, '')) as filled FROM ngos`;
      const ngoPhone = await sql`SELECT COUNT(*) as total, COUNT(NULLIF(phone, '')) as filled FROM ngos`;
      const ngoAddress = await sql`SELECT COUNT(*) as total, COUNT(NULLIF(address, '')) as filled FROM ngos`;
      const ngoWebsite = await sql`SELECT COUNT(*) as total, COUNT(NULLIF(website, '')) as filled FROM ngos`;
      const ngoCity = await sql`SELECT COUNT(*) as total, COUNT(NULLIF(city, '')) as filled FROM ngos`;

      // Match stats
      const [matchStats] = await sql`
        SELECT COUNT(*) as total_matches,
               COUNT(CASE WHEN match_score >= 0.7 THEN 1 END) as high_confidence,
               COUNT(CASE WHEN match_score >= 0.4 AND match_score < 0.7 THEN 1 END) as medium_confidence,
               COUNT(CASE WHEN match_score < 0.4 THEN 1 END) as low_confidence
        FROM ngo_okoip_matches`;

      // Enrichment opportunities: for matched NGOs, what OKOIP fields could fill NGO gaps
      const [opps] = await sql`
        SELECT
          COUNT(*) FILTER (WHERE (n.email IS NULL OR n.email = '') AND r.email IS NOT NULL AND r.email != '') as email_gaps,
          COUNT(*) FILTER (WHERE (n.phone IS NULL OR n.phone = '') AND r.phone IS NOT NULL AND r.phone != '') as phone_gaps,
          COUNT(*) FILTER (WHERE (n.address IS NULL OR n.address = '') AND (r.street IS NOT NULL OR r.street_number IS NOT NULL)) as address_gaps,
          COUNT(*) FILTER (WHERE (n.city IS NULL OR n.city = '') AND (r.municipality IS NOT NULL OR r.prefecture IS NOT NULL)) as city_gaps
        FROM ngo_okoip_matches m
        JOIN ngos n ON n.id = m.ngo_id
        JOIN okoip_registry r ON r.id = m.okoip_id
        WHERE m.match_score >= 0.7`;

      return json({
        ngos: {
          total: Number(ngoEmail[0].total),
          with_email: Number(ngoEmail[0].filled),
          with_phone: Number(ngoPhone[0].filled),
          with_address: Number(ngoAddress[0].filled),
          with_website: Number(ngoWebsite[0].filled),
          with_city: Number(ngoCity[0].filled),
        },
        matches: {
          total: Number(matchStats.total_matches),
          high_confidence: Number(matchStats.high_confidence),
          medium_confidence: Number(matchStats.medium_confidence),
          low_confidence: Number(matchStats.low_confidence),
        },
        enrich_opportunities: {
          email: Number(opps.email_gaps),
          phone: Number(opps.phone_gaps),
          address: Number(opps.address_gaps),
          city: Number(opps.city_gaps),
          total: Number(opps.email_gaps) + Number(opps.phone_gaps) + Number(opps.address_gaps) + Number(opps.city_gaps),
        },
        unmatched_ngos: 801 - Number(matchStats.total_matches),
      });
    }

    // ── Enrich: apply OKOIP data to matched NGOs ────────────────────────
    if (path === '/api/enrich/apply' && request.method === 'POST') {
      const enrichments: string[] = [];

      // Email — fill from OKOIP where NGO email is missing
      const [emailRes] = await sql`
        UPDATE ngos n SET email = r.email
        FROM ngo_okoip_matches m JOIN okoip_registry r ON r.id = m.okoip_id
        WHERE m.ngo_id = n.id AND m.match_score >= 0.7
          AND (n.email IS NULL OR n.email = '')
          AND r.email IS NOT NULL AND r.email != ''
        RETURNING n.id`;
      if (emailRes) enrichments.push('email');

      // Phone
      const [phoneRes] = await sql`
        UPDATE ngos n SET phone = r.phone
        FROM ngo_okoip_matches m JOIN okoip_registry r ON r.id = m.okoip_id
        WHERE m.ngo_id = n.id AND m.match_score >= 0.7
          AND (n.phone IS NULL OR n.phone = '')
          AND r.phone IS NOT NULL AND r.phone != ''
        RETURNING n.id`;
      if (phoneRes) enrichments.push('phone');

      // Address — combine street + number + postcode from OKOIP
      const [addrRes] = await sql`
        UPDATE ngos n SET address = TRIM(CONCAT(
          COALESCE(r.street, ''), ' ',
          COALESCE(r.street_number, ''), ', ',
          COALESCE(r.postcode, '')
        ))
        FROM ngo_okoip_matches m JOIN okoip_registry r ON r.id = m.okoip_id
        WHERE m.ngo_id = n.id AND m.match_score >= 0.7
          AND (n.address IS NULL OR n.address = '')
          AND (r.street IS NOT NULL OR r.street_number IS NOT NULL)
        RETURNING n.id`;
      if (addrRes) enrichments.push('address');

      // City — use municipality or prefecture from OKOIP
      const [cityRes] = await sql`
        UPDATE ngos n SET city = COALESCE(r.municipality, r.prefecture)
        FROM ngo_okoip_matches m JOIN okoip_registry r ON r.id = m.okoip_id
        WHERE m.ngo_id = n.id AND m.match_score >= 0.7
          AND (n.city IS NULL OR n.city = '')
          AND (r.municipality IS NOT NULL OR r.prefecture IS NOT NULL)
        RETURNING n.id`;
      if (cityRes) enrichments.push('city');

      // Counts after enrichment
      const [emailC] = await sql`SELECT COUNT(*) as c FROM ngos WHERE email IS NOT NULL AND email != ''`;
      const [phoneC] = await sql`SELECT COUNT(*) as c FROM ngos WHERE phone IS NOT NULL AND phone != ''`;
      const [addrC] = await sql`SELECT COUNT(*) as c FROM ngos WHERE address IS NOT NULL AND address != ''`;
      const [cityC] = await sql`SELECT COUNT(*) as c FROM ngos WHERE city IS NOT NULL AND city != ''`;

      return json({
        enriched_fields: enrichments,
        after: {
          with_email: Number(emailC.c),
          with_phone: Number(phoneC.c),
          with_address: Number(addrC.c),
          with_city: Number(cityC.c),
        },
      });
    }

    return json({ error: 'not found' }, 404);

  } catch (err: any) {
    console.error('API error:', err);
    return json({ error: 'Failed to process request', detail: String(err) }, 500);
  }
}
