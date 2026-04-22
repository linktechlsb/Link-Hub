import { ClipboardList } from "lucide-react";

export function ProcessoSeletivoPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-navy">Processo Seletivo</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestão das etapas de recrutamento da sua liga
        </p>
      </div>

      <div className="bg-white border border-brand-gray rounded-xl p-12 text-center">
        <ClipboardList className="h-10 w-10 text-link-blue mx-auto mb-3" />
        <p className="font-display font-bold text-lg text-navy">Módulo em desenvolvimento</p>
        <p className="text-sm text-muted-foreground mt-1">
          Em breve: criar inscrições, acompanhar candidatos e gerenciar etapas do processo seletivo.
        </p>
      </div>
    </div>
  );
}
