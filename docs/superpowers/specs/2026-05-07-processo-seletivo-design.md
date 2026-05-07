# Processo Seletivo — Design Spec

**Data:** 2026-05-07
**Status:** Aprovado

---

## Contexto

As ligas acadêmicas da Link precisam de um sistema para conduzir processos seletivos de novos membros. Os diretores devem poder criar formulários externos para candidatos, definir critérios eliminatórios e de pontuação mínima, e visualizar os resultados com scoring automático. A integração com Typeform foi escolhida pela qualidade de UX para o candidato e robustez da API.

---

## Fluxo Principal

```
[Diretor na nossa UI]
  → cria processo seletivo com perguntas e critérios
  → nossa API chama Typeform Create API
  → Typeform retorna form_id + link público

[Diretor]
  → copia o link e compartilha externamente (WhatsApp, email etc.)

[Candidato]
  → preenche o formulário no Typeform

[Diretor na nossa UI]
  → clica em "Sincronizar" na página de resultados
  → nossa API busca respostas via Typeform Responses API
  → aplica lógica de scoring e eliminação no backend
  → exibe tabela de candidatos com status e pontuação
```

---

## Banco de Dados (Supabase)

### `processos_seletivos`

| Campo                      | Tipo        | Descrição                         |
| -------------------------- | ----------- | --------------------------------- |
| id                         | uuid        | PK                                |
| liga_id                    | uuid        | FK → ligas                        |
| nome                       | text        | Nome do processo                  |
| descricao                  | text        | Descrição opcional                |
| status                     | text        | `rascunho \| aberto \| encerrado` |
| typeform_form_id           | text        | ID do form no Typeform            |
| typeform_form_url          | text        | Link público do Typeform          |
| pontuacao_minima_aprovacao | int         | 0–100, padrão 70                  |
| created_by                 | uuid        | FK → usuarios                     |
| created_at                 | timestamptz |                                   |
| updated_at                 | timestamptz |                                   |

### `processo_perguntas`

| Campo                | Tipo    | Descrição                                                   |
| -------------------- | ------- | ----------------------------------------------------------- |
| id                   | uuid    | PK                                                          |
| processo_id          | uuid    | FK → processos_seletivos                                    |
| typeform_field_id    | text    | ID do campo no Typeform                                     |
| titulo               | text    | Texto da pergunta                                           |
| tipo                 | text    | `texto \| multipla_escolha \| nota_1_10 \| sim_nao`         |
| peso                 | int     | 0–100 (soma por processo = 100)                             |
| eliminatoria         | boolean | Se falha nessa pergunta elimina                             |
| nota_minima          | int     | Para tipo `nota_1_10`                                       |
| opcoes_eliminatorias | jsonb   | Para tipo `multipla_escolha` — lista de opções que eliminam |
| ordem                | int     | Posição no formulário                                       |

### `processo_candidatos`

| Campo                | Tipo        | Descrição                             |
| -------------------- | ----------- | ------------------------------------- |
| id                   | uuid        | PK                                    |
| processo_id          | uuid        | FK → processos_seletivos              |
| typeform_response_id | text        | ID da resposta no Typeform            |
| nome                 | text        | Nome do candidato                     |
| email                | text        | Email do candidato                    |
| pontuacao_total      | int         | 0–100 calculado                       |
| status               | text        | `pendente \| aprovado \| reprovado`   |
| respostas            | jsonb       | Snapshot das respostas individuais    |
| motivo_reprovacao    | text        | Qual critério eliminou (se reprovado) |
| submitted_at         | timestamptz |                                       |
| sincronizado_at      | timestamptz | Última sincronização                  |

---

## API (Express)

### Rotas

```
POST   /api/processos-seletivos
GET    /api/processos-seletivos
GET    /api/processos-seletivos/:id
PUT    /api/processos-seletivos/:id        (apenas status rascunho)
POST   /api/processos-seletivos/:id/publicar
POST   /api/processos-seletivos/:id/encerrar
GET    /api/processos-seletivos/:id/resultados
POST   /api/processos-seletivos/:id/sincronizar
```

### Autenticação e Papéis

- `authenticate` em todas as rotas
- `requireRole("staff", "diretor")` para criar/editar/publicar/encerrar
- Diretores só veem processos da própria liga (`liga_id` validado no backend)
- Staff vê todos

### Integração Typeform

**Criação (`POST /api/processos-seletivos`):**

1. Salva o processo e perguntas no Supabase
2. Chama `POST https://api.typeform.com/forms` com as perguntas mapeadas
3. Salva `typeform_form_id` e `typeform_form_url` retornados
4. Retorna processo completo com link

**Sincronização (`POST /api/processos-seletivos/:id/sincronizar`):**

