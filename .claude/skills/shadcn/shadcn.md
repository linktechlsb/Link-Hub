---
name: shadcn
description: Adicionar e usar componentes shadcn/ui no projeto Link Leagues. Use quando o usuário pedir para instalar, adicionar ou usar um componente shadcn/ui (ex: "adiciona um dialog", "instala o shadcn calendar", "usa o shadcn table").
---

# Skill: shadcn/ui no Link Leagues

## Como adicionar um componente shadcn

**Sempre execute dentro de `apps/web`:**

```bash
cd apps/web && npx shadcn@latest add <componente>
```

Exemplos:

```bash
npx shadcn@latest add dialog
npx shadcn@latest add table
npx shadcn@latest add calendar
npx shadcn@latest add sidebar
npx shadcn@latest add form
npx shadcn@latest add select
```

Use a flag `--yes` para aceitar automaticamente sem prompts interativos.

## Onde ficam os componentes

- Componentes instalados: `apps/web/src/components/ui/`
- Hooks gerados: `apps/web/src/hooks/`
- Configuração: `apps/web/components.json`

## Regras deste projeto

1. **Nunca redefina** componentes shadcn que já existem em `apps/web/src/components/ui/`
2. **Verifique antes** de instalar se o componente já existe na pasta acima
3. Se um componente for usado em **múltiplos apps**, promova para `packages/ui/src/` e re-exporte de `packages/ui/src/index.ts`
4. Use sempre o helper `cn()` de `@/lib/utils` para classes Tailwind condicionais

## Design system — tokens de marca

Ao usar componentes shadcn, aplique sempre os tokens de marca do projeto:

| Token semântico    | Mapeamento          | Classe Tailwind direta                |
| ------------------ | ------------------- | ------------------------------------- |
| `primary`          | Navy `#10284E`      | `bg-navy` / `text-navy`               |
| `secondary`        | Link Blue `#546484` | `bg-link-blue` / `text-link-blue`     |
| `accent`           | Amarelo `#FEC641`   | `bg-brand-yellow`                     |
| `muted` / `border` | Cinza `#EAEAEA`     | `bg-brand-gray` / `border-brand-gray` |

## Ícones

Use **somente Lucide React** (`lucide-react`) — nunca instale outras bibliotecas de ícones.

## Sidebar — componente disponível

O componente `Sidebar` do shadcn já está instalado em `apps/web/src/components/ui/sidebar.tsx`.

Imports disponíveis:

```tsx
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
```

O layout atual da aplicação usa `apps/web/src/layouts/AppLayout.tsx` — integre o `SidebarProvider` nele se for migrar para o sidebar shadcn.
