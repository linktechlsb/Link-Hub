import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env["SUPABASE_URL"];
const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios."
  );
}

// Client com service role para operações server-side (bypassa RLS quando necessário)
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Client com anon key para validar tokens de usuário
export const supabaseAnon = createClient(
  supabaseUrl,
  process.env["SUPABASE_ANON_KEY"] ?? ""
);
