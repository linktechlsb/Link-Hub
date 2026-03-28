import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../apps/api/.env") });

const supabaseUrl = process.env["SUPABASE_URL"]!;
const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [
  {
    email: "diogo.lider@aluno.slb.com.br",
    password: "senha123",
    role: "lider",
  },
  {
    email: "diogo.membro@aluno.slb.com.br",
    password: "senha123",
    role: "membro",
  },
];

async function main() {
  for (const user of users) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { role: user.role },
    });

    if (error) {
      console.error(`Erro ao criar ${user.email}:`, error.message);
    } else {
      console.log(`Usuário criado: ${data.user?.email} (${user.role})`);
    }
  }
}

main();
