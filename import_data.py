#!/usr/bin/env python3
```

```python
#!/usr/bin/env python3
"""
Constellation Database Import Script v2.1
Loads CSV exports from Baserow/GOPA ECI + NGO master.csv into PostgreSQL
Actually inserts data into the database (not just simulation)
"""

import csv
import json
import os
import sys
from pathlib import Path
from datetime import datetime

# PostgreSQL connection
try:
    import psycopg2
    from psycopg2.extras import execute_batch
except ImportError:
    print("❌ psycopg2 not installed. Installing...")
    os.system("pip install psycopg2-binary")
    import psycopg2
    from psycopg2.extras import execute_batch

# Configuration - UPDATED paths for local directories
BASE_DIR = Path(__file__).parent
CSV_DIR = BASE_DIR / "gopa-eci" / "database"
NGO_CSV_DIR = BASE_DIR / "ngo-masterdb"

DB_HOST = "localhost"
DB_PORT = 5432
DB_NAME = "constellation_db"
DB_USER = "constellation_user"
DB_PASSWORD = "constellation_pass"


def get_db_connection():
    """Create a connection to the PostgreSQL database"""
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )


def import_media_outlets(conn):
    """Import media outlets CSV into database"""
    csv_file = CSV_DIR / "export - Media - Grid view.csv"

    if not csv_file.exists():
        print(f"❌ Media CSV not found: {csv_file}")
        return 0

    print(f"📥 Importing media outlets from {csv_file}...")

    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        records = []
        for row in reader:
            outlet_id = row.get('id', '').strip() if row.get('id') else None
            if not outlet_id:
                continue

            name = row.get('name', '').strip() or f"Outlet {outlet_id}"

            # Parse topics array
            topics_str = row.get('topics', '')
            topics = [t.strip() for t in topics_str.split(',') if t.strip()] if topics_str else []
            topics_str = '{' + ','.join(f'"{t}"' for t in topics) + '}'

            # Parse visits data
            def parse_visits(val):
                if not val or val.strip() == '':
                    return None
                try:
                    return float(str(val).replace('.', '').replace(',', '.'))
                except:
                    return None

            progressive_score = row.get('progressive_score', '').strip()
            eu_coverage_score = row.get('eu_coverage_score', '').strip()
            combined_score = row.get('combined_score', '').strip()

            record = (
                outlet_id,
                name,
                row.get('website', '').strip() or None,
                parse_visits(row.get('similarweb_visits_m_dec2022', '')),
                parse_visits(row.get('similarweb_visits_m_jan2023', '')),
                parse_visits(row.get('similarweb_visits_m_feb2023', '')),
                row.get('geographical_level', '').strip() or None,
                topics_str,
                row.get('name_in_greek', '').strip() or None,
                row.get('type_of_media', '').strip() or None,
                row.get('description_greek', '').strip() or None,
                row.get('media_companies', '').strip() or None,
                row.get('facebook', '').strip() or None,
                row.get('twitter_handle', '').strip() or None,
                row.get('instagram_handle', '').strip() or None,
                row.get('linkedin_url', '').strip() or None,
                row.get('youtube_channel', '').strip() or None,
                row.get('people', '').strip() or None,
                int(progressive_score) if progressive_score else None,
                int(eu_coverage_score) if eu_coverage_score else None,
                int(combined_score) if combined_score else None,
                row.get('notes', '').strip() or None,
            )
            records.append(record)

        if records:
            with conn.cursor() as cur:
                # Clear existing data
                cur.execute("TRUNCATE TABLE media_outlets RESTART IDENTITY CASCADE")

                # Insert new data
                query = """
                    INSERT INTO media_outlets (
                        id, name, website,
                        similarweb_visits_m_dec2022, similarweb_visits_m_jan2023, similarweb_visits_m_feb2023,
                        geographical_level, topics, name_in_greek, type_of_media, description_greek,
                        media_companies, facebook, twitter_handle, instagram_handle, linkedin_url,
                        youtube_channel, people, progressive_score, eu_coverage_score, combined_score, notes
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        website = EXCLUDED.website,
                        similarweb_visits_m_dec2022 = EXCLUDED.similarweb_visits_m_dec2022,
                        similarweb_visits_m_jan2023 = EXCLUDED.similarweb_visits_m_jan2023,
                        similarweb_visits_m_feb2023 = EXCLUDED.similarweb_visits_m_feb2023,
                        geographical_level = EXCLUDED.geographical_level,
                        topics = EXCLUDED.topics,
                        name_in_greek = EXCLUDED.name_in_greek,
                        type_of_media = EXCLUDED.type_of_media,
                        description_greek = EXCLUDED.description_greek,
                        media_companies = EXCLUDED.media_companies,
                        facebook = EXCLUDED.facebook,
                        twitter_handle = EXCLUDED.twitter_handle,
                        instagram_handle = EXCLUDED.instagram_handle,
                        linkedin_url = EXCLUDED.linkedin_url,
                        youtube_channel = EXCLUDED.youtube_channel,
                        people = EXCLUDED.people,
                        progressive_score = EXCLUDED.progressive_score,
                        eu_coverage_score = EXCLUDED.eu_coverage_score,
                        combined_score = EXCLUDED.combined_score,
                        notes = EXCLUDED.notes,
                        updated_at = CURRENT_TIMESTAMP
                """
                execute_batch(cur, query, records)
                conn.commit()

            print(f"  ✅ Inserted {len(records)} media outlets")
            return len(records)

    return 0


