import { supabase } from "./supabase";

const API = () => (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export interface UsuarioMe {
  id: string;
  nome: string;
  email: string;
  role: string;
  avatar_url: string | null;
  biografia: string | null;
  instagram: string | null;
  linkedin: string | null;
  semestre: string | null;
}

export async function carregarUsuarioMe(): Promise<UsuarioMe | null> {
  const token = await getToken();
  if (!token) return null;
  const res = await fetch(`${API()}/usuarios/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<UsuarioMe>;
}

export async function salvarPerfilMe(data: {
  nome?: string;
  biografia?: string;
  instagram?: string;
  linkedin?: string;
  semestre?: string;
}): Promise<UsuarioMe | null> {
  const token = await getToken();
  if (!token) return null;
  const res = await fetch(`${API()}/usuarios/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  return res.json() as Promise<UsuarioMe>;
}

export async function uploadAvatarMe(file: File): Promise<UsuarioMe | null> {
  const token = await getToken();
  if (!token) return null;
  const formData = new FormData();
  formData.append("imagem", file);
  const res = await fetch(`${API()}/usuarios/me/avatar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) return null;
  return res.json() as Promise<UsuarioMe>;
}
