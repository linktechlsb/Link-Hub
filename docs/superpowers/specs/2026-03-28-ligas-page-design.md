# Design: Página de Ligas

**Data:** 2026-03-28
**Status:** Aprovado

---

## Contexto

A página `/ligas` está atualmente em branco ("Módulo em desenvolvimento"). O objetivo é implementar a tela completa de listagem de ligas com cards visuais, dropdown de ações para lider/admin, e um sheet para criação/edição de ligas — incluindo upload de imagem e seleção de diretores por e-mail.

---

## Visual aprovado

### Grid de cards

- Layout responsivo: 3 colunas no desktop, 2 no tablet, 1 no mobile (Tailwind `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)
- Cada card exibe:
  - **Imagem** (aspect-video / `object-cover`): foto da liga quando cadastrada; placeholder amarelo (`#FEC641`) com inicial do nome da liga em navy quando não há imagem
  - **Nome da liga** — fonte display, bold, navy
  - **Diretores:** lista de nomes dos membros com `cargo = 'Diretor'`
  - **Badge de projetos:** amarelo com contagem ("3 projetos ativos") ou cinza ("Nenhum projeto ativo")
- Cards sem nenhum botão interno

### Dropdown de ações

- Botão `···` (MoreHorizontal do Lucide) no canto superior direito do header da página
- Visível apenas para `lider` e `admin`
- Opções:
  - **Editar liga** — visível apenas para `lider` (edita a própria liga do lider logado)
  - **Adicionar liga** — visível apenas para `admin`
- Ao clicar em qualquer opção, abre o Sheet correspondente
- Para o `lider`: o sheet de edição pré-carrega os dados da liga à qual ele pertence (`liga_id` vindo do perfil do usuário logado)

### Sheet de criar/editar

- Slide-in pela direita (shadcn `Sheet` com `side="right"`)
- Campos:
  1. **Imagem da liga** — área de upload (drag-and-drop / clique), aceita PNG/JPG até 2MB
  2. **Nome da liga** — input de texto
  3. **Diretores** — campo de busca por e-mail que consulta a base de usuários; resultados em dropdown; ao adicionar um diretor: `cargo = 'Diretor'` em `liga_membros` e `role = 'lider'` em `usuarios`
- Botão "Salvar liga" no rodapé do sheet

---

## Mudanças no banco de dados

### Migration nova: `003_ligas_imagem.sql`

```sql
ALTER TABLE ligas ADD COLUMN imagem_url TEXT;
```

> `liga_membros.cargo` já existe (migration 001). Nenhuma outra alteração de schema necessária.

---

## Mudanças na API

### `GET /ligas` — query enriquecida

Atualmente retorna apenas `SELECT * FROM ligas`. Precisa retornar também:

- `diretores`: array de `{ id, nome }` dos membros com `cargo = 'Diretor'`
- `projetos_ativos`: count de projetos com `status IN ('aprovado', 'em_andamento')`
- `imagem_url` já faz parte de `ligas.*` após a migration

Query resultante (SQL com `postgres` tagged template):

```sql
SELECT
  l.*,
  COALESCE(
    json_agg(
      json_build_object('id', u.id, 'nome', u.nome)
    ) FILTER (WHERE lm.cargo = 'Diretor'),
    '[]'
  ) AS diretores,
  COUNT(p.id) FILTER (
    WHERE p.status IN ('aprovado', 'em_andamento')
  ) AS projetos_ativos
FROM ligas l
LEFT JOIN liga_membros lm ON lm.liga_id = l.id
LEFT JOIN usuarios u ON u.id = lm.usuario_id
LEFT JOIN projetos p ON p.liga_id = l.id
WHERE l.ativo = true
GROUP BY l.id
ORDER BY l.nome
```

### `POST /api/ligas/:id/imagem` — novo endpoint de upload

- Aceita `multipart/form-data` com campo `imagem`
- Faz upload para Supabase Storage bucket `ligas-imagens` usando `supabaseAdmin`
- Salva a URL pública em `ligas.imagem_url`
- Requer `authenticate` + `requireRole('admin', 'lider')`
- Usar `multer` (memoryStorage) para parsear o multipart

### `POST /ligas` e `PATCH /ligas/:id` — corpo estendido

- Aceitar `nome`, `imagem_url` (opcional), `diretores: string[]` (array de `usuario_id`)
- Ao salvar diretores: inserir/atualizar `liga_membros` com `cargo = 'Diretor'` e atualizar `usuarios.role = 'lider'` para cada diretor

### `GET /usuarios/busca?email=` — novo endpoint de busca

- Busca usuários por e-mail (ilike) para o autocomplete de diretores no sheet
- Requer `authenticate` + `requireRole('admin', 'lider')`
- Retorna `[{ id, nome, email }]`

---

## Mudanças nos tipos compartilhados (`packages/types/src/liga.ts`)

```ts
export interface Liga {
  // campos existentes...
  imagem_url?: string; // novo
  diretores?: { id: string; nome: string }[]; // novo (computed)
  projetos_ativos?: number; // novo (computed)
}

export interface LigaMembro {
  // campos existentes...
  cargo?: string; // já existe na tabela, faltava no tipo
}
```

---

## Mudanças no frontend

### Componentes novos

- `apps/web/src/pages/ligas/LigaCard.tsx` — card individual da liga
- `apps/web/src/pages/ligas/LigaSheet.tsx` — sheet de criar/editar

### `LigasPage.tsx` — reescrita completa

- Fetch de `GET /api/ligas` ao montar
- Renderiza grid responsivo de `LigaCard`
- Header com título + botão `···` condicional ao role do usuário

### Shadcn components a instalar

```bash
pnpm dlx shadcn@latest add dropdown-menu  # dentro de apps/web
pnpm dlx shadcn@latest add sheet          # dentro de apps/web
```

### Upload de imagem no frontend

- Ao selecionar arquivo no sheet: `POST /api/ligas/:id/imagem` com `FormData`
- Em modo "Adicionar" (liga nova): primeiro cria a liga (`POST /ligas`), depois faz o upload da imagem

---

## Supabase Storage

- Criar bucket `ligas-imagens` (público) no painel do Supabase
- Política: leitura pública, escrita apenas via service role (API)
- URL pública: `https://<project>.supabase.co/storage/v1/object/public/ligas-imagens/<filename>`

---

## Verificação (testes manuais)

1. Acessar `/ligas` — ver grid de cards com dados reais
2. Como `membro`: botão `···` não aparece
3. Como `lider`: botão `···` aparece com opção "Editar liga" apenas
4. Como `admin`: botão `···` aparece com "Editar liga" e "Adicionar liga"
5. Clicar "Adicionar liga" → sheet abre, preencher nome, buscar diretor por e-mail, adicionar, fazer upload de imagem, salvar → card aparece no grid
6. Diretor adicionado tem `role = 'lider'` e `cargo = 'Diretor'` em `liga_membros`
7. Liga sem imagem exibe placeholder amarelo com inicial
8. Badge de projetos reflete contagem correta