def import_journalists(conn):
    """Import journalists CSV into database"""
    csv_file = CSV_DIR / "export - Journalists - Grid view.csv"

    if not csv_file.exists():
        print(f"❌ Journalists CSV not found: {csv_file}")
        return 0

    print(f"\n📥 Importing journalists from {csv_file}...")

    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        records = []
        for row in reader:
            journalist_id = row.get('id', '').strip() if row.get('id') else None
            if not journalist_id:
                continue

            name = row.get('name', '').strip() or '*' + row.get('media', '') + '*'

            # Parse article links JSON
            articles_str = row.get('articles', '')
            article_links = []
            if articles_str and articles_str.strip() not in ('', ','):
                try:
                    article_links = json.loads(articles_str)
                except:
                    article_links = []

            articles_count = len(article_links) if isinstance(article_links, list) else 0
            articles_json = json.dumps(article_links) if article_links else '[]'

            record = (
                journalist_id,
                name,
                row.get('media', '').strip() or None,
                articles_json,
                row.get('primary_beat', '').strip() or None,
                articles_count,
                row.get('twitter_handle', '').strip() or None,
                row.get('linkedin_url', '').strip() or None,
                row.get('status', '').strip() or None,
                row.get('channel', '').strip() or None,
                row.get('notes', '').strip() or None,
                row.get('email', '').strip() or None,
                row.get('link_on_media', '').strip() or None,
            )
            records.append(record)

        if records:
            with conn.cursor() as cur:
                # Clear existing data
                cur.execute("TRUNCATE TABLE journalists RESTART IDENTITY CASCADE")

                # Insert new data
                query = """
                    INSERT INTO journalists (
                        id, name, media_outlet_name, article_links, primary_beat, articles_count,
                        twitter_handle, linkedin_url, status, channel, notes, email, link_on_media
                    ) VALUES (
                        %s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        media_outlet_name = EXCLUDED.media_outlet_name,
                        article_links = EXCLUDED.article_links,
                        primary_beat = EXCLUDED.primary_beat,
                        articles_count = EXCLUDED.articles_count,
                        twitter_handle = EXCLUDED.twitter_handle,
                        linkedin_url = EXCLUDED.linkedin_url,
                        status = EXCLUDED.status,
                        channel = EXCLUDED.channel,
                        notes = EXCLUDED.notes,
                        email = EXCLUDED.email,
                        link_on_media = EXCLUDED.link_on_media,
                        updated_at = CURRENT_TIMESTAMP
                """
                execute_batch(cur, query, records)
                conn.commit()

            print(f"  ✅ Inserted {len(records)} journalists")
            return len(records)

    return 0


