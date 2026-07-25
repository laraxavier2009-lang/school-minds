import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { LABELS_TEMA, type NivelRisco, type Tema } from "@/lib/triagem";

type StatusEnum = "pendente" | "em_atendimento" | "concluido";

interface AlertaMock {
  id: string;
  tema: Tema;
  nivel: NivelRisco;
  status: StatusEnum;
  criado_em: string;
  anotacao?: string;
}

export const Route = createFileRoute("/painel/")({
  head: () => ({ meta: [{ title: "Painel de Gestão Escolar — Saúde Mental" }] }),
  component: PainelPage,
});

const TEMAS_TODOS: Tema[] = ["ansiedade", "tristeza", "bullying", "luto", "estresse", "pedir_ajuda"];

function gerarMock(): AlertaMock[] {
  const agora = Date.now();
  const hora = 60 * 60 * 1000;
  const dia = 24 * hora;
  const base: Array<Omit<AlertaMock, "id">> = [
    { tema: "ansiedade", nivel: "grave", status: "pendente", criado_em: new Date(agora - 2 * hora).toISOString() },
    { tema: "bullying", nivel: "grave", status: "em_atendimento", criado_em: new Date(agora - 8 * hora).toISOString() },
    { tema: "tristeza", nivel: "medio", status: "pendente", criado_em: new Date(agora - 1 * dia).toISOString() },
    { tema: "pedir_ajuda", nivel: "grave", status: "pendente", criado_em: new Date(agora - 30 * 60 * 1000).toISOString() },
    { tema: "estresse", nivel: "medio", status: "em_atendimento", criado_em: new Date(agora - 2 * dia).toISOString() },
    { tema: "luto", nivel: "medio", status: "pendente", criado_em: new Date(agora - 3 * dia).toISOString() },
    { tema: "ansiedade", nivel: "leve", status: "concluido", criado_em: new Date(agora - 4 * dia).toISOString() },
    { tema: "tristeza", nivel: "leve", status: "concluido", criado_em: new Date(agora - 5 * dia).toISOString() },
    { tema: "bullying", nivel: "medio", status: "concluido", criado_em: new Date(agora - 6 * dia).toISOString() },
    { tema: "estresse", nivel: "leve", status: "concluido", criado_em: new Date(agora - 2 * dia).toISOString() },
  ];
  return base.map((b, i) => ({ ...b, id: `mock-${i}-${Math.random().toString(36).slice(2, 10)}` }));
}

