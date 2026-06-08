import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Saúde Mental na Escola — Portal" },
      { name: "description", content: "Selecione o seu perfil de acesso: estudante ou equipe escolar." },
    ],
  }),
  component: Portal,
});

function Portal() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md space-y-6">
        <header className="animate-fade-in-up text-center">
          <div className="text-5xl">🤝</div>
          <h1 className="mt-2 text-[26px] font-extrabold leading-tight" style={{ color: "var(--cor-primaria)" }}>
            Saúde Mental na Escola
          </h1>
          <p className="mt-1 text-base" style={{ color: "var(--cor-texto-leve)" }}>
            Escolha como deseja acessar
          </p>
        </header>

        <Link
          to="/privacidade"
          className="animate-fade-in-up block rounded-2xl border-2 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          style={{
            borderColor: "#2ECC71",
            boxShadow: "0 2px 12px rgba(46, 204, 113, 0.15)",
            animationDelay: "100ms",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">💚</span>
            <div>
              <h2 className="text-lg font-extrabold" style={{ color: "#1E8449" }}>
                Portal do Estudante
              </h2>
              <p className="text-sm" style={{ color: "var(--cor-texto-leve)" }}>
                Espaço anônimo de escuta e acolhimento.
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/painel/login"
          className="animate-fade-in-up block rounded-2xl border-2 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          style={{
            borderColor: "#1B6CA8",
            boxShadow: "0 2px 12px rgba(27, 108, 168, 0.15)",
            animationDelay: "200ms",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏫</span>
            <div>
              <h2 className="text-lg font-extrabold" style={{ color: "#1B6CA8" }}>
                Acesso Gestão
              </h2>
              <p className="text-sm" style={{ color: "var(--cor-texto-leve)" }}>
                Login restrito à equipe escolar.
              </p>
            </div>
          </div>
        </Link>

        <p className="animate-fade-in-up text-center text-[13px]" style={{ color: "var(--cor-texto-leve)", animationDelay: "300ms" }}>
          Nenhum dado pessoal do estudante é armazenado.
        </p>
      </div>
    </main>
  );
}
