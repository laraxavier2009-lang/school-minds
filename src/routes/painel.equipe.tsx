import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { cadastrarMembroEquipe, type CargoGerenciavel } from "@/lib/gestaoUsuarios";
import { supabaseClient } from "@/lib/supabaseClient";
import type { EquipeEscolaRow } from "@/types/database.types";

export const Route = createFileRoute("/painel/equipe")({
  head: () => ({ meta: [{ title: "Gestão de equipe — Saúde Mental" }] }),
  component: () => (
    <ProtectedRoute cargosPermitidos={CARGOS_GESTOR}>
      <GestaoEquipePage />
    </ProtectedRoute>
  ),
});

const CARGO_LABEL: Record<EquipeEscolaRow["cargo"], string> = {
  gestor: "Gestor",
  psicologo: "Psicólogo",
  orientador: "Orientador",
};
const CARGOS_GESTOR = ["gestor"] as const;

function GestaoEquipePage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cargo, setCargo] = useState<CargoGerenciavel>("psicologo");
  const [enviando, setEnviando] = useState(false);
  const [membros, setMembros] = useState<
    Pick<EquipeEscolaRow, "id" | "nome" | "email" | "cargo" | "criado_em">[]
  >([]);
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

    if (!nomeCompleto || !emailInstitucional) {
      toast.error("Falha ao enviar convite");
      return;
    }

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
      toast.error("Falha ao enviar convite");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main
      className="min-h-screen space-y-6 bg-[var(--cor-fundo)] px-4 py-6 sm:px-6 lg:px-8"
      style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
    >
      <header>
        <p className="text-sm font-bold uppercase tracking-wide text-[var(--cor-primaria)]">
          Saúde Mental na Escola
        </p>
        <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Gestão de equipe</h1>
        <p className="mt-1 text-sm text-slate-600">
          Convide profissionais e acompanhe os membros cadastrados na escola.
        </p>
      </header>

      <section
        aria-labelledby="convite-titulo"
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <h2 id="convite-titulo" className="text-xl font-extrabold text-slate-900">
          Convidar membro
        </h2>
        <form onSubmit={enviarConvite} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Nome completo</span>
            <input
              type="text"
              name="nome"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              autoComplete="name"
              required
              className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria)]/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">E-mail institucional</span>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria)]/20"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-bold text-slate-700">Cargo</span>
            <select
              name="cargo"
              value={cargo}
              onChange={(event) => setCargo(event.target.value as CargoGerenciavel)}
              className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria)]/20 sm:max-w-sm"
            >
              <option value="psicologo">Psicólogo</option>
              <option value="orientador">Orientador</option>
            </select>
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={enviando}
              className="min-h-11 rounded-lg bg-[var(--cor-primaria)] px-5 py-2.5 text-sm font-extrabold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviando ? "Enviando convite..." : "Enviar convite"}
            </button>
          </div>
        </form>
      </section>

      <section
        aria-labelledby="membros-titulo"
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <h2 id="membros-titulo" className="text-xl font-extrabold text-slate-900">
            Membros da equipe
          </h2>
        </div>

        {carregandoMembros ? (
          <p className="p-5 text-sm text-slate-600" role="status">
            Carregando membros da equipe…
          </p>
        ) : erroMembros ? (
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm text-red-800">
            Não foi possível carregar os membros da equipe.
            <button
              type="button"
              onClick={() => void carregarMembros()}
              className="rounded-md border border-red-300 px-3 py-1.5 font-bold hover:bg-red-50"
            >
              Tentar novamente
            </button>
          </div>
        ) : membros.length === 0 ? (
          <p className="p-5 text-sm text-slate-600">Ainda não há membros cadastrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
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
                  <tr key={membro.id} className="text-slate-700">
                    <td className="px-5 py-4 font-bold text-slate-900 sm:px-6">{membro.nome}</td>
                    <td className="px-5 py-4">{membro.email ?? "—"}</td>
                    <td className="px-5 py-4">{CARGO_LABEL[membro.cargo]}</td>
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
    </main>
  );
}

function formatarData(valor: string) {
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? "—"
    : data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
