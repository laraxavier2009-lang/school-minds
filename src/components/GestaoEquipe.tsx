import { useCallback, useEffect, useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { cadastrarMembroEquipe, type CargoGerenciavel } from "@/lib/gestaoUsuarios";
import { supabaseClient } from "@/lib/supabaseClient";
import type { EquipeEscolaRow } from "@/types/database.types";

type MembroEquipe = Pick<EquipeEscolaRow, "id" | "nome" | "email" | "cargo" | "criado_em">;

const CARGO_LABEL: Record<EquipeEscolaRow["cargo"], string> = {
  gestor: "Gestor",
  psicologo: "Psicólogo(a)",
  orientador: "Orientador(a)",
};

const CARGO_BADGE_STYLE: Record<
  EquipeEscolaRow["cargo"],
  { backgroundColor: string; color: string }
> = {
  gestor: { backgroundColor: "#F3E8FF", color: "#6B21A8" },
  psicologo: { backgroundColor: "var(--cor-secundaria)", color: "#14532D" },
  orientador: { backgroundColor: "var(--cor-primaria)", color: "#FFFFFF" },
};

export function GestaoEquipe() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cargo, setCargo] = useState<CargoGerenciavel>("psicologo");
  const [enviando, setEnviando] = useState(false);
  const [membros, setMembros] = useState<MembroEquipe[]>([]);
  const [carregandoMembros, setCarregandoMembros] = useState(true);
  const [erroMembros, setErroMembros] = useState(false);

  const carregarMembros = useCallback(async () => {
    setCarregandoMembros(true);
    setErroMembros(false);
    try {
      const { data, error } = await supabaseClient
        .from("equipe_escola")
        .select("id, nome, email, cargo, criado_em")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      setMembros(data);
    } catch (error) {
      console.error("[Gestão de equipe] Falha ao carregar os membros.", error);
      setErroMembros(true);
      toast.error("Não foi possível carregar os membros da equipe.");
    } finally {
      setCarregandoMembros(false);
    }
  }, []);

  useEffect(() => {
    void carregarMembros();
  }, [carregarMembros]);

  async function enviarConvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nomeCompleto = nome.trim();
    const emailInstitucional = email.trim();
    if (!nomeCompleto || !emailInstitucional || enviando) return;

    setEnviando(true);
    try {
      await cadastrarMembroEquipe({
        nome: nomeCompleto,
        email: emailInstitucional,
        cargo,
      });
      toast.success("Convite enviado com sucesso!");
      setNome("");
      setEmail("");
      setCargo("psicologo");
      await carregarMembros();
    } catch (error) {
      console.error("[Gestão de equipe] Falha ao enviar convite.", error);
      toast.error(error instanceof Error ? error.message : "Falha ao enviar convite.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      className="min-h-screen space-y-6 bg-[var(--cor-fundo)] px-4 py-6 sm:px-6 lg:px-8"
      style={{ fontFamily: "Nunito, system-ui, sans-serif", color: "var(--cor-texto)" }}
    >
      <header>
        <p className="text-sm font-bold uppercase tracking-wide text-[var(--cor-primaria)]">
          Saúde Mental na Escola
        </p>
        <h1 className="text-2xl font-extrabold sm:text-3xl">Gestão de equipe</h1>
        <p className="mt-1 text-sm text-[var(--cor-texto-leve)]">
          Convide profissionais e acompanhe os membros cadastrados na escola.
        </p>
      </header>

      <section
        aria-labelledby="convite-titulo"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(27,108,168,0.08)] sm:p-6"
      >
        <h2 id="convite-titulo" className="text-xl font-extrabold">
          Cadastrar Novo Profissional
        </h2>
        <form onSubmit={enviarConvite} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold">Nome completo</span>
            <input
              type="text"
              name="nome"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              autoComplete="name"
              required
              disabled={enviando}
              className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base outline-none focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria)]/20 disabled:opacity-60"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold">E-mail institucional</span>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              disabled={enviando}
              className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base outline-none focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria)]/20 disabled:opacity-60"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-bold">Cargo</span>
            <select
              name="cargo"
              value={cargo}
              onChange={(event) => setCargo(event.target.value as CargoGerenciavel)}
              disabled={enviando}
              className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base outline-none focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria)]/20 disabled:opacity-60 sm:max-w-sm"
            >
              <option value="psicologo">Psicólogo(a)</option>
              <option value="orientador">Orientador(a)</option>
            </select>
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={enviando}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--cor-primaria)] px-5 py-2.5 text-sm font-extrabold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviando && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {enviando ? "Enviando convite..." : "Enviar Convite e Cadastrar"}
            </button>
          </div>
        </form>
      </section>

      <section
        aria-labelledby="membros-titulo"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(27,108,168,0.08)]"
      >
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <h2 id="membros-titulo" className="text-xl font-extrabold">
            Membros da Equipe Cadastrados
          </h2>
        </div>

        {carregandoMembros ? (
          <p className="p-5 text-sm text-[var(--cor-texto-leve)]" role="status">
            Carregando membros da equipe…
          </p>
        ) : erroMembros ? (
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm text-red-800">
            Não foi possível carregar os membros da equipe.
            <button
              type="button"
              onClick={() => void carregarMembros()}
              className="rounded-xl border border-red-300 px-3 py-1.5 font-bold hover:bg-red-50"
            >
              Tentar novamente
            </button>
          </div>
        ) : membros.length === 0 ? (
          <p className="p-5 text-sm text-[var(--cor-texto-leve)]">
            Ainda não há membros cadastrados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[var(--cor-fundo)] text-xs uppercase tracking-wide text-[var(--cor-texto-leve)]">
                <tr>
                  <th scope="col" className="px-5 py-3 font-bold sm:px-6">
                    Nome
                  </th>
                  <th scope="col" className="px-5 py-3 font-bold">
                    E-mail
                  </th>
                  <th scope="col" className="px-5 py-3 font-bold">
                    Cargo
                  </th>
                  <th scope="col" className="px-5 py-3 font-bold sm:px-6">
                    Data de Cadastro
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {membros.map((membro) => (
                  <tr key={membro.id}>
                    <td className="px-5 py-4 font-bold sm:px-6">{membro.nome}</td>
                    <td className="px-5 py-4">{membro.email ?? "—"}</td>
                    <td className="px-5 py-4">
                      <span
                        className="inline-flex rounded-full px-3 py-1 text-xs font-extrabold"
                        style={CARGO_BADGE_STYLE[membro.cargo]}
                      >
                        {CARGO_LABEL[membro.cargo]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 sm:px-6">
                      {formatarData(membro.criado_em)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function formatarData(valor: string) {
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? "—"
    : data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
