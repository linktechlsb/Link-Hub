import { Heart, MessageCircle, Send, ImageIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useUser } from "@/hooks/use-user";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/pages/home/v1/primitives";

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

function formatarDataCompleta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const ROLE_LABELS: Record<string, string> = {
  staff: "Staff",
  diretor: "Diretor",
  membro: "Membro",
  professor: "Professor",
  estudante: "Estudante",
};

export function MuralPage() {
  const { role } = useUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [minhaLiga, setMinhaLiga] = useState<Liga | null>(null);
  const [todasLigas, setTodasLigas] = useState<Liga[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [novoConteudo, setNovoConteudo] = useState("");
  const [publicando, setPublicando] = useState(false);
  const [ligaSelecionadaId, setLigaSelecionadaId] = useState<string>("");

  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [comentariosAbertos, setComentariosAbertos] = useState<Record<string, boolean>>({});
  const [comentariosPorPost, setComentariosPorPost] = useState<Record<string, PostComentario[]>>(
    {},
  );
  const [novoComentario, setNovoComentario] = useState<Record<string, string>>({});

  const podePublicar = role === "staff" || role === "diretor";
  const isStaff = role === "staff";

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

        if (isStaff) {
          const ligasRes = await fetch("/api/ligas", { headers });
          if (ligasRes.ok) {
            const ligas = (await ligasRes.json()) as Liga[];
            setTodasLigas(ligas);
            if (ligas.length > 0) {
              setLigaSelecionadaId(ligas[0]!.id);
            }
          }
        }
      } finally {
        setCarregando(false);
      }
    }
    void carregar();
  }, [isStaff]);

  async function uploadImagem(file: File): Promise<string | null> {
    setEnviandoImagem(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("imagem", file);
      const res = await fetch("/api/mural/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "Erro ao enviar imagem.");
        return null;
      }
      const { imagem_url } = (await res.json()) as { imagem_url: string };
      return imagem_url;
    } finally {
      setEnviandoImagem(false);
    }
  }

  function selecionarImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagemFile(file);
    setImagemPreview(URL.createObjectURL(file));
    setImagemUrl(null);
  }

  function removerImagem() {
    setImagemFile(null);
    setImagemPreview(null);
    setImagemUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function publicar() {
    if (!novoConteudo.trim()) return;

    const ligaId = isStaff ? ligaSelecionadaId : (minhaLiga?.id ?? "");
    if (!ligaId) {
      toast.error("Selecione uma liga para publicar.");
      return;
    }

    let finalImagemUrl = imagemUrl;
    if (imagemFile && !finalImagemUrl) {
      finalImagemUrl = await uploadImagem(imagemFile);
      if (!finalImagemUrl) return;
      setImagemUrl(finalImagemUrl);
    }

    setPublicando(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/mural", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          liga_id: ligaId,
          conteudo: novoConteudo.trim(),
          imagem_url: finalImagemUrl ?? undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "Erro ao publicar.");
        return;
      }
      const novoPost = (await res.json()) as Post;
      const ligaNome = isStaff
        ? (todasLigas.find((l) => l.id === ligaId)?.nome ?? "")
        : (minhaLiga?.nome ?? "");
      setPosts((prev) => [
        { ...novoPost, liga_nome: ligaNome, autor_nome: novoPost.autor_nome ?? "Você" },
        ...prev,
      ]);
      setNovoConteudo("");
      removerImagem();
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

  const ligaParaPublicar = isStaff ? todasLigas.find((l) => l.id === ligaSelecionadaId) : minhaLiga;

  const podeExibirFormulario = podePublicar && (isStaff ? todasLigas.length > 0 : !!minhaLiga);

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Cabeçalho */}
      <div className="mb-10">
        <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">Mural</h1>
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 mt-1">
          Publicações · Link School of Business
        </p>
      </div>

      <div className="max-w-3xl space-y-0">
        {/* Área de publicação */}
        {podeExibirFormulario && (
          <div className="border border-navy/20 mb-10">
            <div className="px-6 py-5">
              {/* Seletor de liga para staff */}
              {isStaff ? (
                <div className="mb-3">
                  <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 mb-1.5">
                    Publicar como
                  </p>
                  <select
                    value={ligaSelecionadaId}
                    onChange={(e) => setLigaSelecionadaId(e.target.value)}
                    className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2 bg-white focus:outline-none focus:border-navy/60"
                  >
                    {todasLigas.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 mb-3">
                  Publicar como {ligaParaPublicar?.nome}
                </p>
              )}

              <textarea
                value={novoConteudo}
                onChange={(e) => setNovoConteudo(e.target.value)}
                placeholder="O que está acontecendo na sua liga?"
                rows={3}
                className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2.5 bg-white placeholder:text-navy/30 focus:outline-none focus:border-navy/60 resize-none"
              />

              {/* Preview de imagem */}
              {imagemPreview && (
                <div className="relative mt-3 inline-block">
                  <img
                    src={imagemPreview}
                    alt=""
                    className="max-h-48 border border-navy/10 object-cover"
                  />
                  <button
                    onClick={removerImagem}
                    className="absolute top-1 right-1 bg-navy text-white p-0.5 hover:bg-red-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between mt-3">
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={selecionarImagem}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 font-plex-mono text-[11px] uppercase tracking-[0.12em] text-navy/50 hover:text-navy transition-colors"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    Imagem
                  </button>
                </div>
                <button
                  onClick={() => void publicar()}
                  disabled={publicando || enviandoImagem || !novoConteudo.trim()}
                  className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy px-4 py-2.5 hover:bg-navy/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {publicando ? "Publicando..." : "Publicar"}
                </button>
              </div>
            </div>
          </div>
        )}

        <SectionHeader numero="01" eyebrow="Feed" titulo="Publicações das Ligas" />

        {carregando ? (
          <p className="font-plex-sans text-[13px] text-navy/50">Carregando publicações…</p>
        ) : posts.length === 0 ? (
          <p className="font-plex-sans text-[13px] text-navy/50">
            Nenhuma publicação ainda. Seja a primeira liga a postar!
          </p>
        ) : (
          <div className="border-t border-navy">
            {posts.map((post) => (
              <article key={post.id} className="border-b border-navy/10 py-6">
                <header className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden bg-navy flex items-center justify-center">
                      {post.autor_avatar_url ? (
                        <img
                          src={post.autor_avatar_url}
                          alt={post.autor_nome ?? ""}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="font-plex-mono text-[11px] text-white">
                          {iniciais(post.autor_nome ?? post.liga_nome ?? "LI")}
                        </span>
                      )}
                    </div>

                    <div>
                      {/* Nome + role badge */}
                      <div className="flex items-center gap-2">
                        <p className="font-plex-sans font-semibold text-[13px] text-navy">
                          {post.autor_nome}
                        </p>
                        {post.autor_role && (
                          <span className="font-plex-mono text-[9px] uppercase tracking-[0.14em] text-white bg-navy/60 px-1.5 py-0.5">
                            {ROLE_LABELS[post.autor_role] ?? post.autor_role}
                          </span>
                        )}
                      </div>
                      {/* Liga + data */}
                      <p className="font-plex-mono text-[10px] text-navy/50 mt-0.5">
                        {post.liga_nome}
                        {" · "}
                        <span title={formatarDataCompleta(post.criado_em)}>
                          {formatarDataRelativa(post.criado_em)}
                        </span>
                      </p>
                    </div>
                  </div>
                  {podePublicar && (
                    <button
                      onClick={() => void remover(post.id)}
                      className="font-plex-mono text-[10px] uppercase tracking-[0.14em] text-navy/40 hover:text-red-600 transition-colors"
                    >
                      Remover
                    </button>
                  )}
                </header>

                <p className="font-plex-sans text-[13px] text-navy mt-4 whitespace-pre-wrap leading-relaxed">
                  {post.conteudo}
                </p>

                {post.imagem_url && (
                  <img
                    src={post.imagem_url}
                    alt=""
                    className="mt-4 border border-navy/10 w-full object-cover max-h-96"
                  />
                )}

                <footer className="flex items-center gap-6 mt-5">
                  <button
                    onClick={() => void curtir(post.id)}
                    className={cn(
                      "flex items-center gap-1.5 font-plex-mono text-[11px] transition-colors",
                      post.curtido_por_mim ? "text-red-500" : "text-navy/40 hover:text-red-500",
                    )}
                  >
                    <Heart className={cn("h-3.5 w-3.5", post.curtido_por_mim && "fill-red-500")} />
                    {post.curtidas ?? 0}
                  </button>
                  <button
                    onClick={() => void toggleComentarios(post.id)}
                    className="flex items-center gap-1.5 font-plex-mono text-[11px] text-navy/40 hover:text-navy transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {post.total_comentarios ?? 0}
                  </button>
                </footer>

                {comentariosAbertos[post.id] && (
                  <div className="mt-5 border-t border-navy/10 pt-5 space-y-3">
                    {(comentariosPorPost[post.id] ?? []).map((c) => (
                      <div key={c.id} className="flex gap-3">
                        <div className="h-7 w-7 flex-shrink-0 bg-navy/10 flex items-center justify-center">
                          <span className="font-plex-mono text-[9px] text-navy">
                            {iniciais(c.autor_nome ?? "U")}
                          </span>
                        </div>
                        <div className="flex-1 bg-navy/[0.02] border border-navy/10 px-3 py-2">
                          <p className="font-plex-mono text-[9px] uppercase tracking-[0.14em] text-navy/60">
                            {c.autor_nome}
                          </p>
                          <p className="font-plex-sans text-[12px] text-navy mt-1">{c.conteudo}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-3">
                      <input
                        value={novoComentario[post.id] ?? ""}
                        onChange={(e) =>
                          setNovoComentario((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void comentar(post.id);
                        }}
                        placeholder="Escreva um comentário…"
                        className="flex-1 border border-navy/20 px-3 py-2 font-plex-sans text-[12px] text-navy placeholder:text-navy/30 focus:outline-none focus:border-navy/60 bg-white"
                      />
                      <button
                        onClick={() => void comentar(post.id)}
                        className="border border-navy/20 px-3 py-2 text-navy hover:bg-navy hover:text-white transition-colors"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
