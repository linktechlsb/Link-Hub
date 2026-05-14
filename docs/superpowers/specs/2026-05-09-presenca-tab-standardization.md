# Spec: Padronização Visual da Aba Presença

**Data:** 2026-05-09  
**Arquivo:** `apps/web/src/pages/gerenciamento/AbaPresenca.tsx`  
**Escopo:** Apenas CSS — nenhuma lógica ou funcionalidade alterada

---

## Problema

A aba Presença usa um estilo de tabela diferente das outras abas do Gerenciamento (Membros, Recursos, Receita). Especificamente:

- Usa um container `border border-navy/15 overflow-hidden` ao redor da tabela
- O cabeçalho da tabela tem fundo `bg-navy/[0.02]` com `border-b border-navy/15`
- As linhas usam `border-navy/10`
- Os textos de cabeçalho usam `text-navy/60` em vez de `text-foreground/40`
- A coluna sticky usa `bg-white` criando artefato ao rolar em modo escuro

---

## Solução

Alinhar o estilo da tabela com o padrão das outras abas do Gerenciamento.

### Mudanças

| Elemento             | Antes                                                     | Depois                                         |
| -------------------- | --------------------------------------------------------- | ---------------------------------------------- |
| Container da tabela  | `<div className="border border-navy/15 overflow-hidden">` | Removido — manter só `overflow-x-auto`         |
| `<thead><tr>`        | `bg-navy/[0.02] border-b border-navy/15`                  | `border-b border-foreground/[0.08]`            |
| `<th>` textos        | `text-navy/60`                                            | `text-foreground/40`                           |
| `<th>` backgrounds   | `bg-navy/[0.02]`                                          | Removido                                       |
| `<tr>` body          | `border-b border-navy/10`                                 | `border-b border-foreground/[0.06]`            |
| `<td>` coluna sticky | `bg-white`                                                | `bg-background`                                |
| Nome do membro       | `text-navy`                                               | `text-foreground font-semibold`                |
| Placeholder `—`      | `text-navy/30`                                            | `text-foreground/30`                           |
| Row hover            | ausente                                                   | `hover:bg-foreground/[0.02] transition-colors` |

---

## Critérios de Aceitação

- A tabela matriz membros × eventos visualmente igual às tabelas de Membros e Recursos
- Sem artefato de fundo branco na coluna sticky ao rolar
- Funcionalidade (registro, edição de presença, Sheet) 100% preservada
- Nenhuma alteração em lógica, tipos ou chamadas de API
