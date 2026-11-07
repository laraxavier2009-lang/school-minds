import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { GestaoEquipe } from "@/components/GestaoEquipe";
import { ModalAtendimento } from "@/components/ModalAtendimento";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MuralDesabafos } from "@/components/MuralDesabafos";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  obterEstatisticasPortal,
  type EtapaAcessoPortal,
  type EstatisticasPortal,
} from "@/lib/dados";
import { LABELS_TEMA, type NivelRisco, type Tema } from "@/lib/triagem";
import type { CargoEquipe, StatusAlerta } from "@/types/database.types";

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
    criado_em: string;
  } | null;
};

const STATUS_LABEL: Record<StatusAlerta, string> = {
  pendente: "Pendente",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
  nao_localizado: "Não localizado",
};

const STATUS_CLASS: Record<StatusAlerta, string> = {
  pendente: "bg-amber-100 text-amber-900",
  em_atendimento: "bg-blue-100 text-blue-900",
  concluido: "bg-green-100 text-green-900",
  nao_localizado: "bg-red-100 text-red-900",
};

const ETAPA_LABEL: Record<EtapaAcessoPortal, string> = {
  portal: "Entrada",
  temas: "Temas",
  triagem: "Triagem",
  resultado: "Resultado",
};

const NIVEL_LABEL: Record<NivelRisco, string> = {
  leve: "Leve",
  medio: "Médio",
  grave: "Grave",
};

const NIVEL_COR: Record<NivelRisco, string> = {
  leve: "#23845B",
  medio: "#C47A13",
  grave: "#C43D3D",
};

const CARGO_LABEL: Record<CargoEquipe, string> = {
  gestor: "Gestor",
  psicologo: "Psicóloga",
  orientador: "Orientador",
};

const GRAFICO_CONFIG = {
  total: { label: "Total", color: "#167C80" },
} satisfies ChartConfig;

