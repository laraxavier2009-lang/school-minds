import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { LABELS_TEMA, type NivelRisco, type Tema } from "@/lib/triagem";

type StatusEnum = "pendente" | "em_atendimento" | "concluido" | "nao_localizado";

interface AlertaRow {
  id: string;
  registro_id: string;
  status: StatusEnum;
  prazo_dias: number;
  criado_em: string;
  atualizado_em: string;
  registros: { tema: Tema; nivel_risco: NivelRisco; criado_em: string } | null;
}

export const Route = createFileRoute("/painel/")({
  head: () => ({ meta: [{ title: "Painel da escola — Saúde Mental" }] }),
  component: PainelPageGuarded,
});

function PainelPageGuarded() {
  return (
    <ProtectedRoute>
      <PainelPage />
    </ProtectedRoute>
  );
}

function PainelPage() {
  const navigate = useNavigate();
  const [pronto, setPronto] = useState(false);
  const [alertas, setAlertas] = useState<AlertaRow[]>([]);
  const [erroCarga, setErroCarga] = useState<string | null>(null);

  async function carregar() {
    setPronto(false);
    try {
      const { data, error } = await supabase
        .from("alertas")
        .select("id, registro_id, status, prazo_dias, criado_em, atualizado_em, registros(tema, nivel_risco, criado_em)")
        .order("criado_em", { ascending: false });

      if (error) {
        setAlertas([]);
        setErroCarga("Não foi possível carregar os alertas no momento.");
        toast.error("Não foi possível carregar os alertas.");
        return;
      }

      setErroCarga(null);
      setAlertas((data as unknown as AlertaRow[]) ?? []);
    } catch {
      setAlertas([]);
      setErroCarga("Não foi possível carregar os alertas no momento.");
    } finally {
      setPronto(true);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  useEffect(() => {
    if (!pronto) return;
    const ch = supabase
      .channel("alertas_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "alertas" }, () => {
        toast.error("🚨 Novo alerta recebido", { description: "Atualizando a lista..." });
        void carregar();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [pronto]);

  const resumo = useMemo(() => {
    const seteDiasAtras = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let graves = 0;
    let medios = 0;
    let concluidos = 0;
    for (const a of alertas) {
      const dt = new Date(a.criado_em).getTime();
      const nivel = a.registros?.nivel_risco;
      if (a.status !== "concluido" && nivel === "grave") graves++;
      if (a.status !== "concluido" && nivel === "medio") medios++;
      if (a.status === "concluido" && dt >= seteDiasAtras) concluidos++;
    }
    return { graves, medios, concluidos };
  }, [alertas]);

  const grafico = useMemo(() => {
    const trintaDiasAtras = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const counts: Record<Tema, number> = {
      ansiedade: 0,
      tristeza: 0,
      bullying: 0,
      luto: 0,
      estresse: 0,
      pedir_ajuda: 0,
    };
    for (const a of alertas) {
      if (!a.registros) continue;
      const dt = new Date(a.registros.criado_em).getTime();
      if (dt >= trintaDiasAtras) counts[a.registros.tema]++;
    }
    const max = Math.max(1, ...Object.values(counts));
    return { counts, max };
  }, [alertas]);

  async function alterarStatus(id: string, status: StatusEnum) {
    const { error } = await supabase.from("alertas").update({ status }).eq("id", id);
    if (error) {
      toast.error("Não foi possível atualizar o status.");
      return;
    }
    setAlertas((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  async function sair() {
    await supabase.auth.signOut();
    void navigate({ to: "/" });
  }

  if (!pronto) {
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

  return (
    <main className="space-y-5 px-5 pt-6 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: "var(--cor-primaria)" }}>
            Painel da escola
          </h1>
          <p className="text-xs" style={{ color: "var(--cor-texto-leve)" }}>
            Acompanhamento de alertas anônimos
          </p>
        </div>
        <button
          onClick={sair}
          className="rounded-lg border px-3 py-2 text-sm font-semibold"
          style={{ borderColor: "#C8D2DD", color: "var(--cor-texto)" }}
        >
          Sair
        </button>
      </header>

      <section className="grid grid-cols-3 gap-2">
        <CardResumo cor="#FFEBEE" corTexto="#E74C3C" label="Graves pendentes" valor={resumo.graves} />
        <CardResumo cor="#FFF3E0" corTexto="#E67E22" label="Médios pendentes" valor={resumo.medios} />
        <CardResumo cor="#E8F8EF" corTexto="#1E8449" label="Concluídos (7d)" valor={resumo.concluidos} />
      </section>

      {erroCarga && (
        <div className="rounded-2xl border p-4 text-sm" style={{ background: "#FFF3E0", borderColor: "#E67E22", color: "#9C4A14" }}>
          {erroCarga}
        </div>
      )}

      <section className="rounded-2xl bg-white p-4" style={{ boxShadow: "0 2px 12px rgba(27, 108, 168, 0.08)" }}>
        <h2 className="mb-3 text-sm font-extrabold" style={{ color: "var(--cor-texto)" }}>
          Temas nos últimos 30 dias
        </h2>
        <div className="space-y-2">
          {(Object.keys(grafico.counts) as Tema[]).map((t) => {
            const v = grafico.counts[t];
            const pct = (v / grafico.max) * 100;
            return (
              <div key={t} className="flex items-center gap-2 text-xs">
                <span className="w-24" style={{ color: "var(--cor-texto-leve)" }}>
                  {LABELS_TEMA[t]}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--cor-fundo)]">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--cor-primaria)" }} />
                </div>
                <span className="w-6 text-right font-bold" style={{ color: "var(--cor-texto)" }}>
                  {v}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white" style={{ boxShadow: "0 2px 12px rgba(27, 108, 168, 0.08)" }}>
        <h2 className="border-b px-4 py-3 text-sm font-extrabold" style={{ color: "var(--cor-texto)", borderColor: "#E0E6EE" }}>
          Alertas
        </h2>
        {alertas.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm" style={{ color: "var(--cor-texto-leve)" }}>
            Nenhum alerta registrado.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "#E0E6EE" }}>
            {alertas.map((a) => {
              const grave = a.registros?.nivel_risco === "grave";
              return (
                <li key={a.id} className="px-4 py-3" style={{ background: grave ? "#FFEBEE" : "transparent" }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px]" style={{ color: "var(--cor-texto-leve)" }}>
                          #{a.id.slice(0, 8)}
                        </span>
                        {a.registros && (
                          <>
                            <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: "var(--cor-primaria)" }}>
                              {LABELS_TEMA[a.registros.tema]}
                            </span>
                            <BadgeNivel nivel={a.registros.nivel_risco} />
                          </>
                        )}
                      </div>
                      <div className="mt-1 text-[11px]" style={{ color: "var(--cor-texto-leve)" }}>
                        {new Date(a.criado_em).toLocaleString("pt-BR")} · prazo {a.prazo_dias}d
                      </div>
                    </div>
                    <select
                      value={a.status}
                      onChange={(e) => alterarStatus(a.id, e.target.value as StatusEnum)}
                      className="rounded-lg border bg-white px-2 py-1 text-xs font-semibold"
                      style={{ borderColor: "#C8D2DD", color: "var(--cor-texto)" }}
                    >
                      <option value="pendente">Pendente</option>
                      <option value="em_atendimento">Em atendimento</option>
                      <option value="concluido">Concluído</option>
                      <option value="nao_localizado">Não localizado</option>
                    </select>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

function CardResumo({ cor, corTexto, label, valor }: { cor: string; corTexto: string; label: string; valor: number }) {
  return (
    <div className="rounded-2xl p-3 text-center" style={{ background: cor }}>
      <div className="text-2xl font-extrabold" style={{ color: corTexto }}>
        {valor}
      </div>
      <div className="mt-1 text-[11px] font-semibold leading-tight" style={{ color: corTexto }}>
        {label}
      </div>
    </div>
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