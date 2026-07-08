# Design: Tour Guiado de Onboarding (Spotlight)

**Data:** 2026-07-07
**Status:** Aguardando aprovação

## Objetivo

Apresentar a plataforma a todos os usuários por meio de um tour guiado (spotlight) sobre a interface real: um overlay escurece a tela, um anel amarelo destaca cada item da sidebar e um balão explica o que a página faz. O tour dispara automaticamente **uma vez** no próximo login de cada usuário (novos e existentes) e pode ser revisto manualmente depois.

## Decisões tomadas

| Decisão            | Escolha                                                            |
| ------------------ | ------------------------------------------------------------------ |
| Formato            | Tour spotlight sobre a interface real (opção C do brainstorm)      |
| Gatilho            | Automático no primeiro acesso após o lançamento; depois só manual  |
| Público            | Todos os usuários existentes e novos veem uma vez                  |
| Conteúdo por papel | Passos adaptados ao papel (membro, líder, diretor, staff)          |
| Persistência       | Banco de dados — coluna em `usuarios`, via `PATCH /usuarios/me`    |
| Mobile             | Tour adaptado: abre o menu automaticamente e destaca os itens nele |
| Mecanismo          | Biblioteca **driver.js** estilizada com os tokens do DESIGN.md     |

## Experiência do usuário

1. Usuário faz login e cai no `AppLayout`. Se `usuarios.onboarding_concluido_em` for nulo, o tour inicia após a sidebar montar.
2. Passo 0 é um balão centralizado de boas-vindas ("Boas-vindas à Link Leagues Platform..."), sem elemento destacado.
3. Cada passo seguinte destaca um item da sidebar com anel amarelo `#FEC641` (2px) e mostra um balão com: contador "Passo X de Y", título da página, descrição de 1–2 frases (imperativo educado, PT-BR), barra de progresso fina amarela, "Pular tour" à esquerda e "Anterior/Próximo" à direita. O último passo troca "Próximo" por "Concluir".
4. Navegação por clique e teclado (← → avançam/voltam, Esc sai). Sair, pular ou concluir grava a conclusão — o tour não reaparece sozinho.
5. O tour pode ser revisto por um item "Rever tour da plataforma" no menu do usuário (`nav-user.tsx`).

### Passos por papel

A sequência é gerada a partir da mesma lógica de visibilidade da sidebar (`app-sidebar.tsx`):

- **Todos:** Boas-vindas, Home, Ligas, Projetos, Tarefas, Eventos (calendário), Mural, Ranking.
- **Staff/diretor/líder:** passo extra sobre "Solicitar eventos".
- **Staff/diretor:** passo sobre Gerenciamento. (Formulários está `disabled: true` — fora do tour até ser habilitado.)
- **Staff:** passo sobre Super Admin.
- **Dados:** a permissão é assíncrona (`/api/analytics/acesso`); o passo só entra se o item estiver no DOM no momento em que o tour inicia.

Regra geral: um passo cujo seletor não encontra elemento no DOM é filtrado silenciosamente — o tour nunca quebra por diferença de papel ou permissão.

### Mobile

Em telas pequenas a sidebar vira menu off-canvas. O tour, ao iniciar em mobile, abre o menu programaticamente (via estado do componente `Sidebar` do shadcn), mantém-no aberto durante os passos de navegação e reposiciona os balões (driver.js já reposiciona por padrão; validar em 375px).

## Visual (aprovado no mockup v2)

Segue os tokens do `apps/web/DESIGN.md` nos dois temas:

- **Popover claro:** fundo `#FFFFFF`, borda `#E4E4E4`, raio 8px, sombra discreta (exceção documentada da Regra Flat). Texto corpo em tinta `#0A0A0A`, secundário `#737373`.
- **Popover escuro:** fundo `#1F2224`, borda hairline `#2B2D31`, texto branco, secundário branco a 60%.
- **Botões:** "Próximo/Concluir" primário em tinta `#0A0A0A` com texto branco (invertido no dark: branco com texto tinta); "Anterior" outline; "Pular tour" ghost. Raio 6px. A Regra do Navy na Sidebar se mantém — nenhum botão navy.
- **Destaque:** anel `box-shadow: 0 0 0 2px #FEC641` no item da sidebar — amarelo colado a informação de estado (passo atual), conforme a Regra do Amarelo Cirúrgico.
- **Progresso:** barra de 3px em pílula, trilha `#E4E4E4`/`#2B2D31`, preenchimento `#FEC641`.
- **Tipografia:** Inter em tudo (Regra da Voz Única). Título 15px/700, corpo 14px/400, contador 12px/500.
- **Motion:** transições de 150–250ms ease-out entre passos; sob `prefers-reduced-motion`, transições instantâneas.

## Arquitetura

### Frontend (`apps/web`)

- **Dependência nova:** `driver.js` (~5kb gzip, sem dependências).
- **`src/lib/onboarding-tour.ts`** — definição dos passos: array de `{ seletor, titulo, descricao, papeis? }`. Fonte única do conteúdo do tour.
- **`src/hooks/use-onboarding-tour.ts`** — hook que: lê o papel (`useUser`) e o estado de conclusão (`GET /usuarios/me`); filtra os passos por papel e presença no DOM; instancia o driver.js com a config estilizada; expõe `iniciarTour()` para o replay manual; ao concluir/pular, chama `PATCH /usuarios/me` com `onboarding_concluido_em`.
- **CSS** — overrides das classes do driver.js (`.driver-popover` etc.) em CSS do projeto, usando os tokens dos temas claro/escuro existentes.
- **Integração:** disparo automático no `AppLayout` (após sidebar montar); item "Rever tour da plataforma" no `nav-user.tsx`.
- **Atributos de âncora:** itens da sidebar ganham `data-tour="<slug>"` para seletores estáveis (não depender de texto ou ordem).

### Backend (`apps/api` + banco)

- **Migração:** `ALTER TABLE usuarios ADD COLUMN onboarding_concluido_em timestamptz;` (nulo = ainda não viu).
- **API:** estender o `PATCH /usuarios/me` existente para aceitar `onboarding_concluido_em` (o handler grava o timestamp do servidor, não confia no cliente); `GET /usuarios/me` passa a retornar o campo.
- **Tipos:** adicionar o campo à interface de usuário em `packages/types/src/user.ts`.

## Tratamento de erros e bordas

- **Falha ao gravar conclusão:** não bloqueia o usuário; sem retry imediato — o tour reaparece no próximo login (comportamento aceitável e simples).
- **Falha ao ler o estado:** na dúvida, **não** mostra o tour (evita incomodar usuário recorrente por erro transitório).
- **Elemento ausente** (papel sem permissão, item desabilitado, DOM ainda não montado): passo filtrado, tour segue.
- **Troca de tema durante o tour:** popover usa variáveis CSS dos temas — acompanha automaticamente.
- **Redimensionamento/scroll:** driver.js reposiciona nativamente.

## Testes

- Unitários (vitest, já usado no projeto): filtragem de passos por papel; filtragem por elemento ausente; chamada de `PATCH` ao concluir/pular.
- Manual: fluxo completo nos dois temas, desktop e mobile (375px), teclado (← → Esc), `prefers-reduced-motion`, replay pelo menu do usuário.

## Fora de escopo

- Tours contextuais por página (dicas dentro de cada módulo).
- Checklist de ativação ("complete seu perfil", etc.).
- Página "Guia da Plataforma" em grade (opção B — pode virar projeto futuro).
