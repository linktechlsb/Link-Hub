import { supabase } from "./supabase";

import type { RegistrarEventoInput } from "@link-leagues/types";

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Normaliza um caminho para um padrão de rota agrupável, substituindo
 * segmentos dinâmicos (UUIDs e números) por ":id".
 * Ex: /ligas/abc-123-... → /ligas/:id
 */
export function normalizarRota(caminho: string): string {
  const semQuery = caminho.split("?")[0] ?? caminho;
  const segmentos = semQuery.split("/").map((seg) => {
    if (!seg) return seg;
    const ehUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg);
    const ehNumero = /^\d+$/.test(seg);
    return ehUuid || ehNumero ? ":id" : seg;
  });
  return segmentos.join("/") || "/";
}

/** Rotas que não devem ser rastreadas (ex: a própria página de Dados, para não poluir as métricas). */
const ROTAS_IGNORADAS = ["/dados"];

/** Indica se um caminho deve ser ignorado pelo tracking. */
export function rotaIgnorada(caminho: string): boolean {
  const path = caminho.split("?")[0] ?? caminho;
  return ROTAS_IGNORADAS.some((r) => path === r || path.startsWith(`${r}/`));
}

/** True quando a app está rodando dentro de um iframe (ex: preview do heatmap). */
export function estaEmIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/** Registra um evento de uso. Falha silenciosa — analytics nunca quebra a navegação. */
export async function registrarEvento(input: RegistrarEventoInput): Promise<void> {
  if (estaEmIframe()) return;
  try {
    const token = await getToken();
    if (!token) return;
    await fetch("/api/analytics/eventos", {
      method: "POST",
      keepalive: true,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
  } catch {
    // ignora erros de tracking
  }
}

/** Envia um lote de eventos de uma vez. Falha silenciosa. */
export async function registrarEventos(eventos: RegistrarEventoInput[]): Promise<void> {
  if (eventos.length === 0 || estaEmIframe()) return;
  try {
    const token = await getToken();
    if (!token) return;
    await fetch("/api/analytics/eventos", {
      method: "POST",
      keepalive: true,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventos),
    });
  } catch {
    // ignora erros de tracking
  }
}

/** Registra um pageview para o caminho informado. */
export async function registrarPageview(caminho: string): Promise<void> {
  if (rotaIgnorada(caminho)) return;
  await registrarEvento({
    tipo: "pageview",
    caminho,
    rota: normalizarRota(caminho),
  });
}
