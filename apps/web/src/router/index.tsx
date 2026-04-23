import { createBrowserRouter, Navigate, type RouterProviderProps } from "react-router-dom";

type BrowserRouter = RouterProviderProps["router"];
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/layouts/AppLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { AgendaPage } from "@/pages/agenda/AgendaPage";
import { CriarSenhaPage } from "@/pages/auth/CriarSenhaPage";
import { EsqueciSenhaPage } from "@/pages/auth/EsqueciSenhaPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RedefinirSenhaPage } from "@/pages/auth/RedefinirSenhaPage";
import { ContaPage } from "@/pages/conta/ContaPage";
import { GerenciamentoPage } from "@/pages/gerenciamento/GerenciamentoPage";
import { HomePage } from "@/pages/home/HomePage";
import { LigaDetailPage } from "@/pages/ligas/LigaDetailPage";
import { LigasPage } from "@/pages/ligas/LigasPage";
import { MuralPage } from "@/pages/mural/MuralPage";
import { PresencaPage } from "@/pages/presenca/PresencaPage";
import { ProcessoSeletivoPage } from "@/pages/processo-seletivo/ProcessoSeletivoPage";
import { ProjetosPage } from "@/pages/projetos/ProjetosPage";
import { RankingPage } from "@/pages/ranking/RankingPage";
import { SuperAdminPage } from "@/pages/super-admin/SuperAdminPage";

export const router: BrowserRouter = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/home" replace />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: <AuthLayout />,
    children: [
      { path: "criar-senha", element: <CriarSenhaPage /> },
      { path: "esqueci-senha", element: <EsqueciSenhaPage /> },
      { path: "redefinir-senha", element: <RedefinirSenhaPage /> },
    ],
  },
  {
    path: "/",
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <AppLayout />,
        children: [
          { path: "home", element: <HomePage /> },
          { path: "ligas", element: <LigasPage /> },
          { path: "ligas/:id", element: <LigaDetailPage /> },
          { path: "projetos", element: <ProjetosPage /> },
          { path: "agenda", element: <AgendaPage /> },
          { path: "mural", element: <MuralPage /> },
          { path: "ranking", element: <RankingPage /> },
          { path: "super-admin", element: <SuperAdminPage /> },
          { path: "processo-seletivo", element: <ProcessoSeletivoPage /> },
          { path: "gerenciamento", element: <GerenciamentoPage /> },
          { path: "presenca", element: <PresencaPage /> },
          { path: "conta", element: <ContaPage /> },
        ],
      },
    ],
  },
]);
