# Ligas Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar a página `/ligas` com grid de cards de ligas, dropdown de ações (lider/admin) e sheet de criar/editar liga com upload de imagem e busca de diretores por e-mail.

**Architecture:** A API recebe novos endpoints enriquecidos (GET /ligas com diretores e contagem de projetos, POST /:id/imagem para upload via Supabase Storage, GET /usuarios/busca para autocomplete). O frontend substitui a página em branco por três componentes: `LigasPage` (orquestra), `LigaCard` (card visual) e `LigaSheet` (formulário slide-in).

**Tech Stack:** React 18 + TypeScript, Tailwind CSS v3, shadcn/ui (DropdownMenu + Sheet — já instalados), Lucide React, Express + postgres tagged templates, multer (memoryStorage), Supabase Storage, Supabase JS.

---

## Mapa de arquivos

| Arquivo                                  | Ação                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `migrations/003_ligas_imagem.sql`        | Criar — ADD COLUMN imagem_url                                           |
| `packages/types/src/liga.ts`             | Modificar — add imagem_url, diretores, projetos_ativos, cargo           |
| `apps/api/src/routes/ligas.ts`           | Modificar — GET enriquecido, POST /:id/imagem, POST/PATCH com diretores |
| `apps/api/src/routes/usuarios.ts`        | Criar — GET /usuarios/busca                                             |
| `apps/api/src/routes/index.ts`           | Modificar — montar usuariosRouter                                       |
| `apps/web/src/pages/ligas/LigaCard.tsx`  | Criar — card individual                                                 |
| `apps/web/src/pages/ligas/LigaSheet.tsx` | Criar — sheet criar/editar                                              |
| `apps/web/src/pages/ligas/LigasPage.tsx` | Reescrever — página completa                                            |

---

## Task 1: Migration — adicionar imagem_url à tabela ligas

**Files:**

- Criar: `migrations/003_ligas_imagem.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- migrations/003_ligas_imagem.sql
ALTER TABLE ligas ADD COLUMN IF NOT EXISTS imagem_url TEXT;
```

- [ ] **Step 2: Executar a migration no banco**

Acesse o painel do Supabase → SQL Editor e execute o conteúdo do arquivo acima.

Confirme rodando:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'ligas' AND column_name = 'imagem_url';
```

Esperado: 1 linha retornada.

- [ ] **Step 3: Criar bucket no Supabase Storage**

No painel do Supabase → Storage → New bucket:

- Nome: `ligas-imagens`
- Público: ✅ (leitura pública)
- Clique em "Save"

- [ ] **Step 4: Commit**

```bash
git add migrations/003_ligas_imagem.sql
git commit -m "feat: add imagem_url column to ligas table"
```

---

## Task 2: Atualizar tipos compartilhados

**Files:**

- Modificar: `packages/types/src/liga.ts`

- [ ] **Step 1: Atualizar o arquivo de tipos**

Substitua o conteúdo de `packages/types/src/liga.ts` por:

```ts
import type { Usuario } from "./user.js";

export interface Liga {
  id: string;
  nome: string;
  descricao?: string;
  lider_id: string;
  lider?: Usuario;
  lider_email?: string;
  imagem_url?: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  diretores?: { id: string; nome: string }[];
  projetos_ativos?: number;
}

export interface LigaMembro {
  id: string;
  liga_id: string;
  usuario_id: string;
  usuario?: Usuario;
  cargo?: string;
  ingressou_em: string;
}

export interface CreateLigaInput {
  nome: string;
  descricao?: string;
  lider_id: string;
  diretores?: string[];
}

