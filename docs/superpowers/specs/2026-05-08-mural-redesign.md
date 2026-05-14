# Mural Page Redesign

**Data:** 2026-05-08

## Contexto

A página de Mural precisa ser atualizada para seguir o novo design system (padrões estabelecidos em AgendaPage, LigasPage, etc.) e ganhar duas novas funcionalidades: controle de visibilidade de postagens (pública vs. só a liga) e filtros de feed.

---

## Funcionalidades

### 1. Botão "Criar Postagem" no header

- Substituir qualquer trigger atual por um botão navy no cabeçalho da página (padrão: `font-plex-mono text-[10px] uppercase tracking-[0.14em]` + `bg-navy text-white px-4 py-2 rounded`)
- Visível apenas para `staff` e `diretor`
- Ao clicar, abre o `Dialog` de criação

### 2. Modal de criação — estilo LinkedIn

**Estado: Diretor / Membro**

- Linha de autor: avatar + nome + nome da liga (texto fixo, não editável) + pill de visibilidade
- Pill de visibilidade: dropdown com duas opções — `🌐 Pública` e `🔒 Só a liga`
- Textarea de conteúdo
- Botão de imagem (mantém lógica atual de upload)
- Botões Cancelar / Publicar

**Estado: Staff**

- Linha de autor: avatar + nome + **pill de liga** (clicável, abre dropdown com todas as ligas) + pill de visibilidade
- Mesmo corpo e footer do estado Diretor

**Comportamento dos pills:**

- Ambos usam um `Popover` simples com lista de opções
- Pill usa borda outline estilo LinkedIn: `border border-navy/25 rounded-full px-3 py-0.5 text-[9px] font-bold text-link-blue cursor-pointer`
- Padrão inicial de visibilidade: `"publica"`

### 3. Filtro de feed

Abas fixas abaixo do título da página:

- **"Públicas"** — posts com `visibilidade = "publica"` de todas as ligas
- **"Minha Liga"** — todos os posts da liga do usuário (públicos + só-liga)

Staff vê ambas as abas; na aba "Minha Liga" vê todos os posts da liga que ele filtrar.

### 4. Badge de visibilidade nos posts do feed

Cada card de post exibe um badge pequeno:

- `Pública` — `bg-link-blue/10 text-link-blue`
- `Liga` (só a liga) — `bg-brand-yellow/20 text-yellow-700`

---

## Mudanças Técnicas

### A. Banco de dados — nova coluna

```sql
ALTER TABLE posts
ADD COLUMN visibilidade TEXT NOT NULL DEFAULT 'publica'
CHECK (visibilidade IN ('publica', 'liga'));
```

### B. `packages/types/src/mural.ts`

Adicionar campo ao `Post`:

```ts
visibilidade: "publica" | "liga";
```

Atualizar `CreatePostInput`:

```ts
visibilidade: "publica" | "liga";
```

### C. API — `apps/api/src/routes/mural.ts`

**GET /mural** — novo query param `filtro: "publica" | "liga"`

- `filtro=publica`: retorna somente posts com `visibilidade = 'publica'` (sem restrição de liga)
- `filtro=liga`: retorna posts da liga do usuário (ambas as visibilidades)
- Regra de privacidade: posts com `visibilidade = 'liga'` só aparecem para membros/diretores/staff da liga correspondente
- Remove o query param `liga_id` que o frontend usa hoje (substituído por `filtro`)

**POST /mural** — aceitar e persistir `visibilidade`:

```ts
const { liga_id, conteudo, imagem_url, visibilidade } = req.body as {
  liga_id?: string;
  conteudo?: string;
  imagem_url?: string;
  visibilidade?: "publica" | "liga";
};
```

Inserção passa `visibilidade ?? 'publica'` para o banco.

### D. Frontend — `apps/web/src/pages/mural/MuralPage.tsx`

Reescrever o componente seguindo o novo design system:

1. **Layout da página**

   ```tsx
   <div className="p-8 max-w-3xl mx-auto">
     <div className="mb-6 flex items-center justify-between">
       <div>
         <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-link-blue mb-1">
           Plataforma
         </p>
         <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">Mural</h1>
       </div>
       {podePublicar && <button onClick={abrirModal}>+ Criar postagem</button>}
     </div>
     {/* abas de filtro */}
     {/* feed */}
   </div>
   ```

2. **Abas de filtro** — `useState<"publica" | "liga">("publica")`; mudar aba dispara novo fetch com `?filtro=`

3. **Modal** — `Dialog` existente, refatorar internamente:

   - Componente `VisibilidadePill` para o dropdown de visibilidade
   - Componente `LigaPill` para staff (dropdown de ligas)
   - Remover `<select>` de liga para não-staff

4. **Card de post** — adicionar badge de visibilidade ao header do post

---

## Verificação

1. **Diretor cria post** → liga preenchida automaticamente, pill de visibilidade disponível, post salvo com campo correto
2. **Staff cria post** → pode selecionar qualquer liga via pill, definir visibilidade
3. **Filtro "Públicas"** → exibe posts públicos de todas as ligas, não exibe posts `liga` de outras ligas
4. **Filtro "Minha Liga"** → exibe todos os posts da liga do usuário (públicos e `liga`)
5. **Usuário de outra liga** → não vê posts com `visibilidade = 'liga'` de ligas que não pertence
6. **Badge no feed** → posts marcados corretamente como "Pública" ou "Liga"
