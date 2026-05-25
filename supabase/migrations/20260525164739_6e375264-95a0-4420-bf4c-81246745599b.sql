
CREATE TYPE tema_enum AS ENUM ('ansiedade','tristeza','bullying','luto','estresse','pedir_ajuda');
CREATE TYPE nivel_enum AS ENUM ('leve','medio','grave');
CREATE TYPE status_enum AS ENUM ('pendente','em_atendimento','concluido','nao_localizado');

CREATE TABLE public.registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tema tema_enum NOT NULL,
  nivel_risco nivel_enum NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id uuid NOT NULL REFERENCES public.registros(id) ON DELETE CASCADE,
  status status_enum NOT NULL DEFAULT 'pendente',
  prazo_dias integer NOT NULL DEFAULT 7,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um cria registros" ON public.registros FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Autenticados leem registros" ON public.registros FOR SELECT TO authenticated USING (true);

CREATE POLICY "Qualquer um cria alertas" ON public.alertas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Autenticados leem alertas" ON public.alertas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados atualizam alertas" ON public.alertas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.tg_set_atualizado_em()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_alertas_atualizado_em
BEFORE UPDATE ON public.alertas
FOR EACH ROW EXECUTE FUNCTION public.tg_set_atualizado_em();

ALTER TABLE public.alertas REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alertas;