export interface UpdateLigaInput {
  nome?: string;
  descricao?: string;
  lider_id?: string;
  ativo?: boolean;
  diretores?: string[];
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
cd /path/to/project && pnpm typecheck
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/liga.ts
git commit -m "feat: add imagem_url, diretores, projetos_ativos to Liga type"
```

---

## Task 3: Instalar multer na API

**Files:**

- Modificar: `apps/api/package.json` (via pnpm)

- [ ] **Step 1: Instalar multer e tipos**

```bash
cd apps/api && pnpm add multer && pnpm add -D @types/multer
```

- [ ] **Step 2: Confirmar instalação**

```bash
node -e "import('multer').then(() => console.log('ok'))"
```

Esperado: `ok`

- [ ] **Step 3: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore: add multer to api dependencies"
```

---

## Task 4: Atualizar GET /ligas com query enriquecida

**Files:**

- Modificar: `apps/api/src/routes/ligas.ts` (linhas 8-15)

- [ ] **Step 1: Substituir o handler GET / em `apps/api/src/routes/ligas.ts`**

Substitua o bloco:

```ts
// GET /ligas — lista todas as ligas
ligasRouter.get("/", authenticate, async (_req, res, next) => {
  try {
    const ligas = await sql`SELECT * FROM ligas ORDER BY nome`;
    res.json(ligas);
  } catch (err) {
    next(err);
  }
});
```

Por:

```ts
// GET /ligas — lista todas as ligas com diretores e contagem de projetos
ligasRouter.get("/", authenticate, async (_req, res, next) => {
  try {
    const ligas = await sql`
      SELECT
        l.*,
        lu.email AS lider_email,
        COALESCE(
          json_agg(
            json_build_object('id', u.id, 'nome', u.nome)
          ) FILTER (WHERE lm.cargo = 'Diretor' AND lm.id IS NOT NULL),
          '[]'
        ) AS diretores,
        COUNT(p.id) FILTER (
          WHERE p.status IN ('aprovado', 'em_andamento')
        )::int AS projetos_ativos
      FROM ligas l
      LEFT JOIN usuarios lu ON lu.id = l.lider_id
      LEFT JOIN liga_membros lm ON lm.liga_id = l.id
      LEFT JOIN usuarios u ON u.id = lm.usuario_id
      LEFT JOIN projetos p ON p.liga_id = l.id
      WHERE l.ativo = true
      GROUP BY l.id, lu.email
      ORDER BY l.nome
    `;
    res.json(ligas);
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 2: Reiniciar a API e testar**

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3001/ligas
```

Esperado: array de ligas com campos `diretores` (array), `projetos_ativos` (number) e `lider_email` (string).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/ligas.ts
git commit -m "feat: enrich GET /ligas with directors and active project count"
```

---

## Task 5: Adicionar endpoint de upload de imagem

**Files:**

- Modificar: `apps/api/src/routes/ligas.ts`

- [ ] **Step 1: Adicionar imports de multer, supabaseAdmin e AuthenticatedRequest no topo de `ligas.ts`**

Substitua a linha de import existente de `authenticate`:

```ts
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
```

Adicione após os imports existentes:

```ts
import multer from "multer";
import { supabaseAdmin } from "../config/supabase.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    if (!["image/jpeg", "image/png"].includes(file.mimetype)) {
      cb(new Error("Apenas PNG e JPG são permitidos."));
      return;
    }
    cb(null, true);
  },
});
```

- [ ] **Step 2: Adicionar o endpoint POST /:id/imagem após o GET /:id**

Adicione antes do bloco `// POST /ligas`:

```ts
// POST /ligas/:id/imagem — upload de imagem da liga
ligasRouter.post(
  "/:id/imagem",
  authenticate,
  requireRole("admin", "lider"),
  upload.single("imagem"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;

      if (!req.file) {
        res.status(400).json({ error: "Arquivo de imagem obrigatório." });
        return;
      }

      const ext = req.file.mimetype === "image/png" ? "png" : "jpg";
      const filename = `${id}-${Date.now()}.${ext}`;

      const { error: storageError } = await supabaseAdmin.storage
        .from("ligas-imagens")
        .upload(filename, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (storageError) throw storageError;

      const { data: urlData } = supabaseAdmin.storage.from("ligas-imagens").getPublicUrl(filename);

      const imagem_url = urlData.publicUrl;

      const [liga] = await sql`
        UPDATE ligas SET imagem_url = ${imagem_url}
        WHERE id = ${id}
        RETURNING *
      `;

      if (!liga) {
        res.status(404).json({ error: "Liga não encontrada." });
        return;
      }
      res.json(liga);
    } catch (err) {
      next(err);
    }
  },
);
```

- [ ] **Step 3: Testar o endpoint com curl**

