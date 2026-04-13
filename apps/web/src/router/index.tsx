import { createBrowserRouter, Navigate, type RouterProviderProps } from "react-router-dom";

type BrowserRouter = RouterProviderProps["router"];
import { AppLayout } from "@/layouts/AppLayout";
import { HomePage } from "@/pages/home/HomePage";
import { LigasPage } from "@/pages/ligas/LigasPage";
import { LigaDetailPage } from "@/pages/ligas/LigaDetailPage";
import { ProjetosPage } from "@/pages/projetos/ProjetosPage";
import { AgendaPage } from "@/pages/agenda/AgendaPage";
import { ConteudoPage } from "@/pages/conteudo/ConteudoPage";
import { SuperAdminPage } from "@/pages/super-admin/SuperAdminPage";
import { GerenciamentoPage } from "@/pages/gerenciamento/GerenciamentoPage";
import { ContaPage } from "@/pages/conta/ContaPage";

export const router: BrowserRouter = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/home" replace />,
  },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { path: "home", element: <HomePage /> },
      { path: "ligas", element: <LigasPage /> },
      { path: "ligas/:id", element: <LigaDetailPage /> },
      { path: "projetos", element: <ProjetosPage /> },
      { path: "agenda", element: <AgendaPage /> },
      { path: "conteudo", element: <ConteudoPage /> },
      { path: "super-admin", element: <SuperAdminPage /> },
      { path: "gerenciamento", element: <GerenciamentoPage /> },
      { path: "conta", element: <ContaPage /> },
    ],
  },
]);
