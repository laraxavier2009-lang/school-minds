import { supabase } from "@/integrations/supabase/client";
import { supabaseClient } from "@/lib/supabaseClient";
import type { NivelRisco, Tema } from "@/lib/triagem";

export type StatusEnum = "pendente" | "em_atendimento" | "concluido" | "nao_localizado";

export async function salvarResultadoTriagem(
  tema: Tema,
  pontuacao: number,
  nivelRisco: NivelRisco,
): Promise<string> {
  if (!Number.isSafeInteger(pontuacao) || pontuacao < 1) {
    throw new RangeError("A pontuação da triagem deve ser um inteiro positivo.");
  }

  const sessaoId = crypto.randomUUID();
  const registroId = crypto.randomUUID();

  const { error: sessaoError } = await supabaseClient.from("sessao").insert({
    id: sessaoId,
    status: "encerrada",
  });
  if (sessaoError) {
    throw new Error("Não foi possível iniciar o registro anônimo da triagem.", {
      cause: sessaoError,
    });
  }

  const { error: registroError } = await supabaseClient.from("registros").insert({
    id: registroId,
    sessao_id: sessaoId,
    tema,
    nivel_risco: nivelRisco,
    pontuacao_total: pontuacao,
  });
  if (registroError) {
    throw new Error("Não foi possível salvar o resultado da triagem.", {
      cause: registroError,
    });
  }

  if (nivelRisco === "medio" || nivelRisco === "grave") {
    const { error: alertaError } = await supabaseClient.from("alertas").insert({
      id: crypto.randomUUID(),
      registro_id: registroId,
      nivel: nivelRisco,
      status: "pendente",
    });
    if (alertaError) {
      throw new Error("O resultado foi salvo, mas não foi possível criar o alerta.", {
        cause: alertaError,
      });
    }
  }

  return registroId;
}

export interface DesabafoAnonimo {
  id: string;
  texto: string;
  tema: string;
  criado_em: string;
}

export async function listarDesabafos(): Promise<DesabafoAnonimo[]> {
  const { data } = await supabase
    .from("desabafos_anonimos")
    .select("id, texto, tema, criado_em")
    .not("texto", "is", null)
    .order("criado_em", { ascending: false })
    .limit(100);
  return (data ?? []).map((d) => ({ ...d, texto: d.texto ?? "" }));
}

export interface ContatoApoio {
  id: string;
  nome: string;
  descricao: string | null;
  telefone: string | null;
  site: string | null;
}

export async function listarContatosApoio(): Promise<ContatoApoio[]> {
  const { data } = await supabase
    .from("contatos_apoio")
    .select("id, nome, descricao, telefone, site")
    .eq("ativo", true)
    .order("ordem", { ascending: true });
  return data ?? [];
}

export interface SessaoPainel {
  registro_id: string;
  alerta_id: string | null;
  tema: Tema;
  nivel: NivelRisco;
  status: StatusEnum;
  criado_em: string;
  anotacoes: number;
  ultimaAnotacao: string | null;
}

export async function listarSessoes(): Promise<SessaoPainel[]> {
  const { data, error } = await supabase
    .from("registros")
    .select(
      "id, tema, nivel_risco, criado_em, alertas(id, status, anotacoes(id, texto, criado_em))",
    )
    .order("criado_em", { ascending: false })
    .limit(200);
  if (error || !data) return [];

  return data.map((r) => {
    const alerta =
      (
        r.alertas as Array<{
          id: string;
          status: StatusEnum;
          anotacoes: Array<{ id: string; texto: string; criado_em: string }>;
        }> | null
      )?.[0] ?? null;
    const notas = alerta?.anotacoes ?? [];
    const ordenadas = [...notas].sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1));
    return {
      registro_id: r.id,
      alerta_id: alerta?.id ?? null,
      tema: r.tema as Tema,
      nivel: r.nivel_risco as NivelRisco,
      status: alerta?.status ?? "concluido",
      criado_em: r.criado_em,
      anotacoes: notas.length,
      ultimaAnotacao: ordenadas[0]?.texto ?? null,
    };
  });
}

export async function atualizarStatusAlerta(
  alertaId: string,
  anterior: StatusEnum,
  novo: StatusEnum,
): Promise<boolean> {
  const { error } = await supabase.from("alertas").update({ status: novo }).eq("id", alertaId);
  if (error) return false;
  const { data: sess } = await supabase.auth.getUser();
  if (sess.user) {
    await supabase.from("historico_status").insert({
      alerta_id: alertaId,
      autor_id: sess.user.id,
      status_anterior: anterior,
      status_novo: novo,
    });
  }
  return true;
}

export async function criarAnotacao(alertaId: string, texto: string): Promise<boolean> {
  const { data: sess } = await supabase.auth.getUser();
  if (!sess.user) return false;
  const { error } = await supabase
    .from("anotacoes")
    .insert({ alerta_id: alertaId, autor_id: sess.user.id, texto });
  return !error;
}
