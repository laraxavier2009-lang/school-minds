import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabaseClient } from "@/lib/supabaseClient";
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

    async function verificar() {
      try {
        const { data, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError) throw sessionError;
        const session = data.session;
        if (!ativo) return;
        if (!session) {
          setVerificando(false);
          void navigate({ to: "/painel/login", replace: true });
          return;
        }
        const { data: equipe, error } = await supabaseClient
          .from("equipe_escola")
          .select("id, cargo")
          .eq("id", session.user.id)
          .maybeSingle();
        if (!ativo) return;
        if (error) {
          console.error("[Painel] Falha ao consultar o perfil da equipe.", error);
          toast.error("Não foi possível verificar sua autorização.");
          setVerificando(false);
          void navigate({ to: "/painel/login", replace: true });
          return;
        }
        if (!equipe) {
          toast.error("Você não tem permissão de acesso ao painel.");
          const { error: signOutError } = await supabaseClient.auth.signOut();
          if (signOutError)
            console.error("[Painel] Falha ao encerrar sessão sem autorização.", signOutError);
          setVerificando(false);
          void navigate({ to: "/painel/login", replace: true });
          return;
        }
        if (!["gestor", "psicologo", "orientador"].includes(equipe.cargo)) {
          toast.error("Acesso não autorizado para este perfil.");
          const { error: signOutError } = await supabaseClient.auth.signOut();
          if (signOutError)
            console.error("[Painel] Falha ao encerrar sessão sem autorização.", signOutError);
          setVerificando(false);
          void navigate({ to: "/painel/login", replace: true });
          return;
        }
        setAutorizado(true);
        setVerificando(false);
      } catch (error) {
        if (!ativo) return;
        console.error("[Painel] Falha ao verificar autorização.", error);
        toast.error("Erro ao verificar acesso. Faça login novamente.");
        setVerificando(false);
        void navigate({ to: "/painel/login", replace: true });
      }
    }

    void verificar();

    const { data: sub } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (!ativo) return;
      if (!session) {
        setAutorizado(false);
        void navigate({ to: "/painel/login", replace: true });
      }
    });

    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (verificando || !autorizado) {
    return (
      <main
        className="flex min-h-screen flex-col items-center justify-center gap-3"
        style={{ color: "var(--cor-texto-leve)" }}
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-solid"
          style={{
            borderColor: "var(--cor-borda-leve)",
            borderTopColor: "var(--cor-primaria, #1B6CA8)",
          }}
          role="status"
          aria-label="Verificando acesso"
        />
        <p className="text-sm font-semibold">Verificando acesso…</p>
      </main>
    );
  }

  return <>{children}</>;
}
