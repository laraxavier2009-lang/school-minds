import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabaseClient } from "@/lib/supabaseClient";
import type { CargoEquipe } from "@/types/database.types";

interface Props {
  cargosPermitidos: readonly CargoEquipe[];
  titulo: string;
  descricao: string;
  textoBotao: string;
}

export function LoginEquipeEscola({ cargosPermitidos, titulo, descricao, textoBotao }: Props) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    if (!email || !senha) {
      setErro("Preencha e-mail e senha para continuar.");
      return;
    }

    setCarregando(true);
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha,
      });
      if (error || !data.user) {
        setErro("E-mail ou senha incorretos.");
        setCarregando(false);
        return;
      }

      const { data: membro, error: membroError } = await supabaseClient
        .from("equipe_escola")
        .select("id, cargo")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (membroError) {
        await supabaseClient.auth.signOut();
        setErro("Não foi possível verificar sua autorização. Tente novamente.");
        setCarregando(false);
        return;
      }
      if (!membro || !cargosPermitidos.includes(membro.cargo)) {
        await supabaseClient.auth.signOut();
        setErro("Acesso não autorizado para este perfil.");
        setCarregando(false);
        return;
      }

      setCarregando(false);
      void navigate({ to: "/painel" });
    } catch (error) {
      console.error("[Painel] Falha durante o login.", error);
      setErro("Não foi possível entrar. Verifique sua conexão.");
      setCarregando(false);
    }
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-5 py-10"
      style={{ background: "var(--cor-fundo)" }}
    >
      <div
        className="w-full max-w-sm animate-fade-in-up"
        style={{
          background: "var(--cor-card)",
          borderRadius: 12,
          boxShadow: "0 4px 24px rgba(27, 108, 168, 0.12)",
          padding: "32px",
        }}
      >
        <h1
          className="text-center font-extrabold"
          style={{ fontSize: 28, color: "var(--cor-primaria)", lineHeight: 1.2 }}
        >
          {titulo}
        </h1>
        <p
          className="mt-2 text-center"
          style={{ fontSize: 16, color: "var(--cor-texto-leve)", lineHeight: 1.4 }}
        >
          {descricao}
        </p>

        {erro && (
          <div
            className="mt-4 rounded-lg p-3 text-center text-sm font-semibold text-white"
            style={{ background: "var(--cor-crise)" }}
            role="alert"
          >
            {erro}
          </div>
        )}

        <form onSubmit={entrar} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-bold" style={{ color: "var(--cor-texto)" }}>
              E-mail
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="mt-1 h-12 w-full rounded-xl border bg-white px-3 text-base outline-none focus:ring-2"
              style={{
                borderColor: "var(--cor-borda-clara)",
                color: "var(--cor-texto)",
                fontSize: 16,
              }}
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold" style={{ color: "var(--cor-texto)" }}>
              Senha
            </span>
            <input
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              required
              autoComplete="current-password"
              className="mt-1 h-12 w-full rounded-xl border bg-white px-3 text-base outline-none focus:ring-2"
              style={{
                borderColor: "var(--cor-borda-clara)",
                color: "var(--cor-texto)",
                fontSize: 16,
              }}
            />
          </label>

          <button
            type="submit"
            disabled={carregando}
            className="h-[52px] w-full rounded-xl text-base font-bold text-white transition-opacity hover:opacity-95 disabled:opacity-60"
            style={{ background: "var(--cor-primaria)", fontSize: 16 }}
          >
            {carregando ? "Entrando..." : textoBotao}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-sm underline-offset-2 hover:underline"
            style={{ color: "var(--cor-texto-leve)" }}
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}
