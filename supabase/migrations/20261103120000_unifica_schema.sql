CREATE TABLE IF NOT EXISTS public.sessao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iniciada_em timestamptz NOT NULL DEFAULT now(),
  encerrada_em timestamptz,
  status text NOT NULL DEFAULT 'iniciada' CHECK (status IN ('iniciada', 'encerrada'))
);

ALTER TABLE public.equipe_escola
  ADD COLUMN IF NOT EXISTS user_id uuid;

UPDATE public.equipe_escola
SET user_id = id
WHERE user_id IS NULL;

ALTER TABLE public.equipe_escola
  ALTER COLUMN user_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'equipe_escola_user_id_key'
      AND conrelid = 'public.equipe_escola'::regclass
  ) THEN
    ALTER TABLE public.equipe_escola
      ADD CONSTRAINT equipe_escola_user_id_key UNIQUE (user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'equipe_escola_user_id_fkey'
      AND conrelid = 'public.equipe_escola'::regclass
  ) THEN
    ALTER TABLE public.equipe_escola
      ADD CONSTRAINT equipe_escola_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'equipe_escola_cargo_check'
      AND conrelid = 'public.equipe_escola'::regclass
  ) THEN
    ALTER TABLE public.equipe_escola
      ADD CONSTRAINT equipe_escola_cargo_check
      CHECK (cargo IN ('gestor', 'psicologo', 'orientador'));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_equipe_escola_valida()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.cargo NOT IN ('gestor', 'psicologo', 'orientador') THEN
    RAISE EXCEPTION 'Cargo invalido: %', NEW.cargo;
  END IF;
  IF NEW.email IS NULL THEN
    SELECT usuario.email INTO NEW.email
    FROM auth.users AS usuario
    WHERE usuario.id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_equipe_escola_valida ON public.equipe_escola;
CREATE TRIGGER trg_equipe_escola_valida
  BEFORE INSERT OR UPDATE ON public.equipe_escola
  FOR EACH ROW EXECUTE FUNCTION public.tg_equipe_escola_valida();

ALTER TABLE public.registros
  ADD COLUMN IF NOT EXISTS sessao_id uuid REFERENCES public.sessao(id) ON DELETE SET NULL;
ALTER TABLE public.registros
  ALTER COLUMN sessao_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'registros_sessao_id_fkey'
      AND conrelid = 'public.registros'::regclass
  ) THEN
    ALTER TABLE public.registros
      ADD CONSTRAINT registros_sessao_id_fkey
      FOREIGN KEY (sessao_id) REFERENCES public.sessao(id) ON DELETE SET NULL;
  END IF;
END;
$$;

ALTER TABLE public.alertas
  ADD COLUMN IF NOT EXISTS nivel text,
  ADD COLUMN IF NOT EXISTS emitido_em timestamptz,
  ADD COLUMN IF NOT EXISTS visualizado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS visualizado_por uuid;

UPDATE public.alertas AS alerta
SET nivel = CASE
  WHEN registro.nivel_risco::text = 'grave' THEN 'grave'
  ELSE 'medio'
END
FROM public.registros AS registro
WHERE registro.id = alerta.registro_id
  AND alerta.nivel IS NULL;

UPDATE public.alertas
SET nivel = 'medio'
WHERE nivel IS NULL;

UPDATE public.alertas
SET emitido_em = criado_em
WHERE emitido_em IS NULL;

ALTER TABLE public.alertas
  ALTER COLUMN nivel SET DEFAULT 'medio',
  ALTER COLUMN nivel SET NOT NULL,
  ALTER COLUMN emitido_em SET DEFAULT now(),
  ALTER COLUMN emitido_em SET NOT NULL;

ALTER TABLE public.alertas
  DROP CONSTRAINT IF EXISTS alertas_visualizado_por_fkey;

UPDATE public.alertas AS alerta
SET visualizado_por = equipe.user_id
FROM public.equipe_escola AS equipe
WHERE alerta.visualizado_por = equipe.id
  AND alerta.visualizado_por IS DISTINCT FROM equipe.user_id;

