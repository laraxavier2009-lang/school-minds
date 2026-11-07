import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  criarAnotacao,
  obterAcompanhamentoAlerta,
  type AnotacaoAlerta,
  type HistoricoStatusAlerta,
} from "@/lib/dados";
import { LABELS_TEMA, type NivelRisco, type Tema } from "@/lib/triagem";
import { supabaseClient } from "@/lib/supabaseClient";
import type { StatusAlerta } from "@/types/database.types";

interface ModalAtendimentoProps {
  alertaId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

type DetalhesAlerta = {
  nivel: "medio" | "grave";
  registros: {
    tema: Tema;
    nivel_risco: NivelRisco;
  } | null;
};

const STATUS_LABEL: Record<StatusAlerta, string> = {
  pendente: "Pendente",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
  nao_localizado: "Não localizado",
};

const NIVEL_LABEL: Record<NivelRisco, string> = {
  leve: "Leve",
  medio: "Médio",
  grave: "Grave",
};

export function ModalAtendimento({ alertaId, isOpen, onClose, onUpdate }: ModalAtendimentoProps) {
  const [anotacoes, setAnotacoes] = useState<AnotacaoAlerta[]>([]);
  const [historico, setHistorico] = useState<HistoricoStatusAlerta[]>([]);
  const [detalhes, setDetalhes] = useState<DetalhesAlerta | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregarProntuario = useCallback(async () => {
    if (!alertaId) return false;

    setCarregando(true);
    setErro(false);
    try {
      const [acompanhamento, alertaResult] = await Promise.all([
        obterAcompanhamentoAlerta(alertaId),
        supabaseClient
          .from("alertas")
          .select("nivel, registros!alertas_registro_id_fkey(tema, nivel_risco)")
          .eq("id", alertaId)
          .maybeSingle(),
      ]);

      if (alertaResult.error) throw alertaResult.error;
      setAnotacoes(acompanhamento.anotacoes);
      setHistorico(acompanhamento.historico);
      setDetalhes(alertaResult.data);
      return true;
    } catch (error) {
      console.error("[Painel] Falha ao carregar o prontuário do alerta.", error);
      setErro(true);
      toast.error("Não foi possível carregar as anotações e o histórico deste alerta.");
      return false;
    } finally {
      setCarregando(false);
    }
  }, [alertaId]);

  useEffect(() => {
    setTexto("");
    setAnotacoes([]);
    setHistorico([]);
    setDetalhes(null);
    setErro(false);
    if (isOpen && alertaId) void carregarProntuario();
  }, [alertaId, carregarProntuario, isOpen]);

  async function adicionarAnotacao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const textoLimpo = texto.trim();
    if (!alertaId || !textoLimpo || salvando) return;

    setSalvando(true);
    try {
      const criada = await criarAnotacao(alertaId, textoLimpo);
      if (!criada) {
        toast.error("Não foi possível salvar a anotação.");
        return;
      }

      setTexto("");
      toast.success("Anotação adicionada.");
      onUpdate();
      const atualizou = await carregarProntuario();
      if (!atualizou) toast.warning("Anotação salva, mas não foi possível atualizar o histórico.");
    } catch (error) {
      console.error("[Painel] Falha ao criar anotação.", error);
      toast.error("Não foi possível salvar a anotação.");
    } finally {
      setSalvando(false);
    }
  }

  const idCurto = alertaId ? alertaId.slice(0, 8) : "";

