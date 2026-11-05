import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CargoGerenciavel = "psicologo" | "orientador";

function responder(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return responder(405, { error: "Método não permitido." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey =
    Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    console.error("[gestao-usuarios] Configuração Supabase incompleta.");
    return responder(500, { error: "Serviço de cadastro indisponível." });
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return responder(401, { error: "Autenticação obrigatória." });
  }

  const token = authorization.slice("Bearer ".length);
  const callerClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await callerClient.auth.getUser(token);
  if (authError || !authData.user) {
    return responder(401, { error: "Sessão inválida ou expirada." });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: gestor, error: gestorError } = await adminClient
    .from("equipe_escola")
    .select("cargo")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (gestorError) {
    console.error("[gestao-usuarios] Falha ao verificar cargo do solicitante.", gestorError);
    return responder(500, { error: "Não foi possível verificar as permissões." });
  }
  if (gestor?.cargo !== "gestor") {
    return responder(403, { error: "Somente gestores podem cadastrar membros da equipe." });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return responder(400, { error: "Corpo da requisição inválido." });
  }

  if (!payload || typeof payload !== "object") {
    return responder(400, { error: "Informe nome, e-mail e cargo." });
  }

  const body = payload as Record<string, unknown>;
  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const cargo = body.cargo;

  if (!nome || nome.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return responder(400, { error: "Informe um nome e um e-mail válidos." });
  }
  if (cargo !== "psicologo" && cargo !== "orientador") {
    return responder(400, { error: "O cargo deve ser psicologo ou orientador." });
  }

  const cargoGerenciavel: CargoGerenciavel = cargo;
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    { data: { nome, cargo: cargoGerenciavel } },
  );
  if (inviteError || !inviteData.user) {
    console.error("[gestao-usuarios] Falha ao enviar convite.", inviteError);
    return responder(400, {
      error: inviteError?.message ?? "Não foi possível criar o usuário no Supabase Auth.",
    });
  }

  const { error: profileError } = await adminClient.from("equipe_escola").insert({
    id: inviteData.user.id,
    nome,
    email,
    cargo: cargoGerenciavel,
    criado_por: authData.user.id,
  });
  if (profileError) {
    console.error("[gestao-usuarios] Convite enviado, mas falhou a criação do perfil.", profileError);
    const { error: rollbackError } = await adminClient.auth.admin.deleteUser(inviteData.user.id);
    if (rollbackError) {
      console.error("[gestao-usuarios] Falha ao remover usuário sem perfil.", rollbackError);
    }
    return responder(500, {
      error: "Não foi possível concluir o cadastro. O convite foi cancelado; tente novamente.",
    });
  }

  return responder(201, {
    id: inviteData.user.id,
    email,
    cargo: cargoGerenciavel,
  });
});
