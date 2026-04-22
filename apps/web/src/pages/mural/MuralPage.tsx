import { Heart, MessageCircle, MoreHorizontal, Send, Trash2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

import type { Liga, Post, PostComentario } from "@link-leagues/types";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatarDataRelativa(iso: string): string {
  const data = new Date(iso);
  const agora = Date.now();
  const diff = Math.floor((agora - data.getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} d`;
  return data.toLocaleDateString("pt-BR");
}

export function MuralPage() {
  const { role } = useUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [minhaLiga, setMinhaLiga] = useState<Liga | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [novoConteudo, setNovoConteudo] = useState("");
  const [publicando, setPublicando] = useState(false);

  const [comentariosAbertos, setComentariosAbertos] = useState<Record<string, boolean>>({});
  const [comentariosPorPost, setComentariosPorPost] = useState<Record<string, PostComentario[]>>(
    {},
  );
  const [novoComentario, setNovoComentario] = useState<Record<string, string>>({});

  const podePublicar = role === "staff" || role === "diretor";

  useEffect(() => {
    async function carregar() {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [postsRes, ligaRes] = await Promise.all([
          fetch("/api/mural", { headers }),
          fetch("/api/ligas/minha", { headers }),
        ]);

        if (postsRes.ok) setPosts(await postsRes.json());
        if (ligaRes.ok) setMinhaLiga(await ligaRes.json());
      } finally {
        setCarregando(false);
      }
    }
    void carregar();
  }, []);

  async function publicar() {
    if (!novoConteudo.trim()) return;
    if (!minhaLiga) {
      toast.error("Você precisa fazer parte de uma liga para publicar.");
      return;
    }
    setPublicando(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/mural", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          liga_id: minhaLiga.id,
          conteudo: novoConteudo.trim(),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "Erro ao publicar.");
        return;
      }
      const novoPost = (await res.json()) as Post;
      setPosts((prev) => [
        { ...novoPost, liga_nome: minhaLiga.nome, autor_nome: novoPost.autor_nome ?? "Você" },
        ...prev,
      ]);
      setNovoConteudo("");
      toast.success("Post publicado.");
    } finally {
      setPublicando(false);
    }
  }

  async function curtir(id: string) {
    const token = await getToken();
    const res = await fetch(`/api/mural/${id}/curtir`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const body = (await res.json()) as { curtido_por_mim: boolean };
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              curtido_por_mim: body.curtido_por_mim,
              curtidas: (p.curtidas ?? 0) + (body.curtido_por_mim ? 1 : -1),
            }
          : p,
      ),
    );
  }

  async function remover(id: string) {
    const token = await getToken();
    const res = await fetch(`/api/mural/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok && res.status !== 204) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(body.error ?? "Erro ao remover.");
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== id));
    toast.success("Post removido.");
  }

  async function toggleComentarios(postId: string) {
    const aberto = !comentariosAbertos[postId];
    setComentariosAbertos((prev) => ({ ...prev, [postId]: aberto }));
    if (aberto && !comentariosPorPost[postId]) {
      const token = await getToken();
      const res = await fetch(`/api/mural/${postId}/comentarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as PostComentario[];
        setComentariosPorPost((prev) => ({ ...prev, [postId]: data }));
      }
    }
  }

  async function comentar(postId: string) {
    const texto = (novoComentario[postId] ?? "").trim();
    if (!texto) return;
    const token = await getToken();
    const res = await fetch(`/api/mural/${postId}/comentarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ conteudo: texto }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(body.error ?? "Erro ao comentar.");
      return;
    }
    const novo = (await res.json()) as PostComentario;
    setComentariosPorPost((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] ?? []), novo],
    }));
    setNovoComentario((prev) => ({ ...prev, [postId]: "" }));
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, total_comentarios: (p.total_comentarios ?? 0) + 1 } : p,
      ),
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-navy">Mural</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Acompanhe as publicações das ligas da Link
        </p>
      </div>

      {podePublicar && minhaLiga && (
        <div className="bg-white border border-brand-gray rounded-xl p-4 mb-6">
          <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-2">
            Publicar como {minhaLiga.nome}
          </p>
          <Textarea
            value={novoConteudo}
            onChange={(e) => setNovoConteudo(e.target.value)}
            placeholder="O que está acontecendo na sua liga?"
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-end mt-2">
            <Button
              onClick={() => void publicar()}
              disabled={publicando || !novoConteudo.trim()}
              className="bg-navy hover:bg-navy/90"
            >
              {publicando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publicar"}
            </Button>
          </div>
        </div>
      )}

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando publicações…</p>
      ) : posts.length === 0 ? (
        <div className="bg-white border border-brand-gray rounded-xl p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma publicação ainda. Seja a primeira liga a postar!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article key={post.id} className="bg-white border border-brand-gray rounded-xl p-4">
              <header className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-navy text-white text-xs">
                      {iniciais(post.liga_nome ?? "LI")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-navy">{post.liga_nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {post.autor_nome} · {formatarDataRelativa(post.criado_em)}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => void remover(post.id)}
                      className="text-red-500"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remover
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </header>

              <p className="text-sm text-navy mt-3 whitespace-pre-wrap">{post.conteudo}</p>

              {post.imagem_url && (
                <img
                  src={post.imagem_url}
                  alt=""
                  className="mt-3 rounded-lg border border-brand-gray w-full object-cover max-h-96"
                />
              )}

              <footer className="flex items-center gap-4 mt-4 pt-3 border-t border-brand-gray">
                <button
                  onClick={() => void curtir(post.id)}
                  className={cn(
                    "flex items-center gap-1.5 text-xs transition-colors",
                    post.curtido_por_mim
                      ? "text-red-500"
                      : "text-muted-foreground hover:text-red-500",
                  )}
                >
                  <Heart className={cn("h-4 w-4", post.curtido_por_mim && "fill-red-500")} />
                  {post.curtidas ?? 0}
                </button>
                <button
                  onClick={() => void toggleComentarios(post.id)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-navy transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  {post.total_comentarios ?? 0}
                </button>
              </footer>

              {comentariosAbertos[post.id] && (
                <div className="mt-3 space-y-2">
                  {(comentariosPorPost[post.id] ?? []).map((c) => (
                    <div key={c.id} className="flex gap-2">
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <AvatarFallback className="bg-link-blue text-white text-[10px]">
                          {iniciais(c.autor_nome ?? "U")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-xs font-semibold text-navy">{c.autor_nome}</p>
                        <p className="text-xs text-muted-foreground">{c.conteudo}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input
                      value={novoComentario[post.id] ?? ""}
                      onChange={(e) =>
                        setNovoComentario((prev) => ({ ...prev, [post.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void comentar(post.id);
                      }}
                      placeholder="Escreva um comentário…"
                      className="flex-1 border border-brand-gray rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => void comentar(post.id)}
                      className="h-8 w-8"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