```bash
curl -X POST http://localhost:3001/ligas/<liga-id>/imagem \
  -H "Authorization: Bearer <token>" \
  -F "imagem=@/path/to/test.jpg"
```

Esperado: objeto liga com `imagem_url` preenchida.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/ligas.ts
git commit -m "feat: add image upload endpoint for ligas"
```

---

## Task 6: Atualizar POST/PATCH /ligas para gerenciar diretores

**Files:**

- Modificar: `apps/api/src/routes/ligas.ts`

- [ ] **Step 1: Substituir o handler POST /ligas**

Substitua o bloco `// POST /ligas — criar liga`:

```ts
// POST /ligas — criar liga (admin)
// lider_id é resolvido automaticamente pelo usuário logado (admin que cria vira lider inicial)
ligasRouter.post("/", authenticate, requireRole("admin"), async (req, res, next) => {
  try {
    const { nome, descricao, diretores } = req.body as {
      nome: string;
      descricao?: string;
      diretores?: string[];
    };

    // Busca o usuarios.id do admin logado pelo email
    const [adminUsuario] = await sql`
      SELECT id FROM usuarios WHERE email = ${(req as AuthenticatedRequest).user!.email}
    `;
    if (!adminUsuario) {
      res.status(404).json({ error: "Usuário não encontrado." });
      return;
    }
    const lider_id = adminUsuario.id as string;

    const [liga] = await sql`
      INSERT INTO ligas (nome, descricao, lider_id)
      VALUES (${nome}, ${descricao ?? null}, ${lider_id})
      RETURNING *
    `;

    if (diretores && diretores.length > 0) {
      for (const usuario_id of diretores) {
        await sql`
          INSERT INTO liga_membros (liga_id, usuario_id, cargo)
          VALUES (${liga.id}, ${usuario_id}, 'Diretor')
          ON CONFLICT (liga_id, usuario_id)
          DO UPDATE SET cargo = 'Diretor'
        `;
        await sql`
          UPDATE usuarios SET role = 'lider' WHERE id = ${usuario_id}
        `;
      }
    }

    res.status(201).json(liga);
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 2: Substituir o handler PATCH /ligas/:id**

Substitua o bloco `// PATCH /ligas/:id — editar liga`:

```ts
// PATCH /ligas/:id — editar liga (admin ou lider)
ligasRouter.patch("/:id", authenticate, requireRole("admin", "lider"), async (req, res, next) => {
  try {
    const id = req.params["id"] as string;
    const { diretores, ...updates } = req.body as Record<string, unknown> & {
      diretores?: string[];
    };

    let liga;
    if (Object.keys(updates).length > 0) {
      const [updated] = await sql`
        UPDATE ligas SET ${sql(updates)} WHERE id = ${id} RETURNING *
      `;
      liga = updated;
    } else {
      const [existing] = await sql`SELECT * FROM ligas WHERE id = ${id}`;
      liga = existing;
    }

    if (!liga) {
      res.status(404).json({ error: "Liga não encontrada." });
      return;
    }

    if (diretores !== undefined) {
      // Remove diretores anteriores
      await sql`
        UPDATE liga_membros SET cargo = NULL
        WHERE liga_id = ${id} AND cargo = 'Diretor'
      `;
      // Adiciona novos diretores
      for (const usuario_id of diretores) {
        await sql`
          INSERT INTO liga_membros (liga_id, usuario_id, cargo)
          VALUES (${id}, ${usuario_id}, 'Diretor')
          ON CONFLICT (liga_id, usuario_id)
          DO UPDATE SET cargo = 'Diretor'
        `;
        await sql`
          UPDATE usuarios SET role = 'lider' WHERE id = ${usuario_id}
        `;
      }
    }

    res.json(liga);
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/ligas.ts
git commit -m "feat: handle directors in POST/PATCH ligas"
```

---

## Task 7: Adicionar endpoint GET /usuarios/busca

**Files:**

- Criar: `apps/api/src/routes/usuarios.ts`
- Modificar: `apps/api/src/routes/index.ts`

- [ ] **Step 1: Criar `apps/api/src/routes/usuarios.ts`**