function PainelPage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<"alertas" | "desabafos" | "equipe">("alertas");
  const [perfil, setPerfil] = useState<{ nome: string; cargo: CargoEquipe } | null>(null);
  const [alertas, setAlertas] = useState<AlertaPainel[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null);
  const [estatisticas, setEstatisticas] = useState<EstatisticasPortal | null>(null);
  const [carregandoEstatisticas, setCarregandoEstatisticas] = useState(true);
  const [erroEstatisticas, setErroEstatisticas] = useState(false);
  const [alertaSelecionadoId, setAlertaSelecionadoId] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregarPerfil() {
      try {
        const { data: userData, error: userError } = await supabaseClient.auth.getUser();
        if (userError) throw userError;
        if (!userData.user) throw new Error("Não há usuário autenticado.");

        const { data, error } = await supabaseClient
          .from("equipe_escola")
          .select("nome, cargo")
          .eq("user_id", userData.user.id)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("O perfil da equipe não foi encontrado.");
        if (ativo) setPerfil(data);
      } catch (error) {
        if (!ativo) return;
        console.error("[Painel] Falha ao carregar o perfil da equipe.", error);
        toast.error("Não foi possível carregar o nome e o cargo do usuário.");
      }
    }

    void carregarPerfil();
    return () => {
      ativo = false;
    };
  }, []);

  const carregarAlertas = useCallback(async () => {
    const { data, error } = await supabaseClient
      .from("alertas")
      .select(
        "id, registro_id, nivel, status, emitido_em, registros!alertas_registro_id_fkey(tema, nivel_risco, criado_em)",
      )
      .order("emitido_em", { ascending: false });

    if (error) {
      throw error;
    }

    setAlertas(data ?? []);
  }, []);

  const carregarEstatisticas = useCallback(async () => {
    try {
      setEstatisticas(await obterEstatisticasPortal());
      setErroEstatisticas(false);
    } catch (error) {
      console.error("[Painel] Falha ao carregar estatísticas anônimas.", error);
      setErroEstatisticas(true);
    } finally {
      setCarregandoEstatisticas(false);
    }
  }, []);

  useEffect(() => {
    void carregarEstatisticas();
  }, [carregarEstatisticas]);

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
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "acessos_portal" },
        () => void carregarEstatisticas(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "registros" },
        () => void carregarEstatisticas(),
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
  }, [carregarAlertas, carregarEstatisticas]);

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

  const dadosAcessos = (estatisticas?.acessosPorEtapa ?? []).map(({ etapa, total }) => ({
    etapa: ETAPA_LABEL[etapa],
    total,
  }));
  const dadosNiveis = (estatisticas?.triagensPorNivel ?? []).map(({ nivel, total }) => ({
    nivel,
    total,
  }));
  const totalPorNivel = (nivel: NivelRisco) =>
    estatisticas?.triagensPorNivel.find((item) => item.nivel === nivel)?.total ?? 0;

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
          <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Painel da Escola</h1>
          <p className="mt-1 text-sm text-slate-600">
            Acompanhe alertas, triagens e recursos de acolhimento da escola.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-[var(--cor-primaria)]/20 bg-white px-4 py-2 text-sm font-bold text-[var(--cor-primaria)] shadow-sm">
            {perfil ? `${perfil.nome} | ${CARGO_LABEL[perfil.cargo]}` : "Carregando perfil…"}
          </span>
          <button
            type="button"
            onClick={() => void sair()}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Sair
          </button>
        </div>
      </header>

      <nav
        aria-label="Seções do painel"
        className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={abaAtiva === "alertas"}
          aria-controls="painel-tabpanel-alertas"
          onClick={() => setAbaAtiva("alertas")}
          className={`rounded-xl px-4 py-2.5 text-sm font-extrabold transition-colors ${
            abaAtiva === "alertas"
              ? "bg-[var(--cor-primaria)] text-white"
              : "bg-white text-[var(--cor-primaria)] hover:bg-[var(--cor-fundo)]"
          }`}
        >
          📊 Alertas &amp; Triagens
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={abaAtiva === "desabafos"}
          aria-controls="painel-tabpanel-desabafos"
          onClick={() => setAbaAtiva("desabafos")}
          className={`rounded-xl px-4 py-2.5 text-sm font-extrabold transition-colors ${
            abaAtiva === "desabafos"
              ? "bg-[var(--cor-primaria)] text-white"
              : "bg-white text-[var(--cor-primaria)] hover:bg-[var(--cor-fundo)]"
          }`}
        >
          💬 Mural de Desabafos
        </button>
        {perfil?.cargo === "gestor" && (
          <button
            type="button"
            role="tab"
            aria-selected={abaAtiva === "equipe"}
            aria-controls="painel-tabpanel-equipe"
            onClick={() => setAbaAtiva("equipe")}
            className={`rounded-xl px-4 py-2.5 text-sm font-extrabold transition-colors ${
              abaAtiva === "equipe"
                ? "bg-[var(--cor-primaria)] text-white"
                : "bg-white text-[var(--cor-primaria)] hover:bg-[var(--cor-fundo)]"
            }`}
          >
            👥 Gestão de Equipe
          </button>
        )}
      </nav>

      {abaAtiva === "alertas" && (
        <div
          id="painel-tabpanel-alertas"
          role="tabpanel"
          aria-label="Alertas e triagens"
          className="space-y-6"
        >
          <section aria-label="Resumo dos alertas" className="grid gap-4 sm:grid-cols-3">
            <Contador titulo="Total de alertas" valor={contadores.total} cor="sky" />
            <Contador titulo="Pendentes" valor={contadores.pendentes} cor="amber" />
            <Contador titulo="Concluídos" valor={contadores.concluidos} cor="green" />
          </section>

          <section aria-labelledby="estatisticas-titulo" className="space-y-4">
            <header>
              <h2 id="estatisticas-titulo" className="text-xl font-extrabold text-slate-900">
                Atividade anônima do portal estudantil
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Totais por etapa e nível de atenção, sem nomes, e-mails ou respostas individuais.
              </p>
            </header>

            {erroEstatisticas && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-800">
                Não foi possível carregar as estatísticas anônimas.
                <button
                  type="button"
                  onClick={() => void carregarEstatisticas()}
                  className="rounded-md border border-red-300 px-3 py-1.5 hover:bg-red-100"
                >
                  Atualizar
                </button>
              </div>
            )}

            <section aria-label="Triagens por nível" className="grid gap-3 sm:grid-cols-3">
              <Contador titulo="Nível leve" valor={totalPorNivel("leve")} cor="green" />
              <Contador titulo="Nível médio" valor={totalPorNivel("medio")} cor="amber" />
              <Contador titulo="Nível grave" valor={totalPorNivel("grave")} cor="red" />
            </section>

            {carregandoEstatisticas && !estatisticas ? (
              <p
                className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600"
                role="status"
              >
                Carregando estatísticas anônimas…
              </p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <h3 className="font-extrabold text-slate-900">Acessos por etapa</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Visitas registradas após continuar no portal.
                  </p>
                  <ChartContainer
                    config={GRAFICO_CONFIG}
                    className="mt-3 h-[240px] w-full aspect-auto"
                  >
                    <BarChart
                      data={dadosAcessos}
                      margin={{ top: 24, right: 12, bottom: 4, left: 0 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="etapa" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="total" position="top" />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <h3 className="font-extrabold text-slate-900">Triagens por nível de atenção</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Cada resultado concluído conta uma vez.
                  </p>
                  <ChartContainer
                    config={GRAFICO_CONFIG}
                    className="mt-3 h-[240px] w-full aspect-auto"
                  >
                    <BarChart
                      data={dadosNiveis}
                      margin={{ top: 24, right: 12, bottom: 4, left: 0 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="nivel"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(nivel: NivelRisco) => NIVEL_LABEL[nivel]}
                      />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                        {dadosNiveis.map(({ nivel }) => (
                          <Cell key={nivel} fill={NIVEL_COR[nivel]} />
                        ))}
                        <LabelList dataKey="total" position="top" />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </section>
              </div>
            )}
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
                        console.error(
                          "[Painel] Falha ao tentar novamente carregar alertas.",
                          error,
                        );
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
                            <button
                              type="button"
                              onClick={() => setAlertaSelecionadoId(alerta.id)}
                              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                            >
                              📋 Ver Atendimento
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
        </div>
      )}

      {abaAtiva === "desabafos" && (
        <div id="painel-tabpanel-desabafos" role="tabpanel" aria-label="Mural de desabafos">
          <MuralDesabafos />
        </div>
      )}

      {abaAtiva === "equipe" && perfil?.cargo === "gestor" && (
        <div id="painel-tabpanel-equipe" role="tabpanel" aria-label="Gestão de equipe">
          <GestaoEquipe />
        </div>
      )}

      <ModalAtendimento
        alertaId={alertaSelecionadoId}
        isOpen={alertaSelecionadoId !== null}
        onClose={() => setAlertaSelecionadoId(null)}
        onUpdate={() => {
          void carregarAlertas().catch((error) => {
            console.error("[Painel] Falha ao atualizar alertas após anotação.", error);
            toast.error("A anotação foi salva, mas os alertas não puderam ser atualizados.");
          });
        }}
      />
    </main>
  );
}

function Contador({ titulo, valor, cor }: { titulo: string; valor: number; cor: string }) {
  const cores: Record<string, string> = {
    sky: "border-sky-200 bg-sky-50 text-sky-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    green: "border-green-200 bg-green-50 text-green-900",
    red: "border-red-200 bg-red-50 text-red-900",
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