function PainelPage() {
  const navigate = useNavigate();
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [alertas, setAlertas] = useState<AlertaMock[]>([]);
  const [filtroNivel, setFiltroNivel] = useState<"todos" | NivelRisco>("todos");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | StatusEnum>("todos");
  const [anotandoId, setAnotandoId] = useState<string | null>(null);
  const [rascunhoAnotacao, setRascunhoAnotacao] = useState("");

  useEffect(() => {
    try {
      const sess = window.localStorage.getItem("painel_simulado_sessao");
      if (!sess) {
        setAutorizado(false);
        void navigate({ to: "/painel/login" });
        return;
      }
      setAutorizado(true);
      setAlertas(gerarMock());
    } catch {
      setAutorizado(false);
      void navigate({ to: "/painel/login" });
    }
  }, [navigate]);

  // Simulação de realtime: dispara um alerta GRAVE após 6s.
  useEffect(() => {
    if (!autorizado) return;
    const t = setTimeout(() => {
      const novo: AlertaMock = {
        id: `mock-rt-${Math.random().toString(36).slice(2, 10)}`,
        tema: "pedir_ajuda",
        nivel: "grave",
        status: "pendente",
        criado_em: new Date().toISOString(),
      };
      setAlertas((prev) => [novo, ...prev]);
      toast.error("🚨 Novo alerta GRAVE recebido", {
        description: `Tema: ${LABELS_TEMA[novo.tema]} • requer atenção imediata`,
      });
    }, 6000);
    return () => clearTimeout(t);
  }, [autorizado]);

  const resumo = useMemo(() => {
    const seteDiasAtras = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let graves = 0;
    let medios = 0;
    let concluidos = 0;
    for (const a of alertas) {
      const dt = new Date(a.criado_em).getTime();
      if (a.status !== "concluido" && a.nivel === "grave") graves++;
      if (a.status !== "concluido" && a.nivel === "medio") medios++;
      if (a.status === "concluido" && dt >= seteDiasAtras) concluidos++;
    }
    return { graves, medios, concluidos };
  }, [alertas]);

  const grafico = useMemo(() => {
    const counts: Record<Tema, number> = {
      ansiedade: 0, tristeza: 0, bullying: 0, luto: 0, estresse: 0, pedir_ajuda: 0,
    };
    for (const a of alertas) counts[a.tema]++;
    const max = Math.max(1, ...Object.values(counts));
    return { counts, max };
  }, [alertas]);

  const acessosPorDia = useMemo(() => {
    const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const valores = [12, 28, 34, 22, 41, 38, 9];
    const max = Math.max(...valores);
    return { labels, valores, max };
  }, []);

  function alterarStatus(id: string, status: StatusEnum) {
    setAlertas((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    toast.success("Status atualizado");
  }

  function abrirAnotacao(id: string) {
    const atual = alertas.find((a) => a.id === id);
    setRascunhoAnotacao(atual?.anotacao ?? "");
    setAnotandoId(id);
  }

  function salvarAnotacao() {
    if (!anotandoId) return;
    setAlertas((prev) => prev.map((a) => (a.id === anotandoId ? { ...a, anotacao: rascunhoAnotacao.trim() } : a)));
    toast.success("Anotação registrada");
    setAnotandoId(null);
    setRascunhoAnotacao("");
  }

  const alertasFiltrados = useMemo(() => {
    return alertas.filter((a) => {
      if (filtroNivel !== "todos" && a.nivel !== filtroNivel) return false;
      if (filtroStatus !== "todos" && a.status !== filtroStatus) return false;
      return true;
    });
  }, [alertas, filtroNivel, filtroStatus]);

  function exportarCSV() {
    const header = ["id", "tema", "nivel_risco", "status", "criado_em", "anotacao"];
    const linhas = alertas.map((a) => [
      a.id.replace(/-/g, "").slice(0, 8),
      LABELS_TEMA[a.tema],
      a.nivel,
      a.status,
      new Date(a.criado_em).toISOString(),
      (a.anotacao ?? "").replace(/"/g, '""'),
    ]);
    const csv = [header, ...linhas]
      .map((row) => row.map((v) => `"${String(v)}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-saude-mental-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado (CSV anonimizado)");
  }

  function sair() {
    try { window.localStorage.removeItem("painel_simulado_sessao"); } catch { /* ignore */ }
    void navigate({ to: "/painel/login" });
  }

  if (autorizado === null) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3" style={{ color: "var(--cor-texto-leve)" }}>
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-solid"
          style={{ borderColor: "#E0E6EE", borderTopColor: "var(--cor-primaria, #1B6CA8)" }}
          role="status"
          aria-label="Carregando painel"
        />
        <p className="text-sm font-semibold">Carregando painel…</p>
      </main>
    );
  }

  if (!autorizado) return null;

  return (
    <main className="min-h-screen pb-12" style={{ background: "var(--cor-fundo)", fontFamily: "Nunito, system-ui, sans-serif" }}>
      <header
        className="flex items-center justify-between gap-3 px-5 py-4 md:px-8 md:py-5"
        style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(27, 108, 168, 0.08)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="grid h-10 w-10 md:h-12 md:w-12 shrink-0 place-items-center rounded-full text-white font-extrabold"
            style={{ background: "var(--cor-primaria)" }}
            aria-hidden
          >
            SM
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base md:text-xl font-extrabold" style={{ color: "var(--cor-primaria)", lineHeight: 1.15 }}>
              Saúde Mental na Escola
            </h1>
            <p className="truncate text-[11px] md:text-xs font-semibold" style={{ color: "var(--cor-texto-leve)" }}>
              Painel de Gestão Escolar
            </p>
          </div>
        </div>
        <button
          onClick={sair}
          className="shrink-0 rounded-lg border px-3 py-2 md:px-4 text-sm font-bold transition hover:opacity-80"
          style={{ borderColor: "#C8D2DD", color: "var(--cor-texto)", background: "#FFFFFF" }}
        >
          Sair
        </button>
      </header>

      <div className="space-y-5 px-5 pt-5 md:px-8 md:pt-8 md:space-y-6">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-5">
          <CardKPI
            cor="var(--cor-crise, #E74C3C)"
            bg="#FFEBEE"
            label="Crítico — Graves pendentes"
            valor={resumo.graves}
            delay={0}
            pulse={resumo.graves > 0}
          />
          <CardKPI
            cor="var(--cor-alerta, #E67E22)"
            bg="#FFF3E0"
            label="Atenção — Médios aguardando"
            valor={resumo.medios}
            delay={80}
          />
          <CardKPI
            cor="var(--cor-secundaria, #1E8449)"
            bg="#E8F8EF"
            label="Concluídos na semana"
            valor={resumo.concluidos}
            delay={160}
          />
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section
          className="animate-fade-in-up rounded-2xl bg-white p-4 md:p-6"
          style={{ boxShadow: "0 2px 12px rgba(27, 108, 168, 0.08)", animationDelay: "240ms", animationFillMode: "backwards" }}
        >
          <h2 className="mb-3 text-sm md:text-base font-extrabold" style={{ color: "var(--cor-texto)" }}>
            Distribuição por tema
          </h2>
          <div className="flex h-40 md:h-52 items-end justify-between gap-2">
            {TEMAS_TODOS.map((t) => {
              const v = grafico.counts[t];
              const h = Math.max(6, (v / grafico.max) * 100);
              return (
                <div key={t} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-bold" style={{ color: "var(--cor-texto)" }}>{v}</span>
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{ height: `${h}%`, background: "var(--cor-primaria)" }}
                    aria-label={`${LABELS_TEMA[t]}: ${v}`}
                  />
                  <span className="text-[10px] text-center leading-tight" style={{ color: "var(--cor-texto-leve)" }}>
                    {LABELS_TEMA[t]}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section
          className="animate-fade-in-up rounded-2xl bg-white p-4 md:p-6"
          style={{ boxShadow: "0 2px 12px rgba(27, 108, 168, 0.08)", animationDelay: "320ms", animationFillMode: "backwards" }}
        >
          <h2 className="mb-3 text-sm md:text-base font-extrabold" style={{ color: "var(--cor-texto)" }}>
            Acessos por dia da semana
          </h2>
          <div className="flex h-32 md:h-52 items-end justify-between gap-2">
            {acessosPorDia.labels.map((lbl, i) => {
              const v = acessosPorDia.valores[i];
              const h = Math.max(8, (v / acessosPorDia.max) * 100);
              return (
                <div key={lbl} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-bold" style={{ color: "var(--cor-texto)" }}>{v}</span>
                  <div
                    className="w-full rounded-t-md"
                    style={{ height: `${h}%`, background: "var(--cor-secundaria, #1E8449)" }}
                  />
                  <span className="text-[10px]" style={{ color: "var(--cor-texto-leve)" }}>{lbl}</span>
                </div>
              );
            })}
          </div>
        </section>
        </div>

        <section
          className="animate-fade-in-up overflow-hidden rounded-2xl bg-white"
          style={{ boxShadow: "0 2px 12px rgba(27, 108, 168, 0.08)", animationDelay: "400ms", animationFillMode: "backwards" }}
        >
          <div
            className="flex flex-col gap-3 border-b px-4 md:px-6 py-3 md:py-4 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: "#E0E6EE" }}
          >
            <h2 className="text-sm md:text-base font-extrabold" style={{ color: "var(--cor-texto)" }}>
              Sessões recentes
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1 text-[11px] font-bold" style={{ color: "var(--cor-texto-leve)" }}>
                Risco:
                <select
                  value={filtroNivel}
                  onChange={(e) => setFiltroNivel(e.target.value as typeof filtroNivel)}
                  className="rounded-lg border bg-white px-2 py-1 text-[11px] font-semibold"
                  style={{ borderColor: "#C8D2DD", color: "var(--cor-texto)" }}
                >
                  <option value="todos">Todos</option>
                  <option value="grave">Grave</option>
                  <option value="medio">Médio</option>
                  <option value="leve">Leve</option>
                </select>
              </label>
              <label className="flex items-center gap-1 text-[11px] font-bold" style={{ color: "var(--cor-texto-leve)" }}>
                Status:
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value as typeof filtroStatus)}
                  className="rounded-lg border bg-white px-2 py-1 text-[11px] font-semibold"
                  style={{ borderColor: "#C8D2DD", color: "var(--cor-texto)" }}
                >
                  <option value="todos">Todos</option>
                  <option value="pendente">Pendente</option>
                  <option value="em_atendimento">Em atendimento</option>
                  <option value="concluido">Concluído</option>
                </select>
              </label>
              <button
                onClick={exportarCSV}
                className="rounded-lg border px-3 py-1 text-[11px] font-bold transition hover:opacity-80"
                style={{ borderColor: "var(--cor-primaria)", color: "#fff", background: "var(--cor-primaria)" }}
              >
                ⬇ Exportar CSV
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs md:text-sm">
              <thead>
                <tr style={{ background: "#F4F8FC", color: "var(--cor-texto-leve)" }}>
                  <th className="px-3 py-2 font-bold">ID</th>
                  <th className="px-3 py-2 font-bold">Tema</th>
                  <th className="px-3 py-2 font-bold">Risco</th>
                  <th className="px-3 py-2 font-bold">Data/Hora</th>
                  <th className="px-3 py-2 font-bold">Status</th>
                  <th className="px-3 py-2 font-bold">Ação</th>
                </tr>
              </thead>
              <tbody>
                {alertasFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-[12px]" style={{ color: "var(--cor-texto-leve)" }}>
                      Nenhuma sessão corresponde aos filtros selecionados.
                    </td>
                  </tr>
                )}
                {alertasFiltrados.map((a) => {
                  const grave = a.nivel === "grave";
                  return (
                    <tr key={a.id} className="border-t" style={{ background: grave ? "#FFEBEE" : "transparent", borderColor: "#E0E6EE" }}>
                      <td className="px-3 py-2 font-mono text-[11px]" style={{ color: "var(--cor-texto-leve)" }}>
                        #{a.id.replace(/-/g, "").slice(0, 8)}
                        {a.anotacao ? <span title={a.anotacao} className="ml-1">📝</span> : null}
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: "var(--cor-primaria)" }}>
                          {LABELS_TEMA[a.tema]}
                        </span>
                      </td>
                      <td className="px-3 py-2"><BadgeNivel nivel={a.nivel} /></td>
                      <td className="px-3 py-2" style={{ color: "var(--cor-texto)" }}>
                        {new Date(a.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-3 py-2"><BadgeStatus status={a.status} /></td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1">
                          <select
                            value={a.status}
                            onChange={(e) => alterarStatus(a.id, e.target.value as StatusEnum)}
                            className="rounded-lg border bg-white px-2 py-1 text-[11px] font-semibold"
                            style={{ borderColor: "#C8D2DD", color: "var(--cor-texto)" }}
                            aria-label="Alterar status"
                          >
                            <option value="pendente">Pendente</option>
                            <option value="em_atendimento">Em atendimento</option>
                            <option value="concluido">Concluído</option>
                          </select>
                          <button
                            onClick={() => abrirAnotacao(a.id)}
                            className="rounded-lg border px-2 py-1 text-[11px] font-bold transition hover:opacity-80"
                            style={{ borderColor: "#C8D2DD", color: "var(--cor-primaria)", background: "#fff" }}
                            aria-label="Adicionar anotação interna"
                          >
                            📝 Anotar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-center text-[11px]" style={{ color: "var(--cor-texto-leve)" }}>
          Conformidade LGPD — exibimos apenas status, tema e nível de risco. O conteúdo das conversas nunca é mostrado.
        </p>
      </div>

      {anotandoId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15, 30, 45, 0.5)" }}
          onClick={() => setAnotandoId(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-extrabold" style={{ color: "var(--cor-texto)" }}>
              Anotação interna
            </h3>
            <p className="mt-1 text-xs" style={{ color: "var(--cor-texto-leve)" }}>
              Registre ações tomadas por esta sessão. Mantém o anonimato do aluno.
            </p>
            <textarea
              value={rascunhoAnotacao}
              onChange={(e) => setRascunhoAnotacao(e.target.value)}
              rows={5}
              placeholder="Ex.: aluno encaminhado à orientação em 25/07; conversa agendada com responsável."
              className="mt-3 w-full resize-none rounded-lg border bg-white p-3 text-sm outline-none"
              style={{ borderColor: "#C8D2DD", color: "var(--cor-texto)" }}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setAnotandoId(null)}
                className="rounded-lg border px-4 py-2 text-sm font-bold"
                style={{ borderColor: "#C8D2DD", color: "var(--cor-texto)", background: "#fff" }}
              >
                Cancelar
              </button>
              <button
                onClick={salvarAnotacao}
                className="rounded-lg px-4 py-2 text-sm font-bold text-white"
                style={{ background: "var(--cor-primaria)" }}
              >
                Salvar anotação
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function CardKPI({ cor, bg, label, valor, delay, pulse }: { cor: string; bg: string; label: string; valor: number; delay: number; pulse?: boolean }) {
  return (
    <div
      className={`animate-fade-in-up rounded-2xl p-4 ${pulse ? "animate-pulse-alert" : ""}`}
      style={{ background: bg, boxShadow: "0 2px 12px rgba(27, 108, 168, 0.08)", animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <div className="text-3xl font-extrabold" style={{ color: cor }}>{valor}</div>
      <div className="mt-1 text-xs font-bold leading-tight" style={{ color: cor }}>{label}</div>
    </div>
  );
}

function BadgeStatus({ status }: { status: StatusEnum }) {
  const map: Record<StatusEnum, { bg: string; fg: string; label: string }> = {
    pendente: { bg: "#FFF3E0", fg: "#E67E22", label: "Pendente" },
    em_atendimento: { bg: "#E3F1FB", fg: "#1B6CA8", label: "Em atendimento" },
    concluido: { bg: "#E8F8EF", fg: "#1E8449", label: "Concluído" },
  };
  const s = map[status];
  return (
    <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

function BadgeNivel({ nivel }: { nivel: NivelRisco }) {
  const map: Record<NivelRisco, { bg: string; fg: string; label: string }> = {
    leve: { bg: "#E8F8EF", fg: "#1E8449", label: "Leve" },
    medio: { bg: "#FFF3E0", fg: "#E67E22", label: "Médio" },
    grave: { bg: "#FFEBEE", fg: "#E74C3C", label: "Grave" },
  };
  const s = map[nivel];
  return (
    <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}