```ts
import { Router, type Router as IRouter } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { sql } from "../config/db.js";

export const usuariosRouter: IRouter = Router();

// GET /usuarios/busca?email= — busca usuários por e-mail (autocomplete de diretores)
usuariosRouter.get(
  "/busca",
  authenticate,
  requireRole("admin", "lider"),
  async (req, res, next) => {
    try {
      const email = (req.query["email"] as string) ?? "";

      if (email.length < 2) {
        res.json([]);
        return;
      }

      const usuarios = await sql`
      SELECT id, nome, email FROM usuarios
      WHERE email ILIKE ${"%" + email + "%"}
      LIMIT 10
    `;

      res.json(usuarios);
    } catch (err) {
      next(err);
    }
  },
);
```

- [ ] **Step 2: Montar o router em `apps/api/src/routes/index.ts`**

Adicione o import e o mount:

```ts
import { Router, type Router as IRouter } from "express";
import { ligasRouter } from "./ligas.js";
import { projetosRouter } from "./projetos.js";
import { presencaRouter } from "./presenca.js";
import { salasRouter } from "./salas.js";
import { usuariosRouter } from "./usuarios.js";

export const router: IRouter = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.use("/ligas", ligasRouter);
router.use("/projetos", projetosRouter);
router.use("/presenca", presencaRouter);
router.use("/salas", salasRouter);
router.use("/usuarios", usuariosRouter);
```

- [ ] **Step 3: Testar o endpoint**

```bash
curl "http://localhost:3001/usuarios/busca?email=ana" \
  -H "Authorization: Bearer <token>"
```

Esperado: array de `{ id, nome, email }`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/usuarios.ts apps/api/src/routes/index.ts
git commit -m "feat: add GET /usuarios/busca endpoint for director autocomplete"
```

---

## Task 8: Criar componente LigaCard

**Files:**

- Criar: `apps/web/src/pages/ligas/LigaCard.tsx`

- [ ] **Step 1: Criar o arquivo**

```tsx
import type { Liga } from "@link-leagues/types";

interface LigaCardProps {
  liga: Liga;
}

