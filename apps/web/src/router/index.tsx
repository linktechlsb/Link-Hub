import { createBrowserRouter, Navigate, type RouterProviderProps } from "react-router-dom";

type BrowserRouter = RouterProviderProps["router"];
import { AppLayout } from "@/layouts/AppLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LoginPage } from "@/pages/auth/LoginPage";
import { LigasPage } from "@/pages/ligas/LigasPage";
import { ProjetosPage } from "@/pages/projetos/ProjetosPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { PresencaPage } from "@/pages/presenca/PresencaPage";
import { SalasPage } from "@/pages/salas/SalasPage";
import { AdministradorPage } from "@/pages/administrador/AdministradorPage";

export const router: BrowserRouter = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/projetos" replace />,
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
          { path: "projetos", element: <ProjetosPage /> },
          {
            path: "ligas",
            element: <ProtectedRoute allowedRoles={["staff", "diretor", "membro"]} />,
            children: [{ index: true, element: <LigasPage /> }],
          },
          { path: "dashboard", element: <DashboardPage /> },
          { path: "presenca", element: <PresencaPage /> },
          { path: "salas", element: <SalasPage /> },
          { path: "administrador", element: <AdministradorPage /> },
        ],
      },
    ],
  },
]);
