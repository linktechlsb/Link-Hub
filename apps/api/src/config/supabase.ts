import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env["SUPABASE_URL"];
const anonKey = process.env["SUPABASE_ANON_KEY"];

if (!supabaseUrl || !anonKey) {
  throw new Error("SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios.");
}

// Client anon — usado apenas para validar tokens de usuário no middleware de auth
export const supabaseAnon = createClient(supabaseUrl, anonKey);
