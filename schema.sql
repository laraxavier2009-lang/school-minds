-- Schema base do Saúde Mental na Escola.
-- Execute em um projeto Supabase novo. Em bases existentes, aplique uma migration
-- revisada para preservar e migrar os dados legados.

DO $$ BEGIN
  CREATE TYPE public.cargo_enum AS ENUM ('gestor', 'psicologo', 'orientador');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.tema_enum AS ENUM (
    'ansiedade', 'tristeza', 'bullying', 'luto', 'estresse', 'pedir_ajuda'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.nivel_enum AS ENUM ('leve', 'medio', 'grave');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.status_enum AS ENUM (
    'pendente', 'em_atendimento', 'concluido', 'nao_localizado'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.equipe_escola (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid GENERATED ALWAYS AS (id) STORED UNIQUE,
  nome text NOT NULL,
  email text NOT NULL UNIQUE,
  cargo public.cargo_enum NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid REFERENCES public.equipe_escola(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.sessao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iniciada_em timestamptz NOT NULL DEFAULT now(),
  encerrada_em timestamptz,
  status text NOT NULL DEFAULT 'iniciada'
    CHECK (status IN ('iniciada', 'encerrada'))
);

CREATE TABLE IF NOT EXISTS public.registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id uuid REFERENCES public.sessao(id) ON DELETE SET NULL,
  tema text NOT NULL
    CHECK (tema IN ('ansiedade', 'tristeza', 'bullying', 'luto', 'estresse', 'pedir_ajuda')),
  pontuacao_total integer CHECK (pontuacao_total IS NULL OR pontuacao_total >= 0),
  nivel_risco text NOT NULL CHECK (nivel_risco IN ('leve', 'medio', 'grave')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  pediu_ajuda boolean NOT NULL DEFAULT false,
  origem text NOT NULL DEFAULT 'chatbot'
);

COMMENT ON TABLE public.registros IS
  'Dados estruturados e anônimos de triagem. Nunca armazene nomes de estudantes ou texto de conversa nesta tabela.';

CREATE TABLE IF NOT EXISTS public.alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id uuid NOT NULL REFERENCES public.registros(id) ON DELETE CASCADE,
  nivel text NOT NULL CHECK (nivel IN ('medio', 'grave')),
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'em_atendimento', 'concluido', 'nao_localizado')),
  visualizado boolean NOT NULL DEFAULT false,
  visualizado_em timestamptz,
  visualizado_por uuid REFERENCES public.equipe_escola(id) ON DELETE SET NULL,
  emitido_em timestamptz NOT NULL DEFAULT now(),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  prazo_dias integer NOT NULL DEFAULT 7 CHECK (prazo_dias > 0)
);

CREATE TABLE IF NOT EXISTS public.desabafos_anonimos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id uuid REFERENCES public.registros(id) ON DELETE SET NULL,
  mensagem text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  -- Colunas legadas mantidas para leitura de dados existentes da aplicação.
  texto text,
  tema text
);

