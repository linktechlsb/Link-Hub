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
import { CriarEventoPage } from "@/pages/calendario/CriarEventoPage";
import { CriarHubPage } from "@/pages/calendario/CriarHubPage";
import { CriarWorkshopPage } from "@/pages/calendario/CriarWorkshopPage";
import { GuiaPage } from "@/pages/calendario/GuiaPage";
import { MarcarEncontrosPage } from "@/pages/calendario/MarcarEncontrosPage";
import { SolicitarEventosPage } from "@/pages/calendario/SolicitarEventosPage";
import { ContaPage } from "@/pages/conta/ContaPage";
import { FormularioDetalhePage } from "@/pages/formularios/FormularioDetalhePage";
import { FormulariosPage } from "@/pages/formularios/FormulariosPage";
import { NovoFormularioPage } from "@/pages/formularios/NovoFormularioPage";
import { GerenciamentoPage } from "@/pages/gerenciamento/GerenciamentoPage";
import { HomePage } from "@/pages/home/HomePage";
import { LigaDetailPage } from "@/pages/ligas/LigaDetailPage";
import { LigasPage } from "@/pages/ligas/LigasPage";
import { MuralPage } from "@/pages/mural/MuralPage";
import { PresencaPage } from "@/pages/presenca/PresencaPage";
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
          { path: "agenda", element: <Navigate to="/calendario" replace /> },
          { path: "calendario", element: <AgendaPage /> },
          { path: "calendario/eventos", element: <CriarEventoPage /> },
          { path: "calendario/hubs", element: <CriarHubPage /> },
          { path: "calendario/workshops", element: <CriarWorkshopPage /> },
          { path: "calendario/solicitar-eventos", element: <SolicitarEventosPage /> },
          { path: "calendario/marcar-encontros", element: <MarcarEncontrosPage /> },
          { path: "calendario/guia", element: <GuiaPage /> },
          { path: "mural", element: <MuralPage /> },
          { path: "ranking", element: <RankingPage /> },
          { path: "super-admin", element: <SuperAdminPage /> },
          { path: "formularios", element: <FormulariosPage /> },
          { path: "formularios/novo", element: <NovoFormularioPage /> },
          { path: "formularios/:id", element: <FormularioDetalhePage /> },
          { path: "gerenciamento", element: <GerenciamentoPage /> },
          { path: "presenca", element: <PresencaPage /> },
          { path: "conta", element: <ContaPage /> },
        ],
      },
    ],
  },
]);
