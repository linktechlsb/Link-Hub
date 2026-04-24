import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { EditorialHero } from "../EditorialHero";

import type { Liga } from "@link-leagues/types";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

const ligas: Liga[] = [
  { id: "l1", nome: "Liga de Finanças", ativo: true, projetos_ativos: 12 } as Liga,
  { id: "l2", nome: "Liga de Estratégia", ativo: true, projetos_ativos: 9 } as Liga,
  { id: "l3", nome: "Liga Marketing", ativo: true, projetos_ativos: 7 } as Liga,
];

describe("EditorialHero", () => {
  it("renderiza o nome da primeira liga", () => {
    render(
      <MemoryRouter>
        <EditorialHero ligas={ligas} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Finanças/)).toBeInTheDocument();
  });

  it("renderiza índice '01 / 03' por padrão", () => {
    render(
      <MemoryRouter>
        <EditorialHero ligas={ligas} />
      </MemoryRouter>,
    );
    expect(screen.getAllByText(/01/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/03/).length).toBeGreaterThan(0);
  });

  it("navega ao clicar no card da liga", async () => {
    navigateMock.mockClear();
    render(
      <MemoryRouter>
        <EditorialHero ligas={ligas} />
      </MemoryRouter>,
    );
    const cards = screen.getAllByRole("button", { name: /abrir liga/i });
    await userEvent.click(cards[0]!);
    expect(navigateMock).toHaveBeenCalledWith("/ligas/l1");
  });

  it("renderiza setas acessíveis de navegação", () => {
    render(
      <MemoryRouter>
        <EditorialHero ligas={ligas} />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole("button", { name: /liga anterior/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /próxima liga/i }).length).toBeGreaterThan(0);
  });

  it("não renderiza setas quando só há 1 liga", () => {
    render(
      <MemoryRouter>
        <EditorialHero ligas={[ligas[0]!]} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: /liga anterior/i })).not.toBeInTheDocument();
  });
});
