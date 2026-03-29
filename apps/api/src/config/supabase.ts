import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env["SUPABASE_URL"];
const anonKey = process.env["SUPABASE_ANON_KEY"];
const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

if (!supabaseUrl || !anonKey) {
  throw new Error("SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios.");
}

// Client anon — usado apenas para validar tokens de usuário no middleware de auth
export const supabaseAnon = createClient(supabaseUrl, anonKey);

// Client admin — bypassa RLS, usado para queries internas
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey ?? anonKey);
