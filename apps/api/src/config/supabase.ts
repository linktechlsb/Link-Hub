import { createClient } from "@supabase/supabase-js";

import { env } from "./env.js";

// Client anon — usado apenas para validar tokens de usuário no middleware de auth
export const supabaseAnon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

// Client admin — bypassa RLS, usado para queries internas. Requer service role key.
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
