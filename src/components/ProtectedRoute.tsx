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

    async function verificar() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        if (ativo) void navigate({ to: "/painel/login" });
        return;
      }
      const { data: equipe, error } = await supabase
        .from("equipe_escola")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!ativo) return;
      if (error || !equipe) {
        toast.error("Acesso restrito à equipe escolar.");
        await supabase.auth.signOut();
        void navigate({ to: "/painel/login" });
        return;
      }
      setAutorizado(true);
      setVerificando(false);
    }

    void verificar();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) void navigate({ to: "/painel/login" });
    });

    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (verificando || !autorizado) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm" style={{ color: "var(--cor-texto-leve)" }}>
        Verificando acesso...
      </main>
    );
  }

  return <>{children}</>;
}
