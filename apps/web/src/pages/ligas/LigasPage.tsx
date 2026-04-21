import { MoreHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";

import { LigaCard } from "./LigaCard";
import { LigaSheet } from "./LigaSheet";

import type { Liga, UserRole } from "@link-leagues/types";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export function LigasPage() {
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [ligaParaEditar, setLigaParaEditar] = useState<Liga | undefined>(undefined);

  async function carregarLigas() {
    const token = await getToken();
    const res = await fetch("/api/ligas", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setLigas(await res.json());
    setCarregando(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (!session) return;
      setUserEmail(session.user.email ?? null);

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("role")
        .eq("email", session.user.email)
        .single();

      setRole((usuario?.role as UserRole) ?? "membro");
    });

    carregarLigas();
  }, []);

  function abrirEditar() {
    const minha = ligas.find((l) => l.lider_email === userEmail);
    setLigaParaEditar(minha);
    setSheetOpen(true);
  }

  function abrirAdicionar() {
    setLigaParaEditar(undefined);
    setSheetOpen(true);
  }

  const canManage = role === "staff" || role === "diretor";

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-navy">Ligas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ligas acadêmicas da Link School of Business
          </p>
        </div>

        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="border-brand-gray text-link-blue">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {role === "diretor" && (
                <DropdownMenuItem onClick={abrirEditar}>Editar liga</DropdownMenuItem>
              )}
              {role === "staff" && (
                <DropdownMenuItem onClick={abrirAdicionar}>Adicionar liga</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando ligas...</p>
      ) : ligas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma liga cadastrada.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ligas.map((liga) => (
            <LigaCard key={liga.id} liga={liga} />
          ))}
        </div>
      )}

      <LigaSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        liga={ligaParaEditar}
        onSalvo={carregarLigas}
      />
    </div>
  );
}
