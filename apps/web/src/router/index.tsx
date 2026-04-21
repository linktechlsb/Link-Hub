import { createBrowserRouter, Navigate, type RouterProviderProps } from "react-router-dom";

type BrowserRouter = RouterProviderProps["router"];
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/layouts/AppLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { AgendaPage } from "@/pages/agenda/AgendaPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RedefinirSenhaPage } from "@/pages/auth/RedefinirSenhaPage";
import { ContaPage } from "@/pages/conta/ContaPage";
import { GerenciamentoPage } from "@/pages/gerenciamento/GerenciamentoPage";
import { HomePage } from "@/pages/home/HomePage";
import { LigaDetailPage } from "@/pages/ligas/LigaDetailPage";
import { LigasPage } from "@/pages/ligas/LigasPage";
import { PresencaPage } from "@/pages/presenca/PresencaPage";
import { ProjetosPage } from "@/pages/projetos/ProjetosPage";
import { SuperAdminPage } from "@/pages/super-admin/SuperAdminPage";

export const router: BrowserRouter = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/home" replace />,
  },
  {
    path: "/",
    element: <AuthLayout />,
    children: [
      { path: "login", element: <LoginPage /> },
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
          { path: "super-admin", element: <SuperAdminPage /> },
          { path: "gerenciamento", element: <GerenciamentoPage /> },
          { path: "presenca", element: <PresencaPage /> },
          { path: "conta", element: <ContaPage /> },
        ],
      },
    ],
  },
]);