export function LigaCard({ liga }: LigaCardProps) {
  const inicial = liga.nome.charAt(0).toUpperCase();
  const temImagem = Boolean(liga.imagem_url);
  const diretores = liga.diretores ?? [];
  const projetosAtivos = liga.projetos_ativos ?? 0;

  return (
    <div className="rounded-xl overflow-hidden shadow-sm bg-white border border-brand-gray">
      {/* Área da imagem */}
      <div className="relative h-32 w-full">
        {temImagem ? (
          <img src={liga.imagem_url!} alt={liga.nome} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-brand-yellow flex items-center justify-content-center justify-center">
            <span className="font-display font-bold text-5xl text-navy">{inicial}</span>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-4 space-y-2">
        <h3 className="font-display font-bold text-base text-navy leading-tight">{liga.nome}</h3>

        <p className="text-xs text-link-blue">
          <span className="font-semibold">Diretores:</span>{" "}
          {diretores.length > 0 ? diretores.map((d) => d.nome).join(", ") : "—"}
        </p>

        {projetosAtivos > 0 ? (
          <span className="inline-block bg-brand-yellow text-navy text-xs font-semibold rounded-full px-3 py-0.5">
            {projetosAtivos} {projetosAtivos === 1 ? "projeto ativo" : "projetos ativos"}
          </span>
        ) : (
          <span className="inline-block bg-brand-gray text-muted-foreground text-xs font-semibold rounded-full px-3 py-0.5">
            Nenhum projeto ativo
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Confirmar typecheck**

```bash
pnpm typecheck
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/ligas/LigaCard.tsx
git commit -m "feat: add LigaCard component"
```

---

## Task 9: Criar componente LigaSheet

**Files:**

- Criar: `apps/web/src/pages/ligas/LigaSheet.tsx`

O sheet usa os componentes shadcn `Sheet` e `DropdownMenu` já instalados em `apps/web/src/components/ui/`.

- [ ] **Step 1: Criar o arquivo**

```tsx
import { useState, useRef, useEffect } from "react";
import type { Liga } from "@link-leagues/types";
import { supabase } from "@/lib/supabase";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DiretorBusca {
  id: string;
  nome: string;
  email: string;
}

interface LigaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liga?: Liga; // se presente = edição, ausente = criação
  onSalvo: () => void;
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export function LigaSheet({ open, onOpenChange, liga, onSalvo }: LigaSheetProps) {
  const [nome, setNome] = useState(liga?.nome ?? "");
  const [diretores, setDiretores] = useState<DiretorBusca[]>([]);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<DiretorBusca[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(liga?.imagem_url ?? null);
  const [salvando, setSalvando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reinicia estado ao abrir/fechar
  useEffect(() => {
    if (open) {
      setNome(liga?.nome ?? "");
      setDiretores((liga?.diretores ?? []).map((d) => ({ id: d.id, nome: d.nome, email: "" })));
      setImagePreview(liga?.imagem_url ?? null);
      setImageFile(null);
      setBusca("");
      setResultados([]);
    }
  }, [open, liga]);

  // Busca usuários por e-mail
  useEffect(() => {
    if (busca.length < 2) {
      setResultados([]);
      return;
    }
    const timer = setTimeout(async () => {
      const token = await getToken();
      const res = await fetch(`/api/usuarios/busca?email=${encodeURIComponent(busca)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setResultados(await res.json());
    }, 300);
    return () => clearTimeout(timer);
  }, [busca]);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function adicionarDiretor(usuario: DiretorBusca) {
    if (diretores.some((d) => d.id === usuario.id)) return;
    setDiretores((prev) => [...prev, usuario]);
    setBusca("");
    setResultados([]);
  }

  function removerDiretor(id: string) {
    setDiretores((prev) => prev.filter((d) => d.id !== id));
  }

  async function handleSalvar() {
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      const token = await getToken();
      const body = {
        nome: nome.trim(),
        diretores: diretores.map((d) => d.id),
      };

      let ligaId: string;

      if (liga) {
        // Edição
        const res = await fetch(`/api/ligas/${liga.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Erro ao atualizar liga.");
        ligaId = liga.id;
      } else {
        // Criação — lider_id será o próprio usuário (preenchido pela API via req.user)
        const res = await fetch("/api/ligas", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Erro ao criar liga.");
        const novaLiga = await res.json();
        ligaId = novaLiga.id;
      }

      // Upload de imagem (se selecionada)
      if (imageFile) {
        const formData = new FormData();
        formData.append("imagem", imageFile);
        await fetch(`/api/ligas/${ligaId}/imagem`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      }

      onSalvo();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSalvando(false);
    }
  }

  const titulo = liga ? "Editar liga" : "Adicionar liga";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[480px] flex flex-col gap-0 p-0">
        <SheetHeader className="p-6 pb-4 border-b border-brand-gray">
          <SheetTitle className="font-display font-bold text-navy">{titulo}</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Preencha as informações da liga
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Imagem */}
          <div className="space-y-2">
            <Label className="text-navy font-semibold">Imagem da liga</Label>
            <div
              className="border-2 border-dashed border-brand-gray rounded-xl p-6 text-center cursor-pointer hover:border-link-blue transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-24 w-full object-cover rounded-lg"
                />
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Clique para fazer upload</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG até 2MB</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleImageSelect}
            />
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome" className="text-navy font-semibold">
              Nome da liga
            </Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Liga de Tecnologia"
            />
          </div>

          {/* Diretores */}
          <div className="space-y-2">
            <Label className="text-navy font-semibold">Diretores</Label>
            <div className="relative">
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por e-mail..."
              />
              {resultados.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-brand-gray rounded-xl shadow-md z-10 overflow-hidden">
                  {resultados.map((u) => (
                    <button
                      key={u.id}
                      className="w-full text-left px-4 py-2.5 hover:bg-muted text-sm flex items-center gap-3 border-b border-brand-gray last:border-0"
                      onClick={() => adicionarDiretor(u)}
                    >
                      <div className="h-7 w-7 rounded-full bg-navy text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {u.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-navy">{u.nome}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {diretores.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {diretores.map((d) => (
                  <span
                    key={d.id}
                    className="inline-flex items-center gap-1.5 bg-navy text-white text-xs rounded-full px-3 py-1"
                  >
                    {d.nome}
                    <button
                      onClick={() => removerDiretor(d.id)}
                      className="opacity-70 hover:opacity-100"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-brand-gray">
          <Button
            className="w-full bg-navy hover:bg-navy/90 text-white font-semibold"
            onClick={handleSalvar}
            disabled={salvando || !nome.trim()}
          >
            {salvando ? "Salvando..." : "Salvar liga"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Confirmar typecheck**

```bash
pnpm typecheck
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/ligas/LigaSheet.tsx
git commit -m "feat: add LigaSheet component for create/edit liga"
```

---

## Task 10: Reescrever LigasPage

**Files:**

- Modificar: `apps/web/src/pages/ligas/LigasPage.tsx`

- [ ] **Step 1: Reescrever o arquivo**

```tsx
import { useEffect, useState } from "react";
import type { Liga } from "@link-leagues/types";
import type { UserRole } from "@link-leagues/types";
import { supabase } from "@/lib/supabase";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LigaCard } from "./LigaCard";
import { LigaSheet } from "./LigaSheet";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export function LigasPage() {
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [ligaParaEditar, setLigaParaEditar] = useState<Liga | undefined>(undefined);

  async function carregarLigas() {
    const token = await getToken();
    const res = await fetch("/api/ligas", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setLigas(await res.json());
    setCarregando(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (!session) return;
      setUserEmail(session.user.email ?? null);

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("role")
        .eq("email", session.user.email)
        .single();

      setRole((usuario?.role as UserRole) ?? "membro");
    });

    carregarLigas();
  }, []);

  function abrirEditar() {
    // Lider edita a liga cujo lider_email corresponde ao seu e-mail
    const minha = ligas.find((l) => l.lider_email === userEmail);
    setLigaParaEditar(minha);
    setSheetOpen(true);
  }

  function abrirAdicionar() {
    setLigaParaEditar(undefined);
    setSheetOpen(true);
  }

  const canManage = role === "admin" || role === "lider";

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-navy">Ligas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ligas acadêmicas da Link Faculdade de Negócios
          </p>
        </div>

        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="border-brand-gray text-link-blue">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {role === "lider" && (
                <DropdownMenuItem onClick={abrirEditar}>Editar liga</DropdownMenuItem>
              )}
              {role === "admin" && (
                <DropdownMenuItem onClick={abrirAdicionar}>Adicionar liga</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Grid */}
      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando ligas...</p>
      ) : ligas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma liga cadastrada.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ligas.map((liga) => (
            <LigaCard key={liga.id} liga={liga} />
          ))}
        </div>
      )}

      {/* Sheet */}
      <LigaSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        liga={ligaParaEditar}
        onSalvo={carregarLigas}
      />
    </div>
  );
}
```

- [ ] **Step 2: Confirmar typecheck**

```bash
pnpm typecheck
```

Esperado: sem erros.

- [ ] **Step 3: Testar manualmente**

```bash
pnpm dev
```

Abra http://localhost:3000/ligas e verifique:

1. Grid de cards com dados reais
2. Como `membro`: botão `···` não aparece
3. Como `lider`: aparece "Editar liga" no dropdown
4. Como `admin`: aparece "Adicionar liga" no dropdown
5. Sheet abre ao clicar nas opções
6. Busca de diretores funciona com debounce de 300ms
7. Imagem de placeholder amarelo + inicial quando liga não tem imagem
8. Badge de projetos ativos correto

- [ ] **Step 4: Commit final**

```bash
git add apps/web/src/pages/ligas/LigasPage.tsx
git commit -m "feat: implement full Ligas page with card grid, dropdown and sheet"
```

---

## Verificação end-to-end

1. Acesse `/ligas` com um usuário `membro` → sem botão `···`, grid de cards visível
2. Acesse `/ligas` com um usuário `lider` → botão `···` com "Editar liga"; sheet pré-carrega dados da liga do lider
3. Acesse `/ligas` com um usuário `admin` → botão `···` com "Adicionar liga"; sheet em branco; ao salvar, novo card aparece no grid
4. Ao adicionar um diretor no sheet: o usuário passa a ter `role = 'lider'` e `cargo = 'Diretor'` em `liga_membros`
5. Upload de imagem: card exibe a foto; liga sem imagem exibe inicial em amarelo
6. Badge de projetos reflete contagem de projetos com status `aprovado` ou `em_andamento`
