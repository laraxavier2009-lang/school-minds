import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/painel/login")({
  head: () => ({ meta: [{ title: "Login da escola — Painel" }] }),
  component: LoginPainel,
});

function LoginPainel() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) {
      toast.error("Credenciais inválidas");
      return;
    }
    void navigate({ to: "/painel" });
  }

  async function criar() {
    if (!email || senha.length < 6) {
      toast.error("Informe e-mail e senha (mín. 6 caracteres).");
      return;
    }
    setCarregando(true);
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { emailRedirectTo: `${window.location.origin}/painel` },
    });
    setCarregando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Conta criada. Se a confirmação por e-mail estiver ativa, verifique sua caixa.");
  }

  return (
    <main className="px-6 pt-10 pb-10">
      <h1 className="text-2xl font-extrabold" style={{ color: "var(--cor-primaria)" }}>
        Painel da escola
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--cor-texto-leve)" }}>
        Acesso restrito à equipe escolar.
      </p>

      <form onSubmit={entrar} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-bold" style={{ color: "var(--cor-texto)" }}>
            E-mail
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="mt-1 h-12 w-full rounded-xl border bg-white px-3 text-base"
            style={{ borderColor: "#C8D2DD" }}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold" style={{ color: "var(--cor-texto)" }}>
            Senha
          </span>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            autoComplete="current-password"
            className="mt-1 h-12 w-full rounded-xl border bg-white px-3 text-base"
            style={{ borderColor: "#C8D2DD" }}
          />
        </label>
        <button
          type="submit"
          disabled={carregando}
          className="h-[52px] w-full rounded-xl text-base font-bold text-white disabled:opacity-60"
          style={{ background: "var(--cor-primaria)" }}
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>
        <button
          type="button"
          onClick={criar}
          disabled={carregando}
          className="block w-full py-2 text-center text-sm underline-offset-2 hover:underline"
          style={{ color: "var(--cor-texto-leve)" }}
        >
          Primeira vez? Criar conta da escola
        </button>
      </form>
    </main>
  );
}