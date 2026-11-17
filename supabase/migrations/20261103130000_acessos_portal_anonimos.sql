ALTER TABLE public.registros
  ALTER COLUMN pontuacao_total DROP NOT NULL,
  ALTER COLUMN pontuacao_total DROP DEFAULT;

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

CREATE INDEX IF NOT EXISTS acessos\_portal\_etapa\_data\_idx
 ON public.acessos\_portal(etapa, criado\_em DESC);
CREATE INDEX IF NOT EXISTS acessos\_portal\_nivel\_data\_idx
 ON public.acessos\_portal(nivel\_risco, criado\_em DESC)
  WHERE nivel\_risco IS NOT NULL;

ALTER TABLE public.acessos_portal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS acessos_portal_insert_anon_authenticated ON public.acessos_portal;
CREATE POLICY acessos_portal_insert_anon_authenticated
  ON public.acessos_portal FOR INSERT TO anon, authenticated
  WITH CHECK (true);
DROP POLICY IF EXISTS acessos_portal_select_equipe_escola ON public.acessos_portal;
CREATE POLICY acessos_portal_select_equipe_escola
  ON public.acessos_portal FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.equipe_escola AS equipe
    WHERE equipe.user_id = (SELECT auth.uid())
  ));

REVOKE ALL ON public.acessos_portal FROM anon, authenticated;
GRANT INSERT ON public.acessos_portal TO anon, authenticated;
GRANT SELECT ON public.acessos_portal TO authenticated;
GRANT ALL ON public.acessos_portal TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'acessos_portal'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.acessos_portal;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'registros'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.registros;
    END IF;
  END IF;
END;
$$;