  return (
    <Dialog
      open={isOpen && alertaId !== null}
      onOpenChange={(aberto) => {
        if (!aberto) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto rounded-2xl border-slate-200 bg-white shadow-[0_2px_12px_rgba(27,108,168,0.08)] sm:max-w-2xl"
        style={{ fontFamily: "Nunito, system-ui, sans-serif", color: "var(--cor-texto)" }}
      >
        <DialogHeader>
          <DialogTitle
            className="text-xl font-bold leading-snug"
            style={{ color: "var(--cor-primaria)" }}
          >
            Prontuário de Acolhimento — Alerta #{idCurto}
          </DialogTitle>
          <DialogDescription>
            Registro confidencial para acompanhamento pela equipe escolar autorizada.
          </DialogDescription>
        </DialogHeader>

        {alertaId && (
          <div className="space-y-6">
            {detalhes && (
              <section aria-label="Informações do alerta" className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-[var(--cor-fundo)] p-3">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Tema</h3>
                  <p className="mt-1 font-semibold">
                    {detalhes.registros ? LABELS_TEMA[detalhes.registros.tema] : "Indisponível"}
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--cor-fundo)] p-3">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Nível de risco
                  </h3>
                  <p className="mt-1 font-semibold">
                    {NIVEL_LABEL[detalhes.nivel === "grave" ? "grave" : "medio"]}
                  </p>
                </div>
              </section>
            )}

            {carregando ? (
              <p className="text-sm text-slate-600" role="status">
                Carregando anotações e histórico…
              </p>
            ) : erro ? (
              <button
                type="button"
                onClick={() => void carregarProntuario()}
                className="rounded-xl border border-red-300 px-3 py-2 text-sm font-bold text-red-800 hover:bg-red-50"
              >
                Tentar carregar novamente
              </button>
            ) : (
              <>
                <section aria-labelledby="historico-alerta-titulo" className="space-y-3">
                  <h3 id="historico-alerta-titulo" className="font-bold">
                    Linha do tempo do atendimento
                  </h3>
                  {historico.length === 0 ? (
                    <p className="text-sm text-slate-600">Ainda não há alterações de status.</p>
                  ) : (
                    <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
                      {historico.map((item) => (
                        <li key={item.id} className="relative text-sm">
                          <span
                            className="absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--cor-primaria)]"
                            aria-hidden="true"
                          />
                          <p className="font-semibold">
                            {item.status_anterior ? `${STATUS_LABEL[item.status_anterior]} → ` : ""}
                            {STATUS_LABEL[item.status_novo]}
                          </p>
                          <time className="text-xs text-slate-500" dateTime={item.criado_em}>
                            {new Date(item.criado_em).toLocaleString("pt-BR")}
                          </time>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>

                <section aria-labelledby="anotacoes-alerta-titulo" className="space-y-3">
                  <h3 id="anotacoes-alerta-titulo" className="font-bold">
                    Histórico de anotações
                  </h3>
                  {anotacoes.length === 0 ? (
                    <p className="text-sm text-slate-600">Ainda não há observações registradas.</p>
                  ) : (
                    <ul className="space-y-3" aria-live="polite">
                      {anotacoes.map((anotacao) => (
                        <li
                          key={anotacao.id}
                          className="rounded-xl border border-slate-200 border-l-4 border-l-[var(--cor-primaria)] bg-white p-3 shadow-[0_2px_12px_rgba(27,108,168,0.08)]"
                        >
                          <p className="mb-1 text-xs font-bold text-[var(--cor-primaria)]">
                            {anotacao.autor ?? "Equipe escolar"}
                          </p>
                          <p className="whitespace-pre-wrap text-sm">{anotacao.texto}</p>
                          <time
                            className="mt-2 block text-xs text-[var(--cor-texto-leve)]"
                            dateTime={anotacao.criado_em}
                          >
                            {new Date(anotacao.criado_em).toLocaleString("pt-BR")}
                          </time>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}

            <form
              className="space-y-3 border-t border-slate-200 pt-4"
              onSubmit={(event) => void adicionarAnotacao(event)}
            >
              <label htmlFor="nova-anotacao" className="block text-sm font-bold">
                Nova anotação
              </label>
              <Textarea
                id="nova-anotacao"
                value={texto}
                onChange={(event) => setTexto(event.target.value)}
                placeholder="Registre uma observação pertinente ao acompanhamento…"
                maxLength={2000}
                disabled={salvando || carregando || erro}
                required
                className="rounded-xl"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Não inclua nomes ou dados de identificação.
                </p>
                <button
                  type="submit"
                  disabled={salvando || carregando || erro || !texto.trim()}
                  className="rounded-xl bg-[var(--cor-primaria)] px-4 py-2 text-sm font-bold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {salvando ? "Salvando…" : "Adicionar anotação"}
                </button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