CREATE TABLE IF NOT EXISTS public.historico_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alerta_id uuid NOT NULL REFERENCES public.alertas(id) ON DELETE CASCADE,
  status_anterior text CHECK (
    status_anterior IS NULL OR
    status_anterior IN ('pendente', 'em_atendimento', 'concluido', 'nao_localizado')
  ),
  status_novo text NOT NULL
    CHECK (status_novo IN ('pendente', 'em_atendimento', 'concluido', 'nao_localizado')),
  alterado_por uuid REFERENCES public.equipe_escola(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  -- Coluna legada mantida para compatibilidade com clientes gerados anteriormente.
  autor_id uuid REFERENCES public.equipe_escola(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.anotacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alerta_id uuid NOT NULL REFERENCES public.alertas(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL REFERENCES public.equipe_escola(id) ON DELETE CASCADE,
  texto text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Tabelas adicionais utilizadas pelo portal e pelo painel.
CREATE TABLE IF NOT EXISTS public.acessos_portal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa text NOT NULL CHECK (etapa IN ('portal', 'temas', 'triagem', 'resultado')),
  tema public.tema_enum,
  nivel_risco public.nivel_enum,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (etapa IN ('portal', 'temas') AND tema IS NULL AND nivel_risco IS NULL)
    OR (etapa = 'triagem' AND tema IS NOT NULL AND nivel_risco IS NULL)
    OR (etapa = 'resultado' AND nivel_risco IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id uuid NOT NULL REFERENCES public.registros(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  pergunta text NOT NULL,
  opcao text NOT NULL,
  peso integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contatos_apoio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  telefone text,
  site text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.registro_estatistico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id uuid NOT NULL REFERENCES public.registros(id) ON DELETE CASCADE,
  tema text NOT NULL,
  nivel_gravidade text NOT NULL,
  semana_ano integer NOT NULL CHECK (semana_ano BETWEEN 1 AND 53),
  ano integer NOT NULL CHECK (ano BETWEEN 2000 AND 9999)
);

CREATE INDEX IF NOT EXISTS registros_sessao_id_idx ON public.registros(sessao_id);
CREATE INDEX IF NOT EXISTS alertas_emitido_em_idx ON public.alertas(emitido_em DESC);
CREATE INDEX IF NOT EXISTS respostas_registro_id_idx ON public.respostas(registro_id);
CREATE INDEX IF NOT EXISTS anotacoes_alerta_id_idx ON public.anotacoes(alerta_id);
CREATE INDEX IF NOT EXISTS historico_status_alerta_id_idx ON public.historico_status(alerta_id);
CREATE INDEX IF NOT EXISTS acessos_portal_etapa_data_idx
  ON public.acessos_portal(etapa, criado_em DESC);
CREATE INDEX IF NOT EXISTS acessos_portal_nivel_data_idx
  ON public.acessos_portal(nivel_risco, criado_em DESC)
  WHERE nivel_risco IS NOT NULL;
CREATE INDEX IF NOT EXISTS registro_estatistico_periodo_idx
  ON public.registro_estatistico(ano, semana_ano);

CREATE OR REPLACE FUNCTION public.cargo_equipe_atual()
RETURNS public.cargo_enum
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT equipe.cargo
  FROM public.equipe_escola AS equipe
  WHERE equipe.id = (SELECT auth.uid())
$$;

REVOKE ALL ON FUNCTION public.cargo_equipe_atual() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cargo_equipe_atual() TO authenticated;

CREATE OR REPLACE FUNCTION public.tg_set_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_historico_status_alerta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.historico_status (
      alerta_id, status_anterior, status_novo, alterado_por, autor_id
    )
    VALUES (
      NEW.id, OLD.status, NEW.status, (SELECT auth.uid()), (SELECT auth.uid())
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_historico_status_alerta() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_alertas_historico_status ON public.alertas;
CREATE TRIGGER trg_alertas_historico_status
  AFTER UPDATE OF status ON public.alertas
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.tg_historico_status_alerta();

DROP TRIGGER IF EXISTS trg_alertas_atualizado_em ON public.alertas;
CREATE TRIGGER trg_alertas_atualizado_em
  BEFORE UPDATE ON public.alertas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_atualizado_em();

DROP TRIGGER IF EXISTS trg_anotacoes_atualizado_em ON public.anotacoes;
CREATE TRIGGER trg_anotacoes_atualizado_em
  BEFORE UPDATE ON public.anotacoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_atualizado_em();

DROP TRIGGER IF EXISTS trg_contatos_apoio_atualizado_em ON public.contatos_apoio;
CREATE TRIGGER trg_contatos_apoio_atualizado_em
  BEFORE UPDATE ON public.contatos_apoio
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_atualizado_em();

ALTER TABLE public.equipe_escola ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desabafos_anonimos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acessos_portal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contatos_apoio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registro_estatistico ENABLE ROW LEVEL SECURITY;

-- Gestores têm CRUD total. A função SECURITY DEFINER evita recursão de RLS.
DO $$
DECLARE
  tabela text;
BEGIN
  FOREACH tabela IN ARRAY ARRAY[
    'equipe_escola', 'sessao', 'registros', 'alertas', 'desabafos_anonimos',
    'historico_status', 'anotacoes', 'acessos_portal', 'respostas',
    'contatos_apoio', 'registro_estatistico'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS gestor_acesso_total ON public.%I', tabela);
    EXECUTE format(
      'CREATE POLICY gestor_acesso_total ON public.%I FOR ALL TO authenticated USING ((SELECT public.cargo_equipe_atual()) = ''gestor''::public.cargo_enum) WITH CHECK ((SELECT public.cargo_equipe_atual()) = ''gestor''::public.cargo_enum)',
      tabela
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS equipe_escola_select_proprio_perfil ON public.equipe_escola;
CREATE POLICY equipe_escola_select_proprio_perfil
  ON public.equipe_escola FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS sessao_insert_anon ON public.sessao;
CREATE POLICY sessao_insert_anon
  ON public.sessao FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS registros_insert_anon ON public.registros;
CREATE POLICY registros_insert_anon
  ON public.registros FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS alertas_insert_anon ON public.alertas;
CREATE POLICY alertas_insert_anon
  ON public.alertas FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS desabafos_insert_anon ON public.desabafos_anonimos;
CREATE POLICY desabafos_insert_anon
  ON public.desabafos_anonimos FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS equipe_acompanhamento_select ON public.equipe_escola;
DROP POLICY IF EXISTS alertas_acompanhamento_select ON public.alertas;
DROP POLICY IF EXISTS alertas_acompanhamento_update ON public.alertas;
DROP POLICY IF EXISTS registros_acompanhamento_select ON public.registros;
DROP POLICY IF EXISTS registros_acompanhamento_update ON public.registros;
DROP POLICY IF EXISTS anotacoes_acompanhamento_select ON public.anotacoes;
DROP POLICY IF EXISTS anotacoes_acompanhamento_insert ON public.anotacoes;
DROP POLICY IF EXISTS anotacoes_acompanhamento_update ON public.anotacoes;
DROP POLICY IF EXISTS historico_acompanhamento_select ON public.historico_status;
DROP POLICY IF EXISTS historico_acompanhamento_update ON public.historico_status;

CREATE POLICY alertas_acompanhamento_select
  ON public.alertas FOR SELECT TO authenticated
  USING ((SELECT public.cargo_equipe_atual()) IN ('psicologo', 'orientador'));
CREATE POLICY alertas_acompanhamento_update
  ON public.alertas FOR UPDATE TO authenticated
  USING ((SELECT public.cargo_equipe_atual()) IN ('psicologo', 'orientador'))
  WITH CHECK ((SELECT public.cargo_equipe_atual()) IN ('psicologo', 'orientador'));

CREATE POLICY registros_acompanhamento_select
  ON public.registros FOR SELECT TO authenticated
  USING ((SELECT public.cargo_equipe_atual()) IN ('psicologo', 'orientador'));
CREATE POLICY registros_acompanhamento_update
  ON public.registros FOR UPDATE TO authenticated
  USING ((SELECT public.cargo_equipe_atual()) IN ('psicologo', 'orientador'))
  WITH CHECK ((SELECT public.cargo_equipe_atual()) IN ('psicologo', 'orientador'));

CREATE POLICY anotacoes_acompanhamento_select
  ON public.anotacoes FOR SELECT TO authenticated
  USING ((SELECT public.cargo_equipe_atual()) IN ('psicologo', 'orientador'));
CREATE POLICY anotacoes_acompanhamento_insert
  ON public.anotacoes FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.cargo_equipe_atual()) IN ('psicologo', 'orientador')
    AND autor_id = (SELECT auth.uid())
  );
CREATE POLICY anotacoes_acompanhamento_update
  ON public.anotacoes FOR UPDATE TO authenticated
  USING ((SELECT public.cargo_equipe_atual()) IN ('psicologo', 'orientador'))
  WITH CHECK ((SELECT public.cargo_equipe_atual()) IN ('psicologo', 'orientador'));

CREATE POLICY historico_acompanhamento_select
  ON public.historico_status FOR SELECT TO authenticated
  USING ((SELECT public.cargo_equipe_atual()) IN ('psicologo', 'orientador'));
CREATE POLICY historico_acompanhamento_update
  ON public.historico_status FOR UPDATE TO authenticated
  USING ((SELECT public.cargo_equipe_atual()) IN ('psicologo', 'orientador'))
  WITH CHECK ((SELECT public.cargo_equipe_atual()) IN ('psicologo', 'orientador'));

DROP POLICY IF EXISTS acessos_portal_insert_anon ON public.acessos_portal;
CREATE POLICY acessos_portal_insert_anon
  ON public.acessos_portal FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS contatos_apoio_select_ativos ON public.contatos_apoio;
CREATE POLICY contatos_apoio_select_ativos
  ON public.contatos_apoio FOR SELECT TO anon, authenticated
  USING (ativo = true);

REVOKE ALL ON TABLE
  public.equipe_escola, public.sessao, public.registros, public.alertas,
  public.desabafos_anonimos, public.historico_status, public.anotacoes,
  public.acessos_portal, public.respostas, public.contatos_apoio,
  public.registro_estatistico
FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.equipe_escola, public.sessao, public.registros, public.alertas,
  public.desabafos_anonimos, public.historico_status, public.anotacoes,
  public.acessos_portal, public.respostas, public.contatos_apoio,
  public.registro_estatistico
TO authenticated;

GRANT INSERT ON TABLE
  public.sessao, public.registros, public.alertas, public.desabafos_anonimos,
  public.acessos_portal
TO anon;
GRANT SELECT ON TABLE public.contatos_apoio TO anon;

GRANT ALL ON TABLE
  public.equipe_escola, public.sessao, public.registros, public.alertas,
  public.desabafos_anonimos, public.historico_status, public.anotacoes,
  public.acessos_portal, public.respostas, public.contatos_apoio,
  public.registro_estatistico
TO service_role;

ALTER TABLE public.alertas REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'alertas'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.alertas;
  END IF;
END $$;

-- Crie primeiro este usuário em Authentication > Users. O bloco associa o ID
-- emitido pelo Supabase Auth sem exigir copiar UUID manualmente.
DO $$
DECLARE
  gestor_id uuid;
BEGIN
  SELECT usuario.id INTO gestor_id
  FROM auth.users AS usuario
  WHERE lower(usuario.email) = lower('gestao@escolapiaui.edu.br')
  ORDER BY usuario.created_at
  LIMIT 1;

  IF gestor_id IS NULL THEN
    RAISE EXCEPTION
      'Crie primeiro em Supabase Auth o usuário gestao@escolapiaui.edu.br e execute novamente o seed.';
  END IF;

  INSERT INTO public.equipe_escola (id, nome, email, cargo)
  VALUES (gestor_id, 'Gestor Escolar', 'gestao@escolapiaui.edu.br', 'gestor')
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        cargo = EXCLUDED.cargo;
END $$;
