import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { MinhaLigaStrip } from "../MinhaLigaStrip";

import type { Liga } from "@link-leagues/types";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

const liga: Liga = {
  id: "liga-1",
  nome: "Liga de Estratégia",
  ativo: true,
} as Liga;

describe("MinhaLigaStrip", () => {
  it("renderiza eyebrow 'Minha liga' e o nome", () => {
    render(
      <MemoryRouter>
        <MinhaLigaStrip liga={liga} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/minha liga/i)).toBeInTheDocument();
    expect(screen.getByText("Liga de Estratégia")).toBeInTheDocument();
  });

  it("navega para o detalhe da liga ao clicar", async () => {
    navigateMock.mockClear();
    render(
      <MemoryRouter>
        <MinhaLigaStrip liga={liga} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: /acessar liga/i }));
    expect(navigateMock).toHaveBeenCalledWith("/ligas/liga-1");
  });
});
