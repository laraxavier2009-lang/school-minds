import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  children: ReactNode;
}

export function ProtectedRoute({ children }: Props) {
  const navigate = useNavigate();
  const [autorizado, setAutorizado] = useState(false);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    let ativo = true;
    let concluiu = false;

    async function verificar() {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (!ativo) return;
        if (!session) {
          concluiu = true;
          void navigate({ to: "/painel/login" });
          return;
        }
        const { data: equipe, error } = await supabase
          .from("equipe_escola")
          .select("id, cargo")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (!ativo) return;
        concluiu = true;
        if (error || !equipe) {
          toast.error("Você não tem permissão de acesso ao painel.");
          await supabase.auth.signOut();
          void navigate({ to: "/painel/login" });
          return;
        }
        if (equipe.cargo !== "gestor") {
          toast.error("Acesso negado. Área restrita a gestores.");
          await supabase.auth.signOut();
          void navigate({ to: "/painel/login" });
          return;
        }
        setAutorizado(true);
        setVerificando(false);
      } catch (e) {
        if (!ativo) return;
        concluiu = true;
        toast.error("Erro ao verificar acesso. Faça login novamente.");
        void navigate({ to: "/painel/login" });
      }
    }

    void verificar();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!ativo) return;
      if (!session) {
        setAutorizado(false);
        void navigate({ to: "/painel/login" });
      }
    });

    const timeout = setTimeout(() => {
      if (!ativo || concluiu) return;
      toast.error("Tempo esgotado ao verificar acesso. Faça login novamente.");
      void navigate({ to: "/painel/login" });
    }, 5000);

    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  if (verificando || !autorizado) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3" style={{ color: "var(--cor-texto-leve)" }}>
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-solid"
          style={{ borderColor: "#E0E6EE", borderTopColor: "var(--cor-primaria, #1B6CA8)" }}
          role="status"
          aria-label="Verificando acesso"
        />
        <p className="text-sm font-semibold">Verificando acesso…</p>
      </main>
    );
  }

  return <>{children}</>;
}
