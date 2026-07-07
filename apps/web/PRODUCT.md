# Product

## Register

product

## Users

Três perfis dentro da Link — Faculdade de Negócios, todos autenticados e em contexto de tarefa:

- **Admin (coordenação)**: gerencia todas as ligas, usuários, salas e processos seletivos. Usa a plataforma no desktop, durante o expediente, para supervisão e operação.
- **Líder de liga**: aluno responsável por uma liga acadêmica. Gerencia projetos, tarefas, presença e reservas de sala da própria liga. Alterna entre desktop e mobile.
- **Membro**: aluno participante. Consulta projetos, tarefas, presença, mural, agenda e ranking da própria liga. Uso rápido e frequentemente mobile.

O trabalho a ser feito é sempre operacional: registrar presença, acompanhar projeto, reservar sala, cumprir tarefa. Ninguém está aqui para passear — a interface deve desaparecer na tarefa.

## Product Purpose

Sistema centralizado de gestão das ligas acadêmicas da Link. Substitui planilhas e comunicação dispersa por um só lugar para ligas, projetos, presença, salas, tarefas, agenda, mural, ranking e processo seletivo. Sucesso é a coordenação enxergar tudo sem cobrar ninguém, e alunos resolverem suas obrigações em poucos cliques.

## Brand Personality

**Institucional, confiável, organizada.** Tom de faculdade de negócios: sério sem ser frio, direto sem ser burocrático. Transmite credibilidade à coordenação e clareza aos alunos. Microcopy em português brasileiro, objetiva e no imperativo educado ("Registre a presença", não "Registrar presença agora!!").

## Anti-references

- **Rede social / app de consumo**: nada de excesso de cor, emojis na UI, streaks chamativos ou informalidade forçada. Mesmo o módulo de ranking é gestão, não gamificação de consumo.
- Por extensão do registro de produto: sem gradientes decorativos, sem cards-métricos gigantes de template SaaS, sem motion coreografado em carregamento de página.

## Design Principles

1. **A ferramenta desaparece na tarefa** — familiaridade conquistada; padrões que aluno e coordenador reconhecem sem aprender.
2. **Navy comanda, amarelo pontua** — o navy `#10284E` carrega identidade (sidebar, ações primárias, headings); o amarelo `#FEC641` é destaque cirúrgico (estados, badges, alertas), nunca decoração.
3. **Hierarquia pela informação, não pelo ornamento** — densidade é bem-vinda em tabelas e listas; ênfase vem de peso e tamanho tipográfico, não de cor extra.
4. **Todo estado existe** — loading (skeleton), vazio (que ensina), erro (que orienta), desabilitado. Nenhuma tela ganha só o caminho feliz.
5. **Consistência entre módulos** — são ~19 módulos; o mesmo vocabulário de componentes (botões, formulários, tabelas, ícones Lucide) em todos. Se dois "salvar" diferem, um está errado.

## Accessibility & Inclusion

- **WCAG AA como baseline**: contraste ≥4.5:1 em texto de corpo (incluindo placeholders), ≥3:1 em texto grande e componentes de UI.
- Foco visível em todo elemento interativo; navegação completa por teclado.
- `prefers-reduced-motion` respeitado em toda animação (já praticado na view transition do dark mode — manter o padrão).
- Suporte a modo claro e escuro já existente; ambos devem cumprir os mesmos contrastes.
