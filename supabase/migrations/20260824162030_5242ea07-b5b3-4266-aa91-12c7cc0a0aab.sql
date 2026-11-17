CREATE TABLE IF NOT EXISTS public.desabafos_anonimos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  texto TEXT NULL,
  tema VARCHAR(50) NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT INSERT ON public.desabafos_anonimos TO anon;
GRANT SELECT, INSERT ON public.desabafos_anonimos TO authenticated;
GRANT ALL ON public.desabafos_anonimos TO service_role;

ALTER TABLE public.desabafos_anonimos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer um cria desabafo" ON public.desabafos_anonimos;
CREATE POLICY "Qualquer um cria desabafo" ON public.desabafos_anonimos FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Autenticados leem desabafos" ON public.desabafos_anonimos;
CREATE POLICY "Autenticados leem desabafos" ON public.desabafos_anonimos FOR SELECT TO authenticated USING (true);