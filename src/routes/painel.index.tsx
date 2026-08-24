import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LABELS_TEMA, type NivelRisco, type Tema } from "@/lib/triagem";
import { supabase } from "@/integrations/supabase/client";
import {
  atualizarStatusAlerta,
  criarAnotacao,
  listarSessoes,
  type SessaoPainel,
  type StatusEnum,
} from "@/lib/dados";

export const Route = createFileRoute("/painel/")({
  head: () => ({ meta: [{ title: "Painel de Gestão Escolar — Saúde Mental" }] }),
  component: PainelPage,
});

const TEMAS_TODOS: Tema[] = ["ansiedade", "tristeza", "bullying", "luto", "estresse", "pedir_ajuda"];

const LABELS_CARGO: Record<string, string> = {
  gestor: "Gestor(a)",
  psicologo: "Psicólogo(a)",
  orientador: "Orientador(a)",
};

function PainelPage() {
  const navigate = useNavigate();
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [perfil, setPerfil] = useState<{ nome: string; cargo: string } | null>(null);
  const [alertas, setAlertas] = useState<SessaoPainel[]>([]);
  const [filtroNivel, setFiltroNivel] = useState<"todos" | NivelRisco>("todos");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | StatusEnum>("todos");
  const [anotandoId, setAnotandoId] = useState<string | null>(null);
  const [rascunhoAnotacao, setRascunhoAnotacao] = useState("");
  const [desabafos, setDesabafos] = useState<DesabafoAnonimo[]>([]);
  const [temaAtivo, setTemaAtivo] = useState<number | null>(null);
  const [diaAtivo, setDiaAtivo] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setAutorizado(false);
        void navigate({ to: "/painel/login" });
        return;
      }
      const { data: membro } = await supabase
        .from("equipe_escola")
        .select("nome, cargo")
        .eq("user_id", data.session.user.id)
        .maybeSingle();
      if (!membro || !["gestor", "psicologo", "orientador"].includes(membro.cargo)) {
        toast.error("Acesso não autorizado para este perfil.");
        await supabase.auth.signOut();
        setAutorizado(false);
        void navigate({ to: "/painel/login" });
        return;
      }
      setPerfil({ nome: membro.nome, cargo: membro.cargo });
      setAutorizado(true);
      setAlertas(await listarSessoes());
    })();
  }, [navigate]);

  // Realtime: novos registros chegam ao painel imediatamente.
  useEffect(() => {
    if (!autorizado) return;
    const canal = supabase
      .channel("painel-registros")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "registros" },
        (payload) => {
          const novo = payload.new as { tema: Tema; nivel_risco: NivelRisco };
          if (novo.nivel_risco === "grave") {
            toast.error("🚨 Novo alerta GRAVE recebido", {
              description: `Tema: ${LABELS_TEMA[novo.tema]} • requer atenção imediata`,
            });
          }
          void listarSessoes().then(setAlertas);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
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
    const valores = [0, 0, 0, 0, 0, 0, 0];
    for (const a of alertas) valores[new Date(a.criado_em).getDay()]++;
    const max = Math.max(1, ...valores);
    return { labels, valores, max };
  }, [alertas]);

  async function alterarStatus(sessao: SessaoPainel, status: StatusEnum) {
    if (!sessao.alerta_id) {
      toast.error("Esta sessão é de risco leve e não gera acompanhamento.");
      return;
    }
    const ok = await atualizarStatusAlerta(sessao.alerta_id, sessao.status, status);
    if (!ok) {
      toast.error("Não foi possível atualizar o status.");
      return;
    }
    setAlertas((prev) => prev.map((a) => (a.registro_id === sessao.registro_id ? { ...a, status } : a)));
    toast.success("Status atualizado");
  }

  function abrirAnotacao(sessao: SessaoPainel) {
    if (!sessao.alerta_id) {
      toast.error("Esta sessão é de risco leve e não permite anotações.");
      return;
    }
    setRascunhoAnotacao("");
    setAnotandoId(sessao.alerta_id);
  }

  async function salvarAnotacao() {
    if (!anotandoId) return;
    const texto = rascunhoAnotacao.trim();
    if (!texto) return;
    const ok = await criarAnotacao(anotandoId, texto);
    if (!ok) {
      toast.error("Não foi possível salvar a anotação.");
      return;
    }
    setAlertas(await listarSessoes());
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
      a.registro_id.replace(/-/g, "").slice(0, 8),
      LABELS_TEMA[a.tema],
      a.nivel,
      a.status,
      new Date(a.criado_em).toISOString(),
      (a.ultimaAnotacao ?? "").replace(/"/g, '""'),
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

  async function sair() {
    setPerfil(null);
    await supabase.auth.signOut();
    void navigate({ to: "/painel/login", replace: true });
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
              {perfil ? `${perfil.nome} • ${LABELS_CARGO[perfil.cargo] ?? perfil.cargo}` : "Painel de Gestão Escolar"}
            </p>
          </div>
        </div>
        <button
          onClick={() => void sair()}
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
          <div className="h-40 md:h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={TEMAS_TODOS.map((t) => ({ nome: LABELS_TEMA[t], valor: grafico.counts[t] }))}
                margin={{ top: 16, right: 8, left: -20, bottom: 0 }}
                onMouseLeave={() => setTemaAtivo(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E6EE" vertical={false} />
                <XAxis dataKey="nome" tick={{ fontSize: 10, fill: "#6B7A8D" }} interval={0} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#6B7A8D" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(27,108,168,0.06)" }}
                  formatter={(v: number) => [`${v} sessões`, "Total"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #E0E6EE", fontSize: 12 }}
                />
                <Bar dataKey="valor" radius={[6, 6, 0, 0]} onMouseEnter={(_, i) => setTemaAtivo(i)}>
                  {TEMAS_TODOS.map((t, i) => (
                    <Cell
                      key={t}
                      fill="var(--cor-primaria)"
                      fillOpacity={temaAtivo === null || temaAtivo === i ? 1 : 0.45}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section
          className="animate-fade-in-up rounded-2xl bg-white p-4 md:p-6"
          style={{ boxShadow: "0 2px 12px rgba(27, 108, 168, 0.08)", animationDelay: "320ms", animationFillMode: "backwards" }}
        >
          <h2 className="mb-3 text-sm md:text-base font-extrabold" style={{ color: "var(--cor-texto)" }}>
            Acessos por dia da semana
          </h2>
          <div className="h-40 md:h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={acessosPorDia.labels.map((lbl, i) => ({ nome: lbl, valor: acessosPorDia.valores[i] }))}
                margin={{ top: 16, right: 8, left: -20, bottom: 0 }}
                onMouseLeave={() => setDiaAtivo(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E6EE" vertical={false} />
                <XAxis dataKey="nome" tick={{ fontSize: 10, fill: "#6B7A8D" }} interval={0} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#6B7A8D" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(46,204,113,0.08)" }}
                  formatter={(v: number) => [`${v} acessos`, "Total"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #E0E6EE", fontSize: 12 }}
                />
                <Bar dataKey="valor" radius={[6, 6, 0, 0]} onMouseEnter={(_, i) => setDiaAtivo(i)}>
                  {acessosPorDia.labels.map((lbl, i) => (
                    <Cell
                      key={lbl}
                      fill="var(--cor-secundaria, #2ECC71)"
                      fillOpacity={diaAtivo === null || diaAtivo === i ? 1 : 0.45}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
                    <tr key={a.registro_id} className="border-t" style={{ background: grave ? "#FFEBEE" : "transparent", borderColor: "#E0E6EE" }}>
                      <td className="px-3 py-2 font-mono text-[11px]" style={{ color: "var(--cor-texto-leve)" }}>
                        #{a.registro_id.replace(/-/g, "").slice(0, 8)}
                        {a.ultimaAnotacao ? <span title={a.ultimaAnotacao} className="ml-1">📝</span> : null}
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
                            onChange={(e) => void alterarStatus(a, e.target.value as StatusEnum)}
                            className="rounded-lg border bg-white px-2 py-1 text-[11px] font-semibold"
                            style={{ borderColor: "#C8D2DD", color: "var(--cor-texto)" }}
                            aria-label="Alterar status"
                          >
                            <option value="pendente">Pendente</option>
                            <option value="em_atendimento">Em atendimento</option>
                            <option value="concluido">Concluído</option>
                          </select>
                          <button
                            onClick={() => abrirAnotacao(a)}
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

        <section className="rounded-2xl bg-white p-4 md:p-5" style={{ boxShadow: "0 2px 12px rgba(27, 108, 168, 0.08)" }}>
          <h2 className="text-sm font-extrabold md:text-base" style={{ color: "var(--cor-texto)" }}>
            💬 Mural de desabafos anônimos
          </h2>
          <p className="mt-1 text-[11px]" style={{ color: "var(--cor-texto-leve)" }}>
            Relatos enviados voluntariamente pelos estudantes. Não há qualquer vínculo com identidade, sessão ou dispositivo.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {desabafos.length === 0 && (
              <p className="text-[12px]" style={{ color: "var(--cor-texto-leve)" }}>
                Nenhum desabafo registrado até o momento.
              </p>
            )}
            {desabafos.map((d) => (
              <article
                key={d.id}
                className="rounded-xl border-l-4 p-4"
                style={{ background: "#F7FAFD", borderLeftColor: "var(--cor-primaria)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: "var(--cor-primaria)" }}>
                    {LABELS_TEMA[d.tema as Tema] ?? d.tema}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--cor-texto-leve)" }}>
                    {new Date(d.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed" style={{ color: "var(--cor-texto)" }}>
                  {d.texto}
                </p>
              </article>
            ))}
          </div>
        </section>

        <p className="text-center text-[11px]" style={{ color: "var(--cor-texto-leve)" }}>
          Conformidade LGPD — sessões exibem apenas status, tema e nível de risco. Os desabafos são anônimos e sem rastreabilidade.
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
                onClick={() => void salvarAnotacao()}
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
    nao_localizado: { bg: "#ECEFF1", fg: "#607D8B", label: "Não localizado" },
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
