import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { HomeV1Page } from "../HomeV1Page";

vi.mock("../useHomeData", () => ({
  useHomeData: () => ({
    ligas: [],
    minhaLiga: null,
    nomeUsuario: "Diogo",
    loadingUser: false,
    pendentes: { projetos: [], eventos: [] },
    role: "membro",
  }),
}));

describe("HomeV1Page", () => {
  it("renderiza saudação com o nome do usuário", () => {
    render(
      <MemoryRouter>
        <HomeV1Page />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Olá, Diogo/)).toBeInTheDocument();
  });

  it("renderiza badge do papel em caixa mono", () => {
    render(
      <MemoryRouter>
        <HomeV1Page />
      </MemoryRouter>,
    );
    expect(screen.getByText(/membro/i)).toBeInTheDocument();
  });

  it("não renderiza hero quando não há ligas", () => {
    render(
      <MemoryRouter>
        <HomeV1Page />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("region", { name: /ligas em destaque/i })).not.toBeInTheDocument();
  });
});
