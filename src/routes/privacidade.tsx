import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Saúde Mental na Escola — Estou aqui para te ouvir" },
      { name: "description", content: "Espaço de acolhimento e escuta inicial para estudantes do ensino médio. Confidencial e seguro." },
    ],
  }),
  component: Privacidade,
});

function Privacidade() {
  return (
    <main className="flex min-h-screen flex-col items-center px-6 pt-10 pb-8">
      <div className="w-full space-y-6">
        <div className="animate-fade-in-up flex flex-col items-center text-center" style={{ animationDelay: "0ms" }}>
          <div className="text-5xl">🤝</div>
        </div>
        <div className="animate-fade-in-up text-center" style={{ animationDelay: "100ms" }}>
          <h1 className="text-[28px] font-extrabold leading-tight" style={{ color: "var(--cor-primaria)" }}>
            Saúde Mental na Escola
          </h1>
          <p className="mt-2 text-base" style={{ color: "var(--cor-texto-leve)" }}>
            Estou aqui para te ouvir
          </p>
        </div>

        <div
          className="animate-fade-in-up rounded-2xl border-l-4 bg-white p-5"
          style={{
            borderLeftColor: "var(--cor-primaria)",
            boxShadow: "0 2px 12px rgba(27, 108, 168, 0.10)",
            animationDelay: "200ms",
          }}
        >
          <p className="text-[16px] font-bold" style={{ color: "var(--cor-texto)" }}>
            🔒 Tudo o que conversarmos aqui é seguro e confidencial.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--cor-texto-leve)" }}>
            Mas atenção: eu sou um robô. Não substituo psicólogo, não faço diagnóstico e não sou canal de emergência.
          </p>
        </div>

        <hr className="border-t" style={{ borderColor: "rgba(27, 108, 168, 0.15)" }} />

        <div className="animate-fade-in-up space-y-3" style={{ animationDelay: "300ms" }}>
          <Link
            to="/temas"
            className="flex h-[52px] w-full items-center justify-center rounded-xl text-[18px] font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--cor-primaria)" }}
          >
            Quero continuar →
          </Link>
          <button
            type="button"
            onClick={() => {
              window.location.href = "about:blank";
            }}
            className="block w-full py-2 text-center text-sm underline-offset-2 hover:underline"
            style={{ color: "var(--cor-texto-leve)" }}
          >
            Prefiro sair
          </button>
        </div>

        <p className="animate-fade-in-up text-center text-[13px]" style={{ color: "var(--cor-texto-leve)", animationDelay: "400ms" }}>
          Nenhuma resposta sua fica salva.
        </p>
      </div>
    </main>
  );
}
