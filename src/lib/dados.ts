import { supabase } from "@/integrations/supabase/client";
import type { NivelRisco, Tema } from "@/lib/triagem";

export type StatusEnum = "pendente" | "em_atendimento" | "concluido" | "nao_localizado";

export interface RespostaSessao {
  ordem: number;
  pergunta: string;
  opcao: string;
  peso: number;
}

/**
 * Grava a sessão anônima de triagem: registro + respostas + alerta (médio/grave).
 * Nenhum dado identificável do aluno é enviado.
 */
export async function salvarSessaoTriagem(params: {
  tema: Tema;
  nivel: NivelRisco;
  respostas: RespostaSessao[];
  pediuAjuda?: boolean;
}): Promise<string | null> {
  const pontuacao = params.respostas.reduce((s, r) => s + r.peso, 0);
  const { data, error } = await supabase
    .from("registros")
    .insert({
      tema: params.tema,
      nivel_risco: params.nivel,
      pontuacao_total: pontuacao,
      pediu_ajuda: params.pediuAjuda ?? params.tema === "pedir_ajuda",
      origem: "chatbot",
    })
    .select("id")
    .single();
  if (error || !data) return null;

  if (params.respostas.length > 0) {
    await supabase.from("respostas").insert(
      params.respostas.map((r) => ({
        registro_id: data.id,
        ordem: r.ordem,
        pergunta: r.pergunta,
        opcao: r.opcao,
        peso: r.peso,
      })),
    );
  }

  if (params.nivel === "medio" || params.nivel === "grave") {
    await supabase.from("alertas").insert({
      registro_id: data.id,
      status: "pendente",
      prazo_dias: params.nivel === "grave" ? 1 : 7,
    });
  }

  return data.id;
}

/**
 * Grava um desabafo totalmente anônimo (sem vínculo com sessão, usuário ou IP).
 * Texto vazio é gravado como NULL — o preenchimento é opcional.
 */
export async function salvarDesabafo(tema: string, texto: string): Promise<boolean> {
  const limpo = texto.trim();
  const { error } = await supabase
    .from("desabafos_anonimos")
    .insert(limpo.length > 0 ? { tema, texto: limpo } : { tema });
  return !error;
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
    .select("id, tema, nivel_risco, criado_em, alertas(id, status, anotacoes(id, texto, criado_em))")
    .order("criado_em", { ascending: false })
    .limit(200);
  if (error || !data) return [];

  return data.map((r) => {
    const alerta = (r.alertas as Array<{ id: string; status: StatusEnum; anotacoes: Array<{ id: string; texto: string; criado_em: string }> }> | null)?.[0] ?? null;
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
