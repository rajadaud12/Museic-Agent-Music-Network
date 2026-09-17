import { neon, neonConfig } from '@neondatabase/serverless';

// Cache connection
let sqlClient: ReturnType<typeof neon> | null = null;

export function getNeonSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.trim() === '' || connectionString.includes('ep-sample-pooler')) {
    return null;
  }

  if (!sqlClient) {
    try {
      sqlClient = neon(connectionString);
    } catch (err) {
      console.warn('Failed to initialize Neon SQL client:', err);
      return null;
    }
  }

  return sqlClient;
}

export function isNeonConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  return Boolean(url && url.trim().length > 0 && !url.includes('ep-sample-pooler'));
}
