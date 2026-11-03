import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabaseClient } from "@/lib/supabaseClient";
import { LABELS_TEMA, type NivelRisco, type Tema } from "@/lib/triagem";
import type { StatusAlerta } from "@/types/database.types";

export const Route = createFileRoute("/painel/")({
  head: () => ({ meta: [{ title: "Painel de Gestão Escolar — Saúde Mental" }] }),
  component: () => (
    <ProtectedRoute>
      <PainelPage />
    </ProtectedRoute>
  ),
});

type AlertaPainel = {
  id: string;
  registro_id: string;
  nivel: "medio" | "grave";
  status: StatusAlerta;
  emitido_em: string;
  registros: {
    tema: Tema;
    nivel_risco: NivelRisco;
    pontuacao_total: number;
    criado_em: string;
  } | null;
};

const STATUS_LABEL: Record<StatusAlerta, string> = {
  pendente: "Pendente",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
};

const STATUS_CLASS: Record<StatusAlerta, string> = {
  pendente: "bg-amber-100 text-amber-900",
  em_atendimento: "bg-blue-100 text-blue-900",
  concluido: "bg-green-100 text-green-900",
};

function PainelPage() {
  const navigate = useNavigate();
  const [alertas, setAlertas] = useState<AlertaPainel[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null);

  const carregarAlertas = useCallback(async () => {
    const { data, error } = await supabaseClient
      .from("alertas")
      .select(
        "id, registro_id, nivel, status, emitido_em, registros!alertas_registro_id_fkey(tema, nivel_risco, pontuacao_total, criado_em)",
      )
      .order("emitido_em", { ascending: false });

    if (error) {
      throw error;
    }

    setAlertas(data ?? []);
  }, []);

  useEffect(() => {
    let ativo = true;

    async function inicializar() {
      try {
        await carregarAlertas();
        if (ativo) setErro(null);
      } catch (error) {
        if (!ativo) return;
        console.error("[Painel] Falha ao carregar alertas.", error);
        setErro("Não foi possível carregar os alertas. Tente atualizar a página.");
        toast.error("Falha ao carregar os alertas.");
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void inicializar();

    const canal = supabaseClient
      .channel("painel-alertas")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alertas" },
        (payload) => {
          const novoAlerta = payload.new as { nivel?: string };
          toast.success("Novo alerta recebido", {
            description: novoAlerta.nivel
              ? `Nível de atenção: ${novoAlerta.nivel}.`
              : "A lista foi atualizada.",
          });
          void carregarAlertas().catch((error) => {
            console.error("[Painel] Falha ao atualizar alertas em tempo real.", error);
            toast.error("O novo alerta chegou, mas a lista não pôde ser atualizada.");
          });
        },
      )
      .subscribe((status, subscriptionError) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("[Painel] Falha na conexão Realtime.", subscriptionError);
          toast.error("Não foi possível conectar às atualizações em tempo real.");
        }
      });

    return () => {
      ativo = false;
      void supabaseClient.removeChannel(canal);
    };
  }, [carregarAlertas]);

  const contadores = useMemo(
    () => ({
      total: alertas.length,
      pendentes: alertas.filter((alerta) => alerta.status === "pendente").length,
      concluidos: alertas.filter((alerta) => alerta.status === "concluido").length,
    }),
    [alertas],
  );

  const alertasAtivos = useMemo(
    () => alertas.filter((alerta) => alerta.status !== "concluido"),
    [alertas],
  );

  async function alterarStatus(alerta: AlertaPainel, status: StatusAlerta) {
    if (atualizandoId) return;
    setAtualizandoId(alerta.id);
    try {
      const { error: sessionError, data: sessionData } = await supabaseClient.auth.getSession();
      if (sessionError || !sessionData.session) {
        if (sessionError) console.error("[Painel] Falha ao verificar sessão.", sessionError);
        toast.error("Sua sessão expirou. Entre novamente para atualizar o alerta.");
        void navigate({ to: "/painel/login", replace: true });
        return;
      }

      const { error } = await supabaseClient
        .from("alertas")
        .update({ status, visualizado: true, visualizado_por: sessionData.session.user.id })
        .eq("id", alerta.id);

      if (error) {
        console.error("[Painel] Falha ao atualizar status do alerta.", error);
        toast.error("Não foi possível atualizar o status do alerta.");
        return;
      }

      setAlertas((atuais) =>
        atuais.map((item) => (item.id === alerta.id ? { ...item, status } : item)),
      );
      toast.success(`Alerta marcado como ${STATUS_LABEL[status].toLowerCase()}.`);
    } catch (error) {
      console.error("[Painel] Falha inesperada ao atualizar alerta.", error);
      toast.error("Não foi possível atualizar o status do alerta.");
    } finally {
      setAtualizandoId(null);
    }
  }

  async function sair() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      console.error("[Painel] Falha ao encerrar sessão.", error);
      toast.error("Não foi possível encerrar a sessão.");
      return;
    }
    void navigate({ to: "/painel/login", replace: true });
  }

  return (
    <main
      className="min-h-screen space-y-6 bg-[var(--cor-fundo)] px-4 py-6 sm:px-6 lg:px-8"
      style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
    >
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-sky-800">
            Saúde Mental na Escola
          </p>
          <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Painel de alertas</h1>
          <p className="mt-1 text-sm text-slate-600">
            Acompanhe os pedidos de atenção enviados à equipe escolar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void sair()}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          Sair
        </button>
      </header>

      <section aria-label="Resumo dos alertas" className="grid gap-4 sm:grid-cols-3">
        <Contador titulo="Total de alertas" valor={contadores.total} cor="sky" />
        <Contador titulo="Pendentes" valor={contadores.pendentes} cor="amber" />
        <Contador titulo="Concluídos" valor={contadores.concluidos} cor="green" />
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
          <h2 className="text-lg font-extrabold text-slate-900">Alertas ativos</h2>
          <p className="mt-1 text-sm text-slate-600">
            Os alertas concluídos continuam contabilizados no resumo.
          </p>
        </div>

        {erro && (
          <div
            className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-800"
            role="alert"
          >
            {erro}
            <button
              type="button"
              onClick={() => {
                setCarregando(true);
                void carregarAlertas()
                  .then(() => setErro(null))
                  .catch((error) => {
                    console.error("[Painel] Falha ao tentar novamente carregar alertas.", error);
                    setErro("Não foi possível carregar os alertas. Tente atualizar a página.");
                  })
                  .finally(() => setCarregando(false));
              }}
              className="rounded-md border border-red-300 px-3 py-1.5 hover:bg-red-100"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {carregando ? (
          <p className="p-6 text-center text-sm text-slate-600" role="status">
            Carregando alertas…
          </p>
        ) : !erro && alertasAtivos.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-600">
            Não há alertas ativos no momento.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3 sm:px-6">
                    Tema
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Nível
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Emitido
                  </th>
                  <th scope="col" className="px-4 py-3 sm:px-6">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alertasAtivos.map((alerta) => (
                  <tr key={alerta.id} className="align-middle">
                    <td className="px-4 py-4 font-bold text-slate-900 sm:px-6">
                      {alerta.registros
                        ? LABELS_TEMA[alerta.registros.tema]
                        : "Registro indisponível"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          alerta.nivel === "grave"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {alerta.nivel === "grave" ? "Grave" : "Médio"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_CLASS[alerta.status]}`}
                      >
                        {STATUS_LABEL[alerta.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                      {new Date(alerta.emitido_em).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      <div className="flex flex-wrap gap-2">
                        {alerta.status === "pendente" && (
                          <button
                            type="button"
                            disabled={atualizandoId !== null}
                            onClick={() => void alterarStatus(alerta, "em_atendimento")}
                            className="rounded-md bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                          >
                            Assumir
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={atualizandoId !== null}
                          onClick={() => void alterarStatus(alerta, "concluido")}
                          className="rounded-md bg-green-700 px-3 py-2 text-xs font-bold text-white hover:bg-green-800 disabled:opacity-50"
                        >
                          Concluir
                        </button>
                      </div>
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

function Contador({ titulo, valor, cor }: { titulo: string; valor: number; cor: string }) {
  const cores: Record<string, string> = {
    sky: "border-sky-200 bg-sky-50 text-sky-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    green: "border-green-200 bg-green-50 text-green-900",
  };

  return (
    <article className={`rounded-xl border p-5 shadow-sm ${cores[cor]}`}>
      <p className="text-sm font-bold">{titulo}</p>
      <p className="mt-2 text-3xl font-extrabold" aria-live="polite">
        {valor}
      </p>
    </article>
  );
}
