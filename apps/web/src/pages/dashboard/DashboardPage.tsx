export function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-navy">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visão geral das ligas e projetos
        </p>
      </div>

      {/* Stats placeholder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Ligas Ativas", value: "—" },
          { label: "Projetos em Andamento", value: "—" },
          { label: "Membros", value: "—" },
          { label: "Eventos este Mês", value: "—" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-brand-gray rounded-xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {stat.label}
            </p>
            <p className="text-3xl font-display font-bold text-navy mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Módulos em desenvolvimento — em breve disponíveis.
      </p>
    </div>
  );
}