def import_organizations(conn):
    """Import NGO organizations CSV into database"""
    csv_file = NGO_CSV_DIR / "export - MASTER.csv"

    if not csv_file.exists():
        print(f"❌ Organizations CSV not found: {csv_file}")
        return 0

    print(f"\n📥 Importing organizations from {csv_file}...")

    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        records = []
        for row in reader:
            org_id = row.get('id', '').strip() if row.get('id') else None
            if not org_id:
                continue

            company_name = row.get('company_name', '').strip() or f"Organization {org_id}"

            # Parse date from "9/6/2024 6:10pm" format
            last_modified = None
            last_modified_str = row.get('last_modified', '').strip()
            if last_modified_str:
                try:
                    dt = datetime.strptime(last_modified_str.split(',')[0].strip(), '%m/%d/%Y %I:%M%p')
                    last_modified = dt.date()
                except:
                    pass

            # Parse boolean fields
            def parse_bool(val):
                if not val:
                    return False
                return str(val).strip().lower() in ('true', '1', 'yes', 'y')

            record = (
                org_id,
                company_name,
                row.get('website', '').strip() or None,
                row.get('email', '').strip() or None,
                row.get('Κατηγορία', '').strip() or None,
                row.get('facebook', '').strip() or None,
                row.get('linkedin', '').strip() or None,
                row.get('instagram', '').strip() or None,
                row.get('youtube', '').strip() or None,
                row.get('twitter', '').strip() or None,
                row.get('tiktok', '').strip() or None,
                row.get('youbehero', '').strip() or None,
                row.get('youbehero_url_from_youbehero', '').strip() or None,
                row.get('desmos', '').strip() or None,
                row.get('name_from_desmos', '').strip() or None,
                row.get('acf', '').strip() or None,
                row.get('name_from_acf', '').strip() or None,
                row.get('websiteaudits', '').strip() or None,
                row.get('ngoheroes', '').strip() or None,
                row.get('name_from_ngoheroes', '').strip() or None,
                row.get('social_dynamo', '').strip() or None,
                row.get('socialdynamo_url_from_social_dynamo', '').strip() or None,
                row.get('ethelon', '').strip() or None,
                row.get('ethelon_url_from_ethelon', '').strip() or None,
                row.get('media_items', '').strip() or None,
                row.get('hubspot_company_id', '').strip() or None,
                last_modified,
                row.get('Διεύθυνση', '').strip() or None,
                row.get('Πόλη', '').strip() or None,
                parse_bool(row.get('wordpress', '')),
                row.get('phone', '').strip() or None,
            )
            records.append(record)

        if records:
            with conn.cursor() as cur:
                # Clear existing data
                cur.execute("TRUNCATE TABLE organizations RESTART IDENTITY CASCADE")

                # Insert new data
                query = """
                    INSERT INTO organizations (
                        id, company_name, website, email, category,
                        facebook_page, linkedin_url, instagram_handle, youtube_channel, twitter_handle, tiktok_handle,
                        youbehero_url, desmos_name, acf_name, ngoheroes_name, social_dynamo_url, ethelon_url,
                        website_audits, ngoheroes_score, hubspot_company_id, last_modified,
                        address, city, wordpress, phone
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        company_name = EXCLUDED.company_name,
                        website = EXCLUDED.website,
                        email = EXCLUDED.email,
                        category = EXCLUDED.category,
                        facebook_page = EXCLUDED.facebook_page,
                        linkedin_url = EXCLUDED.linkedin_url,
                        instagram_handle = EXCLUDED.instagram_handle,
                        youtube_channel = EXCLUDED.youtube_channel,
                        twitter_handle = EXCLUDED.twitter_handle,
                        tiktok_handle = EXCLUDED.tiktok_handle,
                        youbehero_url = EXCLUDED.youbehero_url,
                        desmos_name = EXCLUDED.desmos_name,
                        acf_name = EXCLUDED.acf_name,
                        ngoheroes_name = EXCLUDED.ngoheroes_name,
                        social_dynamo_url = EXCLUDED.social_dynamo_url,
                        ethelon_url = EXCLUDED.ethelon_url,
                        website_audits = EXCLUDED.website_audits,
                        ngoheroes_score = EXCLUDED.ngoheroes_score,
                        hubspot_company_id = EXCLUDED.hubspot_company_id,
                        last_modified = EXCLUDED.last_modified,
                        address = EXCLUDED.address,
                        city = EXCLUDED.city,
                        wordpress = EXCLUDED.wordpress,
                        phone = EXCLUDED.phone,
                        updated_at = CURRENT_TIMESTAMP
                """
                execute_batch(cur, query, records)
                conn.commit()

            print(f"  ✅ Inserted {len(records)} organizations")
            return len(records)

    return 0


def main():
    """Main import routine"""
    print("=" * 60)
    print("CONSTELLATION DATABASE IMPORT v2.1")
    print("=" * 60)
    print(f"\n🔌 Connecting to PostgreSQL at {DB_HOST}:{DB_PORT}/{DB_NAME}...")

    try:
        conn = get_db_connection()
        print("✅ Database connection established")
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        print("\n💡 Make sure Docker services are running:")
        print("   cd '~/Insync/spytzo@gmail.com/OneDrive/Stellar Code/Stellar Databases'")
        print("   docker-compose up -d")
        sys.exit(1)

    total_imported = 0

    try:
        # Import each table
        media_count = import_media_outlets(conn)
        journalist_count = import_journalists(conn)
        org_count = import_organizations(conn)

        total_imported = media_count + journalist_count + org_count

        print("\n" + "=" * 60)
        print(f"✅ IMPORT COMPLETE: {total_imported} records loaded")
        print("=" * 60)
        print(f"\n📊 Summary:")
        print(f"   • Media Outlets: {media_count}")
        print(f"   • Journalists: {journalist_count}")
        print(f"   • Organizations (NGOs): {org_count}")
        print(f"\n🌐 Access NocoDB at: http://localhost:8080")

    except Exception as e:
        print(f"\n❌ Error during import: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()

    return total_imported


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⚠️  Import cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error during import: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
