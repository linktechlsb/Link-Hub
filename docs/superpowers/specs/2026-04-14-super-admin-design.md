# SuperAdmin Page — Design Spec

**Data:** 2026-04-14  
**Status:** Aprovado pelo usuário

---

## Contexto

A rota `/super-admin` já existe no router e no AppLayout (visível somente para `role === "admin"`), mas a página é um placeholder vazio. O objetivo é construir um painel completo de administração com três funcionalidades: gerenciamento de usuários, gerenciamento de ligas (com membros) e uma tabela de visão geral do sistema.

---

## Layout

Página única com scroll (sem sub-rotas). Estrutura vertical:

```
[Stats row: 4 cards — Usuários | Ligas Ativas | Projetos | Presença Geral]

[Gestão de Usuários]
  Search + botão "Novo Usuário"
  Table: Nome | Email | Role | Liga | Ações (Editar / Remover)

[Gestão de Ligas]
  Botão "Nova Liga"
  Table: Liga | Líder | Membros | Status | Ações (Editar / Membros / Arquivar)

[Visão Geral — Todos os Usuários]
  Table: Nome Completo | Email Estudantil | Role | Liga | Presença
```

---

## Componentes Frontend

### Novos
| Arquivo | Descrição |
|---------|-----------|
| `apps/web/src/pages/super-admin/SuperAdminPage.tsx` | Página principal (substitui placeholder) |
| `apps/web/src/pages/super-admin/UsuarioSheet.tsx` | Sheet lateral para criar/editar usuário |
| `apps/web/src/pages/super-admin/LigaMembrosSheet.tsx` | Sheet lateral para gerenciar membros de uma liga |

### Reutilizados
| Arquivo | Uso |
|---------|-----|
| `apps/web/src/pages/ligas/LigaSheet.tsx` | Criar/editar liga (já funcional) |

---

## UsuarioSheet

Campos:
- **Nome completo** — text input
- **Email estudantil** — email input (desabilitado ao editar)
- **Role** — select: `membro | lider | professor | admin`
- **Liga** — select opcional (lista das ligas ativas)

Ao criar: `POST /usuarios`  
Ao editar: `PATCH /usuarios/:id`

---

## LigaMembrosSheet

- Lista os membros atuais da liga com botão "Remover" por membro
- Campo de busca por email (autocomplete via `GET /usuarios/busca`) para adicionar novos membros
- Campo de cargo ao adicionar (text input, ex: "Diretor", "Membro")

Adicionar: `POST /ligas/:id/membros`  
Remover: `DELETE /ligas/:id/membros/:userId`

---

## Novos Endpoints API

Todos em `apps/api/src/routes/usuarios.ts` e `apps/api/src/routes/ligas.ts`.

### usuarios.ts
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `GET` | `/usuarios` | admin | Lista todos os usuários |
| `POST` | `/usuarios` | admin | Cria usuário no Supabase Auth + tabela |
| `PATCH` | `/usuarios/:id` | admin | Atualiza nome e/ou role |
| `DELETE` | `/usuarios/:id` | admin | Remove do Supabase Auth + tabela |
| `GET` | `/usuarios/visao-geral` | admin | Usuários com liga e % de presença |

### ligas.ts
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `POST` | `/ligas/:id/membros` | admin | Adiciona membro à liga |
| `DELETE` | `/ligas/:id/membros/:userId` | admin | Remove membro da liga |

---

## Presença na Visão Geral

Calculada por usuário:
```sql
COUNT(p) FILTER (WHERE p.status = 'presente') * 100 / NULLIF(COUNT(p), 0)
```
Coloração: verde `#16a34a` ≥ 80%, amarelo `#d97706` 60–79%, vermelho `#dc2626` < 60%

---

## Stats Cards

Calculados via queries na rota `GET /usuarios/visao-geral` ou separadamente:
- **Usuários:** `COUNT(*) FROM usuarios`
- **Ligas Ativas:** `COUNT(*) FROM ligas WHERE ativo = true`
- **Projetos:** `COUNT(*) FROM projetos`
- **Presença Geral:** média de todas as presenças do sistema

---

## Verificação

1. Login como admin → `/super-admin` carrega com dados reais
2. Criar usuário → aparece na tabela de Gestão de Usuários
3. Editar role de usuário → atualiza na tabela
4. Remover usuário → desaparece da tabela
5. Criar liga via LigaSheet → aparece na tabela de Gestão de Ligas
6. Editar membros via LigaMembrosSheet → adicionar e remover membros
7. Arquivar liga → desaparece da tabela (ativo = false)
8. Visão Geral mostra % de presença com cores corretas