ALTER TABLE public.alertas
  ADD CONSTRAINT alertas_visualizado_por_fkey
  FOREIGN KEY (visualizado_por) REFERENCES public.equipe_escola(user_id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'registros_pontuacao_total_check'
      AND conrelid = 'public.registros'::regclass
  ) THEN
    ALTER TABLE public.registros
      ADD CONSTRAINT registros_pontuacao_total_check CHECK (pontuacao_total >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'alertas_nivel_check'
      AND conrelid = 'public.alertas'::regclass
  ) THEN
    ALTER TABLE public.alertas
      ADD CONSTRAINT alertas_nivel_check CHECK (nivel IN ('medio', 'grave'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'alertas_prazo_dias_check'
      AND conrelid = 'public.alertas'::regclass
  ) THEN
    ALTER TABLE public.alertas
      ADD CONSTRAINT alertas_prazo_dias_check CHECK (prazo_dias > 0);
  END IF;
END;
$$;

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
CREATE INDEX IF NOT EXISTS registro_estatistico_periodo_idx
  ON public.registro_estatistico(ano, semana_ano);

ALTER TABLE public.equipe_escola ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contatos_apoio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desabafos_anonimos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registro_estatistico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membros leem o próprio registro" ON public.equipe_escola;
DROP POLICY IF EXISTS "Membro cria o próprio registro" ON public.equipe_escola;
DROP POLICY IF EXISTS equipe_escola_select_proprio_perfil ON public.equipe_escola;
CREATE POLICY equipe_escola_select_proprio_perfil
  ON public.equipe_escola FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Qualquer um cria registros" ON public.registros;
DROP POLICY IF EXISTS "Autenticados leem registros" ON public.registros;
DROP POLICY IF EXISTS registros_insert_anon_authenticated ON public.registros;
DROP POLICY IF EXISTS registros_select_equipe_escola ON public.registros;
CREATE POLICY registros_insert_anon_authenticated
  ON public.registros FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY registros_select_equipe_escola
  ON public.registros FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.equipe_escola AS equipe
    WHERE equipe.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Qualquer um cria alertas" ON public.alertas;
DROP POLICY IF EXISTS "Autenticados leem alertas" ON public.alertas;
DROP POLICY IF EXISTS "Autenticados atualizam alertas" ON public.alertas;
DROP POLICY IF EXISTS alertas_insert_anon_authenticated ON public.alertas;
DROP POLICY IF EXISTS alertas_select_equipe_escola ON public.alertas;
DROP POLICY IF EXISTS alertas_update_equipe_escola ON public.alertas;
CREATE POLICY alertas_insert_anon_authenticated
  ON public.alertas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY alertas_select_equipe_escola
  ON public.alertas FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.equipe_escola AS equipe
    WHERE equipe.user_id = (SELECT auth.uid())
  ));
