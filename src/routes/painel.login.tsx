import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/painel/login")({
  head: () => ({ meta: [{ title: "Acesso à Gestão Escolar — Painel" }] }),
  component: LoginPainel,
});

function LoginPainel() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!email || !senha) {
      setErro("Preencha e-mail e senha para continuar.");
      return;
    }
    setCarregando(true);
    // Ambiente de simulação: qualquer e-mail/senha é aceito.
    try {
      window.localStorage.setItem(
        "painel_simulado_sessao",
        JSON.stringify({ email, entrou_em: new Date().toISOString() }),
      );
    } catch {
      /* ignore */
    }
    setTimeout(() => {
      setCarregando(false);
      void navigate({ to: "/painel" });
    }, 400);
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-5 py-10"
      style={{ background: "var(--cor-fundo)" }}
    >
      <div
        className="w-full max-w-sm animate-fade-in-up"
        style={{
          background: "#FFFFFF",
          borderRadius: 12,
          boxShadow: "0 4px 24px rgba(27, 108, 168, 0.12)",
          padding: "32px",
        }}
      >
        <h1
          className="text-center font-extrabold"
          style={{ fontSize: 28, color: "var(--cor-primaria)", lineHeight: 1.2 }}
        >
          Acesso à Gestão Escolar
        </h1>
        <p
          className="mt-2 text-center"
          style={{ fontSize: 16, color: "var(--cor-texto-leve)", lineHeight: 1.4 }}
        >
          Área restrita para psicólogos, orientadores e gestores
        </p>

        <div
          className="mt-3 rounded-md px-3 py-2 text-center text-[11px] font-semibold"
          style={{ background: "#FFF7E0", color: "#9C4A14", border: "1px dashed #E6B36A" }}
        >
          Ambiente de Simulação — Login Administrativo
        </div>

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
            <span
              className="text-sm font-bold"
              style={{ color: "var(--cor-texto)" }}
            >
              E-mail
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="mt-1 h-12 w-full rounded-xl border bg-white px-3 text-base outline-none focus:ring-2"
              style={{
                borderColor: "#C8D2DD",
                color: "var(--cor-texto)",
                fontSize: 16,
              }}
            />
          </label>
          <label className="block">
            <span
              className="text-sm font-bold"
              style={{ color: "var(--cor-texto)" }}
            >
              Senha
            </span>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoComplete="current-password"
              className="mt-1 h-12 w-full rounded-xl border bg-white px-3 text-base outline-none focus:ring-2"
              style={{
                borderColor: "#C8D2DD",
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
            {carregando ? "Entrando..." : "Entrar no Painel"}
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
