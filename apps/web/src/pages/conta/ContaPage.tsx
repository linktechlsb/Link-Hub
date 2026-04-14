import { useUser } from "@/hooks/use-user";
import { ContaMembroView } from "./ContaMembroView";
import { ContaLiderView } from "./ContaLiderView";
import { ContaProfessorView } from "./ContaProfessorView";
import { ContaStaffView } from "./ContaStaffView";

export function ContaPage() {
  const { role } = useUser();

  if (role === null) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (role === "lider") {
    return <ContaLiderView />;
  }

  if (role === "professor") {
    return <ContaProfessorView />;
  }

  if (role === "membro") {
    return <ContaMembroView />;
  }

  if (role === "admin") {
    return <ContaStaffView />;
  }

  // Outros perfis não têm página de conta configurada aqui
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-navy">Minha conta</h1>
        <p className="text-muted-foreground text-sm mt-1">Módulo em desenvolvimento para este perfil.</p>
      </div>
    </div>
  );
}
