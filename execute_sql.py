import os
import sys
from pathlib import Path

# Load environment
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / '.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SERVICE_ROLE_KEY:
    print("❌ Missing Supabase credentials in .env.local")
    sys.exit(1)

if len(sys.argv) < 2:
    print("❌ Usage: python execute_sql.py <sql-file>")
    sys.exit(1)

sql_file = Path(sys.argv[1])
if not sql_file.exists():
    print(f"❌ File not found: {sql_file}")
    sys.exit(1)

sql_content = sql_file.read_text()

print(f"📋 SQL File: {sql_file.name}")
print(f"🔗 Supabase: {SUPABASE_URL}")
print("\n---\n")

# Try to use psycopg2 if available
try:
    import psycopg2
    from psycopg2 import sql as psql
    
    # Extract database URL from Supabase
    # Supabase format: https://PROJECT_ID.supabase.co
    project_id = SUPABASE_URL.split('.')[0].split('//')[1]
    
    # PostgreSQL connection string
    db_url = f"postgresql://postgres:postgres@db.{project_id}.supabase.co:5432/postgres"
    
    print("🚀 Connecting to database...")
    
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        print("✅ Connected!")
        print("\n🔄 Executing SQL...\n")
        
        # Execute SQL
        cur.execute(sql_content)
        conn.commit()
        
        print("✅ SQL executed successfully!")
        
        cur.close()
        conn.close()
        
    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        sys.exit(1)
        
except ImportError:
    print("⚠️  psycopg2 not available")
    print("\nPlease use the Supabase Dashboard or Supabase CLI:")
    print(f"1. Go to: https://supabase.com/dashboard")
    print(f"2. Open SQL Editor")
    print(f"3. Paste the SQL from: {sql_file}")
    print(f"4. Click 'Run'")
