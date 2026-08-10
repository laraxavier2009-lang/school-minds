-- ============ REGISTROS: campos extra ============
ALTER TABLE public.registros
  ADD COLUMN IF NOT EXISTS pontuacao_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pediu_ajuda boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'chatbot';

-- ============ RESPOSTAS ============
CREATE TABLE IF NOT EXISTS public.respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id uuid NOT NULL REFERENCES public.registros(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  pergunta text NOT NULL,
  opcao text NOT NULL,
  peso integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS respostas_registro_id_idx ON public.respostas(registro_id);

GRANT INSERT ON public.respostas TO anon;
GRANT SELECT, INSERT ON public.respostas TO authenticated;
GRANT ALL ON public.respostas TO service_role;
ALTER TABLE public.respostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um cria respostas"
  ON public.respostas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Autenticados leem respostas"
  ON public.respostas FOR SELECT TO authenticated USING (true);

-- ============ ANOTACOES ============
CREATE TABLE IF NOT EXISTS public.anotacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alerta_id uuid NOT NULL REFERENCES public.alertas(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  texto text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS anotacoes_alerta_id_idx ON public.anotacoes(alerta_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.anotacoes TO authenticated;
GRANT ALL ON public.anotacoes TO service_role;
ALTER TABLE public.anotacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem anotacoes"
  ON public.anotacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autor cria anotacao"
  ON public.anotacoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = autor_id);
CREATE POLICY "Autor edita a propria anotacao"
  ON public.anotacoes FOR UPDATE TO authenticated USING (auth.uid() = autor_id) WITH CHECK (auth.uid() = autor_id);
CREATE POLICY "Autor apaga a propria anotacao"
  ON public.anotacoes FOR DELETE TO authenticated USING (auth.uid() = autor_id);

CREATE TRIGGER trg_anotacoes_atualizado_em
  BEFORE UPDATE ON public.anotacoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_atualizado_em();

-- ============ HISTORICO_STATUS ============
CREATE TABLE IF NOT EXISTS public.historico_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alerta_id uuid NOT NULL REFERENCES public.alertas(id) ON DELETE CASCADE,
  autor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status_anterior status_enum,
  status_novo status_enum NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS historico_status_alerta_id_idx ON public.historico_status(alerta_id);

GRANT SELECT, INSERT ON public.historico_status TO authenticated;
GRANT ALL ON public.historico_status TO service_role;
ALTER TABLE public.historico_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem historico"
  ON public.historico_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados registram historico"
  ON public.historico_status FOR INSERT TO authenticated WITH CHECK (auth.uid() = autor_id);

-- ============ CONTATOS_APOIO ============
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

GRANT SELECT ON public.contatos_apoio TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contatos_apoio TO authenticated;
GRANT ALL ON public.contatos_apoio TO service_role;
ALTER TABLE public.contatos_apoio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contatos ativos sao publicos"
  ON public.contatos_apoio FOR SELECT TO anon, authenticated USING (ativo = true);
CREATE POLICY "Autenticados criam contatos"
  ON public.contatos_apoio FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados editam contatos"
  ON public.contatos_apoio FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_contatos_apoio_atualizado_em
  BEFORE UPDATE ON public.contatos_apoio
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_atualizado_em();

INSERT INTO public.contatos_apoio (nome, descricao, telefone, site, ordem) VALUES
  ('CVV - Centro de Valorização da Vida', 'Apoio emocional e prevenção do suicídio, 24h, gratuito e sigiloso', '188', 'https://www.cvv.org.br', 1),
  ('CAPS - Centro de Atenção Psicossocial', 'Atendimento em saúde mental pelo SUS na sua cidade', NULL, 'https://www.gov.br/saude', 2),
  ('SAMU', 'Emergências médicas', '192', NULL, 3),
  ('Orientação Educacional da Escola', 'Converse com a equipe de apoio da sua escola', NULL, NULL, 4);
