CREATE TABLE public.equipe_escola (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cargo text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.equipe_escola TO authenticated;
GRANT ALL ON public.equipe_escola TO service_role;

ALTER TABLE public.equipe_escola ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros leem o próprio registro"
ON public.equipe_escola FOR SELECT
TO authenticated
USING (auth.uid() = user_id);