CREATE POLICY alertas_update_equipe_escola
  ON public.alertas FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.equipe_escola AS equipe
    WHERE equipe.user_id = (SELECT auth.uid())
  ))
  WITH CHECK (
    (visualizado_por IS NULL OR visualizado_por = (SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.equipe_escola AS equipe
      WHERE equipe.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS sessao_insert_anon_authenticated ON public.sessao;
CREATE POLICY sessao_insert_anon_authenticated
  ON public.sessao FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY sessao_select_equipe_escola
  ON public.sessao FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.equipe_escola AS equipe
    WHERE equipe.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Qualquer um cria respostas" ON public.respostas;
DROP POLICY IF EXISTS "Autenticados leem respostas" ON public.respostas;
CREATE POLICY respostas_insert_anon_authenticated
  ON public.respostas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY respostas_select_equipe_escola
  ON public.respostas FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.equipe_escola AS equipe
    WHERE equipe.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Autenticados leem anotacoes" ON public.anotacoes;
DROP POLICY IF EXISTS "Autor cria anotacao" ON public.anotacoes;
DROP POLICY IF EXISTS "Autor edita a propria anotacao" ON public.anotacoes;
DROP POLICY IF EXISTS "Autor apaga a propria anotacao" ON public.anotacoes;
CREATE POLICY anotacoes_select_equipe_escola
  ON public.anotacoes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.equipe_escola AS equipe
    WHERE equipe.user_id = (SELECT auth.uid())
  ));
CREATE POLICY anotacoes_insert_proprio_autor
  ON public.anotacoes FOR INSERT TO authenticated
  WITH CHECK (
    autor_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.equipe_escola AS equipe
      WHERE equipe.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY anotacoes_update_proprio_autor
  ON public.anotacoes FOR UPDATE TO authenticated
  USING (
    autor_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.equipe_escola AS equipe
      WHERE equipe.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    autor_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.equipe_escola AS equipe
      WHERE equipe.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY anotacoes_delete_proprio_autor
  ON public.anotacoes FOR DELETE TO authenticated
  USING (
    autor_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.equipe_escola AS equipe
      WHERE equipe.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Autenticados leem historico" ON public.historico_status;
DROP POLICY IF EXISTS "Autenticados registram historico" ON public.historico_status;
CREATE POLICY historico_status_select_equipe_escola
  ON public.historico_status FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.equipe_escola AS equipe
    WHERE equipe.user_id = (SELECT auth.uid())
  ));
CREATE POLICY historico_status_insert_equipe_escola
  ON public.historico_status FOR INSERT TO authenticated
  WITH CHECK (
    autor_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.equipe_escola AS equipe
      WHERE equipe.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Contatos ativos sao publicos" ON public.contatos_apoio;
DROP POLICY IF EXISTS "Autenticados criam contatos" ON public.contatos_apoio;
DROP POLICY IF EXISTS "Autenticados editam contatos" ON public.contatos_apoio;
CREATE POLICY contatos_apoio_select_ativos
  ON public.contatos_apoio FOR SELECT TO anon, authenticated USING (ativo = true);
CREATE POLICY contatos_apoio_insert_equipe_escola
  ON public.contatos_apoio FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.equipe_escola AS equipe
    WHERE equipe.user_id = (SELECT auth.uid())
  ));
CREATE POLICY contatos_apoio_update_equipe_escola
  ON public.contatos_apoio FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.equipe_escola AS equipe
    WHERE equipe.user_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.equipe_escola AS equipe
    WHERE equipe.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Qualquer um cria desabafo" ON public.desabafos_anonimos;
DROP POLICY IF EXISTS "Autenticados leem desabafos" ON public.desabafos_anonimos;
CREATE POLICY desabafos_insert_anon_authenticated
  ON public.desabafos_anonimos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY desabafos_select_equipe_escola
  ON public.desabafos_anonimos FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.equipe_escola AS equipe
    WHERE equipe.user_id = (SELECT auth.uid())
  ));

CREATE POLICY registro_estatistico_select_equipe_escola
  ON public.registro_estatistico FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.equipe_escola AS equipe
    WHERE equipe.user_id = (SELECT auth.uid())
  ));

REVOKE INSERT, UPDATE, DELETE ON public.equipe_escola FROM authenticated;
REVOKE ALL ON public.sessao, public.registros, public.alertas, public.respostas,
  public.anotacoes, public.historico_status, public.contatos_apoio,
  public.desabafos_anonimos, public.registro_estatistico FROM anon, authenticated;

GRANT SELECT ON public.equipe_escola TO authenticated;
GRANT INSERT ON public.sessao, public.registros, public.alertas, public.respostas,
  public.desabafos_anonimos TO anon, authenticated;
GRANT SELECT ON public.sessao, public.registros, public.alertas, public.respostas,
  public.anotacoes, public.historico_status, public.contatos_apoio,
  public.desabafos_anonimos, public.registro_estatistico TO authenticated;
GRANT UPDATE ON public.alertas TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.anotacoes TO authenticated;
GRANT INSERT ON public.historico_status TO authenticated;
GRANT SELECT ON public.contatos_apoio TO anon;
GRANT INSERT ON public.desabafos_anonimos TO anon;
GRANT INSERT ON public.contatos_apoio TO authenticated;
GRANT UPDATE, DELETE ON public.contatos_apoio TO authenticated;
GRANT ALL ON public.equipe_escola, public.sessao, public.registros, public.alertas,
  public.respostas, public.anotacoes, public.historico_status, public.contatos_apoio,
  public.desabafos_anonimos, public.registro_estatistico TO service_role;