ALTER TABLE public.equipe_escola ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE public.equipe_escola e
SET email = u.email
FROM auth.users u
WHERE u.id = e.user_id AND e.email IS NULL;

CREATE OR REPLACE FUNCTION public.tg_equipe_escola_valida()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.cargo NOT IN ('gestor', 'psicologo', 'orientador') THEN
    RAISE EXCEPTION 'Cargo invalido: %', NEW.cargo;
  END IF;
  IF NEW.email IS NULL THEN
    SELECT u.email INTO NEW.email FROM auth.users u WHERE u.id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_equipe_escola_valida ON public.equipe_escola;
CREATE TRIGGER trg_equipe_escola_valida
BEFORE INSERT OR UPDATE ON public.equipe_escola
FOR EACH ROW EXECUTE FUNCTION public.tg_equipe_escola_valida();