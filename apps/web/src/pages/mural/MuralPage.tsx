import { ChevronDown, Globe, Heart, ImageIcon, Lock, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

function VisibilidadePill({
  value,
  onChange,
}: {
  value: "publica" | "liga";
  onChange: (v: "publica" | "liga") => void;
}) {
  const [open, setOpen] = useState(false);

  const opcoes: { value: "publica" | "liga"; label: string; Icon: typeof Globe }[] = [
    { value: "publica", label: "Pública", Icon: Globe },
    { value: "liga", label: "Só a liga", Icon: Lock },
  ];

  const atual = opcoes.find((o) => o.value === value)!;
  const { Icon } = atual;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 border border-navy/25 dark:border-white/25 rounded-full px-2.5 py-0.5 font-plex-mono text-[9px] font-bold text-link-blue dark:text-white hover:border-navy/40 dark:hover:border-white/40 transition-colors">
          <Icon className="h-2.5 w-2.5" />
          {atual.label}
          <ChevronDown className="h-2.5 w-2.5 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-1 w-40" align="start">
        {opcoes.map((op) => {
          const OpIcon = op.Icon;
          return (
            <button
              key={op.value}
              onClick={() => {
                onChange(op.value);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded text-left font-plex-sans text-[12px] transition-colors",
                value === op.value
                  ? "bg-navy/5 text-navy font-semibold"
                  : "text-foreground/70 hover:bg-foreground/5",
              )}
            >
              <OpIcon className="h-3 w-3" />
              {op.label}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

function LigaPill({
  ligas,
  ligaSelecionadaId,
  onChange,
}: {
  ligas: Liga[];
  ligaSelecionadaId: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selecionada = ligas.find((l) => l.id === ligaSelecionadaId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 border border-navy/25 dark:border-white/25 rounded-full px-2.5 py-0.5 font-plex-mono text-[9px] font-bold text-link-blue dark:text-white hover:border-navy/40 dark:hover:border-white/40 transition-colors">
          {selecionada?.nome ?? "Selecionar liga"}
          <ChevronDown className="h-2.5 w-2.5 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-1 w-52" align="start">
        {ligas.map((liga) => (
          <button
            key={liga.id}
            onClick={() => {
              onChange(liga.id);
              setOpen(false);
            }}
            className={cn(
              "w-full text-left px-3 py-2 rounded font-plex-sans text-[12px] transition-colors",
              ligaSelecionadaId === liga.id
                ? "bg-navy/5 text-navy font-semibold"
                : "text-foreground/70 hover:bg-foreground/5",
            )}
          >
            {liga.nome}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function MuralPage() {
  const { role } = useUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [minhaLiga, setMinhaLiga] = useState<Liga | null>(null);
  const [todasLigas, setTodasLigas] = useState<Liga[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [nomeUsuario, setNomeUsuario] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [filtro, setFiltro] = useState<"publica" | "liga">("publica");
  const [novoConteudo, setNovoConteudo] = useState("");
  const [publicando, setPublicando] = useState(false);
  const [ligaSelecionadaId, setLigaSelecionadaId] = useState<string>("");
  const [visibilidade, setVisibilidade] = useState<"publica" | "liga">("publica");
  const [modalAberto, setModalAberto] = useState(false);

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

  // Carrega nome do usuário, liga e lista de ligas (staff)
  useEffect(() => {
    async function carregar() {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };

        const { data: sessionData } = await supabase.auth.getSession();
        const email = sessionData.session?.user?.email ?? "";
        const metadata = sessionData.session?.user?.user_metadata as
          | { nome?: string; full_name?: string }
          | undefined;

        // Busca nome e avatar da tabela de usuários
        const { data: usuarioPerfil } = await supabase
          .from("usuarios")
          .select("nome, avatar_url")
          .eq("email", email)
          .single();

        setNomeUsuario(
          (usuarioPerfil?.nome as string | undefined) ??
            metadata?.nome ??
            metadata?.full_name ??
            email.split("@")[0] ??
            "",
        );
        setAvatarUrl((usuarioPerfil?.avatar_url as string | null | undefined) ?? null);

        const ligaRes = await fetch("/api/ligas/minha", { headers });
        if (ligaRes.ok) setMinhaLiga(await ligaRes.json());

        if (isStaff) {
          const ligasRes = await fetch("/api/ligas", { headers });
          if (ligasRes.ok) {
            const ligas = (await ligasRes.json()) as Liga[];
            setTodasLigas(ligas);
            if (ligas.length > 0) setLigaSelecionadaId(ligas[0]!.id);
          }
        }
      } catch {
        // sem toast — falha silenciosa no carregamento inicial
      }
    }
    void carregar();
  }, [isStaff]);

  // Recarrega posts quando o filtro muda
  useEffect(() => {
    async function carregarPosts() {
      setCarregando(true);
      try {
        const token = await getToken();
        const res = await fetch(`/api/mural?filtro=${filtro}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setPosts(await res.json());
      } catch {
        toast.error("Erro ao carregar posts.");
      } finally {
        setCarregando(false);
      }
    }
    void carregarPosts();
  }, [filtro]);

  async function uploadImagem(file: File, ligaId: string): Promise<string | null> {
    setEnviandoImagem(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("imagem", file);
      formData.append("liga_id", ligaId);
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
    setImagemPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setImagemFile(file);
    setImagemUrl(null);
  }

  function removerImagem() {
    setImagemPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setImagemFile(null);
    setImagemUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function fecharModal() {
    setModalAberto(false);
    setNovoConteudo("");
    setVisibilidade("publica");
    removerImagem();
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
      finalImagemUrl = await uploadImagem(imagemFile, ligaId);
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
          visibilidade,
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
        { ...novoPost, liga_nome: ligaNome, autor_nome: novoPost.autor_nome ?? nomeUsuario },
        ...prev,
      ]);
      fecharModal();
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
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-foreground">
            Mural
          </h1>
          <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/50 mt-1">
            Postagens
          </p>
        </div>
        {podePublicar && (
          <button
            onClick={() => setModalAberto(true)}
            className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white dark:hover:bg-foreground dark:hover:text-background transition-colors flex-shrink-0"
          >
            + Criar postagem
          </button>
        )}
      </div>

      {/* Abas de filtro */}
      <AnimatedTabs
        tabs={[
          { id: "publica", label: "Públicas" },
          { id: "liga", label: "Minha Liga" },
        ]}
        activeTab={filtro}
        onChange={(id) => setFiltro(id as typeof filtro)}
        wrapperClassName="border-foreground/[0.08] mb-6"
        inactiveTabClassName="text-foreground/40 hover:text-foreground/60"
      />

      {/* Feed */}
      {carregando ? (
        <p className="font-plex-sans text-[13px] text-foreground/50">Carregando publicações…</p>
      ) : posts.length === 0 ? (
        <p className="font-plex-sans text-[13px] text-foreground/50">
          Nenhuma publicação ainda. Seja a primeira liga a postar!
        </p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className="border border-foreground/[0.08] rounded-lg p-5 hover:border-foreground/[0.15] transition-colors"
            >
              <header className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-navy flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {post.autor_avatar_url ? (
                      <img
                        src={post.autor_avatar_url}
                        alt={post.autor_nome ?? ""}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-[11px]">
                        {iniciais(post.autor_nome ?? post.liga_nome ?? "LI")}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-[13px] text-navy dark:text-foreground">
                        {post.autor_nome}
                      </span>
                      {post.autor_role && (
                        <span className="font-plex-mono text-[8px] uppercase tracking-[0.18em] border border-foreground/20 text-foreground/50 px-1.5 py-0.5 rounded-sm">
                          {ROLE_LABELS[post.autor_role] ?? post.autor_role}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="font-plex-sans text-[11px] text-foreground/50">
                        {post.liga_nome} · {formatarDataRelativa(post.criado_em)}
                      </span>
                    </div>
                  </div>
                </div>
                {(role === "staff" || (role === "diretor" && post.liga_id === minhaLiga?.id)) && (
                  <button
                    onClick={() => void remover(post.id)}
                    className="font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/30 hover:text-red-500 transition-colors flex-shrink-0 ml-2"
                  >
                    Remover
                  </button>
                )}
              </header>

              <p className="font-plex-sans text-[13px] text-foreground/80 leading-relaxed whitespace-pre-wrap mb-3">
                {post.conteudo}
              </p>

              {post.imagem_url && (
                <img
                  src={post.imagem_url}
                  alt=""
                  className="w-full rounded-lg mb-3 max-h-96 object-cover"
                />
              )}

              <footer className="flex items-center gap-6 mt-2">
                <button
                  onClick={() => void curtir(post.id)}
                  className={cn(
                    "flex items-center gap-1.5 font-plex-mono text-[11px] transition-colors",
                    post.curtido_por_mim ? "text-red-500" : "text-foreground/40 hover:text-red-500",
                  )}
                >
                  <Heart className={cn("h-3.5 w-3.5", post.curtido_por_mim && "fill-red-500")} />
                  {post.curtidas ?? 0}
                </button>
                <button
                  onClick={() => void toggleComentarios(post.id)}
                  className="flex items-center gap-1.5 font-plex-mono text-[11px] text-foreground/40 hover:text-foreground transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {post.total_comentarios ?? 0}
                </button>
              </footer>

              {comentariosAbertos[post.id] && (
                <div className="mt-4 border-t border-foreground/[0.08] pt-4 space-y-3">
                  {(comentariosPorPost[post.id] ?? []).map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <div className="h-7 w-7 rounded-full bg-foreground/10 flex items-center justify-center flex-shrink-0">
                        <span className="font-plex-mono text-[9px] text-foreground/60">
                          {iniciais(c.autor_nome ?? "U")}
                        </span>
                      </div>
                      <div className="flex-1 bg-foreground/[0.02] border border-foreground/[0.06] rounded px-3 py-2">
                        <p className="font-plex-mono text-[9px] uppercase tracking-[0.14em] text-foreground/50">
                          {c.autor_nome}
                        </p>
                        <p className="font-plex-sans text-[12px] text-foreground/80 mt-1">
                          {c.conteudo}
                        </p>
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
                      className="flex-1 border border-foreground/[0.12] rounded px-3 py-2 font-plex-sans text-[12px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-foreground/30 bg-transparent"
                    />
                    <button
                      onClick={() => void comentar(post.id)}
                      className="border border-foreground/[0.12] rounded px-3 py-2 text-foreground/50 hover:text-foreground hover:border-foreground/30 transition-colors"
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

      {/* Modal de criar postagem */}
      <Dialog open={modalAberto} onOpenChange={fecharModal}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
          {/* Header do modal */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-foreground/[0.08]">
            <h2 className="font-display font-bold text-[16px] tracking-[-0.02em] text-navy dark:text-foreground">
              Criar postagem
            </h2>
          </div>

          {/* Linha de autor */}
          <div className="flex items-start gap-3 px-5 pt-5">
            <div className="h-10 w-10 rounded-full bg-navy flex items-center justify-center flex-shrink-0 overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt={nomeUsuario} className="h-full w-full object-cover" />
              ) : (
                <span className="text-white font-bold text-[12px]">
                  {iniciais(nomeUsuario || "U")}
                </span>
              )}
            </div>
            <div>
              <p className="font-display font-bold text-[13px] text-navy dark:text-foreground">
                {nomeUsuario || "Você"}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {isStaff ? (
                  <LigaPill
                    ligas={todasLigas}
                    ligaSelecionadaId={ligaSelecionadaId}
                    onChange={setLigaSelecionadaId}
                  />
                ) : (
                  <span className="font-plex-sans text-[11px] text-foreground/50">
                    {minhaLiga?.nome ?? ""}
                  </span>
                )}
                <VisibilidadePill value={visibilidade} onChange={setVisibilidade} />
              </div>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            className="w-full px-5 pt-4 pb-2 font-plex-sans text-[13px] text-foreground placeholder:text-foreground/25 resize-none border-none outline-none bg-transparent min-h-[180px]"
            placeholder="Sobre o que você quer falar?"
            value={novoConteudo}
            onChange={(e) => setNovoConteudo(e.target.value)}
            maxLength={5000}
            autoFocus
          />

          {/* Preview de imagem */}
          {imagemPreview && (
            <div className="relative mx-5 mb-3">
              <img
                src={imagemPreview}
                alt="Preview"
                className="w-full rounded-lg max-h-48 object-cover"
              />
              <button
                onClick={removerImagem}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Toolbar + footer */}
          <div className="px-5 py-4 border-t border-foreground/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={selecionarImagem}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={enviandoImagem}
                className="flex items-center gap-1.5 font-plex-mono text-[9px] uppercase tracking-[0.12em] text-foreground/40 hover:text-foreground/60 transition-colors disabled:opacity-40"
              >
                <ImageIcon className="h-4 w-4" />
                Imagem
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fecharModal}
                className="font-plex-mono text-[10px] uppercase tracking-[0.1em] text-foreground/40 hover:text-foreground/60 px-3 py-2 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => void publicar()}
                disabled={
                  publicando ||
                  enviandoImagem ||
                  !novoConteudo.trim() ||
                  (isStaff && !ligaSelecionadaId)
                }
                className="bg-navy text-white font-plex-mono text-[10px] uppercase tracking-[0.1em] px-4 py-2 rounded-full hover:bg-navy/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {publicando ? "Publicando..." : "Publicar →"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
