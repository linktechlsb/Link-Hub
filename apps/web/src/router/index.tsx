import { createBrowserRouter, Navigate, type RouterProviderProps } from "react-router-dom";

type BrowserRouter = RouterProviderProps["router"];
import { AppLayout } from "@/layouts/AppLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LoginPage } from "@/pages/auth/LoginPage";
import { HomePage } from "@/pages/home/HomePage";
import { LigasPage } from "@/pages/ligas/LigasPage";
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
    path: "/auth",
    element: <AuthLayout />,
    children: [
      { path: "login", element: <LoginPage /> },
    ],
  },
  {
    path: "/",
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "home", element: <HomePage /> },
          { path: "ligas", element: <LigasPage /> },
          { path: "projetos", element: <ProjetosPage /> },
          { path: "agenda", element: <AgendaPage /> },
          { path: "conteudo", element: <ConteudoPage /> },
          {
            path: "super-admin",
            element: <ProtectedRoute allowedRoles={["admin"]} />,
            children: [{ index: true, element: <SuperAdminPage /> }],
          },
          {
            path: "gerenciamento",
            element: <ProtectedRoute allowedRoles={["admin", "lider"]} />,
            children: [{ index: true, element: <GerenciamentoPage /> }],
          },
          { path: "conta", element: <ContaPage /> },
        ],
      },
    ],
  },
]);
