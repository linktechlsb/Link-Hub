import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { LigasPage } from "@/pages/ligas/LigasPage";
import { ProjetosPage } from "@/pages/projetos/ProjetosPage";
import { PresencaPage } from "@/pages/presenca/PresencaPage";
import { SalasPage } from "@/pages/salas/SalasPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
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
    element: <AppLayout />,
    children: [
      { path: "dashboard", element: <DashboardPage /> },
      { path: "ligas", element: <LigasPage /> },
      { path: "projetos", element: <ProjetosPage /> },
      { path: "presenca", element: <PresencaPage /> },
      { path: "salas", element: <SalasPage /> },
    ],
  },
]);
