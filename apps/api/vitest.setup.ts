// Define env vars necessárias antes do env.ts ser importado.
process.env.NODE_ENV ??= "test";
process.env.SUPABASE_URL ??= "http://localhost:54321";
process.env.SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
process.env.PUBLIC_API_BASE_URL ??= "http://localhost:3001";
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
