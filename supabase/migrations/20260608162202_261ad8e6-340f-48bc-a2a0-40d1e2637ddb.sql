GRANT INSERT ON public.equipe_escola TO authenticated;

DROP POLICY IF EXISTS "Membro cria o próprio registro" ON public.equipe_escola;
CREATE POLICY "Membro cria o próprio registro"
ON public.equipe_escola FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);