1. Chama `GET https://api.typeform.com/forms/:form_id/responses`
2. Para cada resposta nova (não em `processo_candidatos`):
   - Extrai nome, email, respostas
   - Aplica lógica de scoring (ver abaixo)
   - Salva em `processo_candidatos`
3. Retorna contagem de novos candidatos sincronizados

### Lógica de Scoring

```
para cada candidato:
  reprovado = false
  pontuacao = 0

  para cada pergunta:
    se pergunta.eliminatoria:
      se tipo == "sim_nao" e resposta == "Não":
        reprovado = true; motivo = pergunta.titulo
      se tipo == "multipla_escolha" e resposta in opcoes_eliminatorias:
        reprovado = true; motivo = pergunta.titulo
      se tipo == "nota_1_10" e resposta < nota_minima:
        reprovado = true; motivo = pergunta.titulo

    se tipo in ["nota_1_10", "multipla_escolha"] e peso > 0:
      pontuacao += valor_normalizado(resposta) * peso / 100

  se reprovado:
    status = "reprovado"
  senão se pontuacao >= processo.pontuacao_minima_aprovacao:
    status = "aprovado"
  senão:
    status = "pendente"
```

---

## Frontend

### Rotas

| Rota                      | Componente             | Acesso         |
| ------------------------- | ---------------------- | -------------- |
| `/processo-seletivo`      | `ProcessoSeletivoPage` | staff, diretor |
| `/processo-seletivo/novo` | `NovoProcessoPage`     | staff, diretor |
| `/processo-seletivo/:id`  | `ProcessoDetalhe`      | staff, diretor |

### Página `/processo-seletivo`

- Lista de processos com card por processo: nome, liga, status (badge), data de criação, link de acesso rápido
- Botão "Novo Processo" (staff e diretor)
- Filtro por status

### Wizard `/processo-seletivo/novo` — 3 etapas

**Etapa 1 — Informações básicas**

- Nome do processo
- Descrição
- Liga (staff seleciona qualquer; diretor tem a sua pré-selecionada)
- Pontuação mínima para aprovação (slider ou input 0–100)

**Etapa 2 — Perguntas**

- Lista de perguntas adicionadas (drag para reordenar)
- Botão "Adicionar pergunta" → seleciona tipo
- Por tipo, campos extras:
  - `nota_1_10`: peso (%), nota mínima, toggle eliminatória
  - `multipla_escolha`: opções de texto, quais opções eliminam, peso (%)
  - `sim_nao`: toggle "Não é eliminatório"
  - `texto`: apenas título (sem scoring)
- Indicador de soma de pesos (barra de progresso, deve atingir 100%)

**Etapa 3 — Revisão**

- Resumo do processo e lista de perguntas
- Botão "Criar Rascunho" ou "Criar e Publicar"
- Após criação: exibe o link do Typeform com botão de copiar

### Página `/processo-seletivo/:id` — Resultados

- Header: nome, status, liga, link do Typeform (copiável)
- Botões de ação: "Sincronizar Respostas", "Encerrar Processo" (se aberto)
- Estatísticas: total de candidatos, aprovados, reprovados, pendentes
- Tabela de candidatos:
  - Colunas: Nome, Email, Pontuação, Status (badge), Data de submissão
  - Filtros: status
  - Clique na linha → Drawer lateral com todas as respostas individuais
- Botão "Exportar CSV"

---

## Variáveis de Ambiente

Adicionar em `apps/api/.env` e `apps/api/.env.example`:

```env
TYPEFORM_API_KEY=tfp_xxxxx
```

---

## Tipos TypeScript

Adicionar em `packages/types/src/processo-seletivo.ts`:

```ts
export type ProcessoStatus = "rascunho" | "aberto" | "encerrado";
export type PerguntaTipo = "texto" | "multipla_escolha" | "nota_1_10" | "sim_nao";
export type CandidatoStatus = "pendente" | "aprovado" | "reprovado";

export interface ProcessoSeletivo { ... }
export interface ProcessoPergunta { ... }
export interface ProcessoCandidato { ... }
export interface CreateProcessoInput { ... }
```

---

## Verificação (Como Testar)

1. Criar processo com perguntas via UI → verificar que form aparece no Typeform com as perguntas corretas
2. Preencher o formulário como candidato (link público)
3. Clicar "Sincronizar" → verificar que candidato aparece na tabela
4. Testar critérios eliminatórios: responder abaixo da nota mínima → status deve ser `reprovado`
5. Testar pontuação: respostas acima do mínimo → status `aprovado` ou `pendente` conforme pontuação total
6. Exportar CSV → verificar que contém todos os campos
7. `npm run typecheck` sem erros
