import {
  ChevronDown,
  Globe,
  Heart,
  ImageIcon,
  Lock,
  MessageCircle,
  Plus,
  Send,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { DashboardCard } from "@/pages/home/components/DashboardCard";

import type { Liga, Post, PostComentario } from "@link-leagues/types";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
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
        <button className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground/60 transition-colors hover:bg-muted hover:text-foreground">
          <Icon className="h-3 w-3" />
          {atual.label}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
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
                "flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs transition-colors",
                value === op.value
                  ? "bg-muted font-semibold text-foreground"
                  : "text-foreground/70 hover:bg-muted",
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
        <button className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground/60 transition-colors hover:bg-muted hover:text-foreground">
          {selecionada?.nome ?? "Selecionar liga"}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1" align="start">
        {ligas.map((liga) => (
          <button
            key={liga.id}
            onClick={() => {
              onChange(liga.id);
              setOpen(false);
            }}
            className={cn(
              "w-full rounded px-3 py-2 text-left text-xs transition-colors",
              ligaSelecionadaId === liga.id
                ? "bg-muted font-semibold text-foreground"
                : "text-foreground/70 hover:bg-muted",
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
  const location = useLocation();
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

  useEffect(() => {
    const state = location.state as { abrirModal?: boolean } | null;
    if (state?.abrirModal && podePublicar) {
      setModalAberto(true);
      window.history.replaceState({}, "");
    }
  }, [location.state, podePublicar]);

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
    <div className="mx-auto max-w-2xl px-8 py-10">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Mural</h1>
          <p className="mt-1 text-sm text-foreground/50">Postagens das ligas</p>
        </div>
        {podePublicar && (
          <button
            onClick={() => setModalAberto(true)}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-foreground/20 px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted dark:border-transparent dark:bg-white dark:text-neutral-900 dark:hover:bg-white/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Criar postagem
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
        wrapperClassName="border-border mb-6"
        inactiveTabClassName="text-foreground/40 hover:text-foreground/60"
      />

      {/* Feed */}
      {carregando ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <DashboardCard key={i} className="p-5">
              {/* Header: avatar + author info */}
              <div className="mb-3 flex items-start gap-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full bg-foreground/5" />
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Skeleton className="h-4 w-28 bg-foreground/5" />
                    <Skeleton className="h-4 w-14 rounded-sm bg-foreground/5" />
                  </div>
                  <Skeleton className="h-3 w-36 bg-foreground/5" />
                </div>
              </div>
              {/* Content: 2-3 lines of text */}
              <Skeleton className="mb-1.5 h-3.5 w-full bg-foreground/5" />
              <Skeleton className="mb-1.5 h-3.5 w-full bg-foreground/5" />
              <Skeleton className="mb-3 h-3.5 w-2/3 bg-foreground/5" />
              {/* Footer: likes + comments */}
              <div className="mt-2 flex items-center gap-6">
                <Skeleton className="h-4 w-10 bg-foreground/5" />
                <Skeleton className="h-4 w-10 bg-foreground/5" />
              </div>
            </DashboardCard>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="text-sm text-foreground/50">
          Nenhuma publicação ainda. Seja a primeira liga a postar!
        </p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/20"
            >
              <header className="mb-3 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <UserAvatar
                    nome={post.autor_nome ?? post.liga_nome}
                    src={post.autor_avatar_url}
                    className="h-9 w-9"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-sm font-bold text-foreground">
                        {post.autor_nome}
                      </span>
                      {post.autor_role && (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground/50">
                          {ROLE_LABELS[post.autor_role] ?? post.autor_role}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-foreground/50">
                        {post.liga_nome} · {formatarDataRelativa(post.criado_em)}
                      </span>
                    </div>
                  </div>
                </div>
                {(role === "staff" || (role === "diretor" && post.liga_id === minhaLiga?.id)) && (
                  <button
                    onClick={() => void remover(post.id)}
                    className="ml-2 flex-shrink-0 text-xs text-foreground/30 transition-colors hover:text-red-500"
                  >
                    Remover
                  </button>
                )}
              </header>

              <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                {post.conteudo}
              </p>

              {post.imagem_url && (
                <img
                  src={post.imagem_url}
                  alt=""
                  className="mb-3 max-h-96 w-full rounded-lg object-cover"
                />
              )}

              <footer className="mt-2 flex items-center gap-6">
                <button
                  onClick={() => void curtir(post.id)}
                  className={cn(
                    "flex items-center gap-1.5 text-xs transition-colors",
                    post.curtido_por_mim ? "text-red-500" : "text-foreground/40 hover:text-red-500",
                  )}
                >
                  <Heart className={cn("h-3.5 w-3.5", post.curtido_por_mim && "fill-red-500")} />
                  {post.curtidas ?? 0}
                </button>
                <button
                  onClick={() => void toggleComentarios(post.id)}
                  className="flex items-center gap-1.5 text-xs text-foreground/40 transition-colors hover:text-foreground"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {post.total_comentarios ?? 0}
                </button>
              </footer>

              {comentariosAbertos[post.id] && (
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  {(comentariosPorPost[post.id] ?? []).map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <UserAvatar nome={c.autor_nome ?? "U"} className="h-7 w-7" />
                      <div className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2">
                        <p className="text-xs font-semibold text-foreground/70">{c.autor_nome}</p>
                        <p className="mt-1 text-sm text-foreground/80">{c.conteudo}</p>
                      </div>
                    </div>
                  ))}
                  <div className="mt-3 flex gap-2">
                    <input
                      value={novoComentario[post.id] ?? ""}
                      onChange={(e) =>
                        setNovoComentario((prev) => ({ ...prev, [post.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void comentar(post.id);
                      }}
                      placeholder="Escreva um comentário…"
                      className="flex-1 rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/40 focus:outline-none"
                    />
                    <button
                      onClick={() => void comentar(post.id)}
                      className="rounded-lg border border-border px-3 py-2 text-foreground/50 transition-colors hover:border-foreground/40 hover:text-foreground"
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
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
          {/* Header do modal */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-display text-base font-bold text-foreground">Criar postagem</h2>
          </div>

          {/* Linha de autor */}
          <div className="flex items-start gap-3 px-5 pt-5">
            <UserAvatar nome={nomeUsuario || "U"} src={avatarUrl} className="h-10 w-10" />
            <div>
              <p className="font-display text-sm font-bold text-foreground">
                {nomeUsuario || "Você"}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {isStaff ? (
                  <LigaPill
                    ligas={todasLigas}
                    ligaSelecionadaId={ligaSelecionadaId}
                    onChange={setLigaSelecionadaId}
                  />
                ) : (
                  <span className="text-xs text-foreground/50">{minhaLiga?.nome ?? ""}</span>
                )}
                <VisibilidadePill value={visibilidade} onChange={setVisibilidade} />
              </div>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            className="min-h-[180px] w-full resize-none border-none bg-transparent px-5 pb-2 pt-4 text-sm text-foreground outline-none placeholder:text-foreground/25"
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
                className="max-h-48 w-full rounded-lg object-cover"
              />
              <button
                onClick={removerImagem}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white transition-colors hover:bg-black/70"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Toolbar + footer */}
          <div className="flex items-center justify-between border-t border-border px-5 py-4">
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
                className="flex items-center gap-1.5 text-xs font-medium text-foreground/40 transition-colors hover:text-foreground/60 disabled:opacity-40"
              >
                <ImageIcon className="h-4 w-4" />
                Imagem
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fecharModal}
                className="rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground/60 transition-colors hover:bg-muted"
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
                className="rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {publicando ? "Publicando..." : "Publicar"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
