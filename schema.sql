-- Snapshot apos todas as migrations; a fonte de verdade de mudancas e supabase/migrations.
CREATE TYPE public.tema_enum AS ENUM (
    'ansiedade', 'tristeza', 'bullying', 'luto', 'estresse', 'pedir_ajuda'
);
CREATE TYPE public.nivel_enum AS ENUM ('leve', 'medio', 'grave');
CREATE TYPE public.status_enum AS ENUM (
    'pendente', 'em_atendimento', 'concluido', 'nao_localizado'
);

CREATE TABLE public.equipe_escola (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    nome text NOT NULL,
    email text,
    cargo text NOT NULL CHECK (cargo IN ('gestor', 'psicologo', 'orientador')),
    criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sessao (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    iniciada_em timestamptz NOT NULL DEFAULT now(),
    encerrada_em timestamptz,
    status text NOT NULL DEFAULT 'iniciada' CHECK (status IN ('iniciada', 'encerrada'))
);

CREATE TABLE public.registros (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sessao_id uuid REFERENCES public.sessao(id) ON DELETE SET NULL,
    tema public.tema_enum NOT NULL,
    nivel_risco public.nivel_enum NOT NULL,
    pontuacao_total integer CHECK (pontuacao_total >= 0),
    pediu_ajuda boolean NOT NULL DEFAULT false,
    origem text NOT NULL DEFAULT 'chatbot',
    criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.acessos_portal (
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

COMMENT ON TABLE public.registros IS
    'Nao armazene texto de conversa nem nomes de alunos nesta tabela (LGPD).';

CREATE TABLE public.alertas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    registro_id uuid NOT NULL REFERENCES public.registros(id) ON DELETE CASCADE,
    nivel text NOT NULL DEFAULT 'medio' CHECK (nivel IN ('medio', 'grave')),
    status public.status_enum NOT NULL DEFAULT 'pendente',
    prazo_dias integer NOT NULL DEFAULT 7 CHECK (prazo_dias > 0),
    visualizado boolean NOT NULL DEFAULT false,
    visualizado_por uuid REFERENCES public.equipe_escola(user_id) ON DELETE SET NULL,
    criado_em timestamptz NOT NULL DEFAULT now(),
    emitido_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.respostas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    registro_id uuid NOT NULL REFERENCES public.registros(id) ON DELETE CASCADE,
    ordem integer NOT NULL DEFAULT 0,
    pergunta text NOT NULL,
    opcao text NOT NULL,
    peso integer NOT NULL DEFAULT 0,
    criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.anotacoes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    alerta_id uuid NOT NULL REFERENCES public.alertas(id) ON DELETE CASCADE,
    autor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    texto text NOT NULL,
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.historico_status (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    alerta_id uuid NOT NULL REFERENCES public.alertas(id) ON DELETE CASCADE,
    autor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    status_anterior public.status_enum,
    status_novo public.status_enum NOT NULL,
    criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.contatos_apoio (
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

CREATE TABLE public.desabafos_anonimos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    texto text,
    tema varchar(50) NOT NULL,
    criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.registro_estatistico (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    registro_id uuid NOT NULL REFERENCES public.registros(id) ON DELETE CASCADE,
    tema text NOT NULL,
    nivel_gravidade text NOT NULL,
    semana_ano integer NOT NULL CHECK (semana_ano BETWEEN 1 AND 53),
    ano integer NOT NULL CHECK (ano BETWEEN 2000 AND 9999)
);

CREATE INDEX respostas_registro_id_idx ON public.respostas(registro_id);
CREATE INDEX anotacoes_alerta_id_idx ON public.anotacoes(alerta_id);
CREATE INDEX historico_status_alerta_id_idx ON public.historico_status(alerta_id);
CREATE INDEX registros_sessao_id_idx ON public.registros(sessao_id);
CREATE INDEX acessos_portal_etapa_data_idx
    ON public.acessos_portal(etapa, criado_em DESC);
CREATE INDEX acessos_portal_nivel_data_idx
    ON public.acessos_portal(nivel_risco, criado_em DESC)
    WHERE nivel_risco IS NOT NULL;
CREATE INDEX alertas_emitido_em_idx ON public.alertas(emitido_em DESC);
CREATE INDEX registro_estatistico_periodo_idx
    ON public.registro_estatistico(ano, semana_ano);

CREATE OR REPLACE FUNCTION public.tg_set_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
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

CREATE TRIGGER trg_equipe_escola_valida
    BEFORE INSERT OR UPDATE ON public.equipe_escola
    FOR EACH ROW EXECUTE FUNCTION public.tg_equipe_escola_valida();

CREATE TRIGGER trg_alertas_atualizado_em
    BEFORE UPDATE ON public.alertas
    FOR EACH ROW EXECUTE FUNCTION public.tg_set_atualizado_em();
CREATE TRIGGER trg_anotacoes_atualizado_em
    BEFORE UPDATE ON public.anotacoes
    FOR EACH ROW EXECUTE FUNCTION public.tg_set_atualizado_em();
CREATE TRIGGER trg_contatos_apoio_atualizado_em
    BEFORE UPDATE ON public.contatos_apoio
    FOR EACH ROW EXECUTE FUNCTION public.tg_set_atualizado_em();

ALTER TABLE public.equipe_escola ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acessos_portal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contatos_apoio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desabafos_anonimos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registro_estatistico ENABLE ROW LEVEL SECURITY;

CREATE POLICY equipe_escola_select_proprio_perfil
    ON public.equipe_escola FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));
CREATE POLICY sessao_insert_anon_authenticated
    ON public.sessao FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY sessao_select_equipe_escola
    ON public.sessao FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.equipe_escola e WHERE e.user_id = (SELECT auth.uid())));
CREATE POLICY registros_insert_anon_authenticated
    ON public.registros FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY registros_select_equipe_escola
    ON public.registros FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.equipe_escola e WHERE e.user_id = (SELECT auth.uid())));
CREATE POLICY acessos_portal_insert_anon_authenticated
    ON public.acessos_portal FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY acessos_portal_select_equipe_escola
    ON public.acessos_portal FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.equipe_escola e WHERE e.user_id = (SELECT auth.uid())));
CREATE POLICY alertas_insert_anon_authenticated
    ON public.alertas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY alertas_select_equipe_escola
    ON public.alertas FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.equipe_escola e WHERE e.user_id = (SELECT auth.uid())));
CREATE POLICY alertas_update_equipe_escola
    ON public.alertas FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.equipe_escola e WHERE e.user_id = (SELECT auth.uid())))
    WITH CHECK (
        (visualizado_por IS NULL OR visualizado_por = (SELECT auth.uid()))
        AND EXISTS (SELECT 1 FROM public.equipe_escola e WHERE e.user_id = (SELECT auth.uid()))
    );
CREATE POLICY respostas_insert_anon_authenticated
    ON public.respostas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY respostas_select_equipe_escola
    ON public.respostas FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.equipe_escola e WHERE e.user_id = (SELECT auth.uid())));
CREATE POLICY anotacoes_select_equipe_escola
    ON public.anotacoes FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.equipe_escola e WHERE e.user_id = (SELECT auth.uid())));
CREATE POLICY anotacoes_insert_proprio_autor
    ON public.anotacoes FOR INSERT TO authenticated
    WITH CHECK (
        autor_id = (SELECT auth.uid())
        AND EXISTS (SELECT 1 FROM public.equipe_escola e WHERE e.user_id = (SELECT auth.uid()))
    );
CREATE POLICY anotacoes_update_proprio_autor
    ON public.anotacoes FOR UPDATE TO authenticated
    USING (
        autor_id = (SELECT auth.uid())
        AND EXISTS (SELECT 1 FROM public.equipe_escola e WHERE e.user_id = (SELECT auth.uid()))
    )
    WITH CHECK (
        autor_id = (SELECT auth.uid())
        AND EXISTS (SELECT 1 FROM public.equipe_escola e WHERE e.user_id = (SELECT auth.uid()))
    );
CREATE POLICY anotacoes_delete_proprio_autor
    ON public.anotacoes FOR DELETE TO authenticated
    USING (
        autor_id = (SELECT auth.uid())
        AND EXISTS (SELECT 1 FROM public.equipe_escola e WHERE e.user_id = (SELECT auth.uid()))
    );
CREATE POLICY historico_status_select_equipe_escola
    ON public.historico_status FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.equipe_escola e WHERE e.user_id = (SELECT auth.uid())));
CREATE POLICY historico_status_insert_equipe_escola
    ON public.historico_status FOR INSERT TO authenticated
    WITH CHECK (
        autor_id = (SELECT auth.uid())
        AND EXISTS (SELECT 1 FROM public.equipe_escola e WHERE e.user_id = (SELECT auth.uid()))
    );
CREATE POLICY contatos_apoio_select_ativos
    ON public.contatos_apoio FOR SELECT TO anon, authenticated USING (ativo = true);
CREATE POLICY contatos_apoio_insert_equipe_escola
    ON public.contatos_apoio FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.equipe_escola e WHERE e.user_id = (SELECT auth.uid())));
CREATE POLICY contatos_apoio_update_equipe_escola
    ON public.contatos_apoio FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.equipe_escola e WHERE e.user_id = (SELECT auth.uid())))
    WITH CHECK (EXISTS (SELECT 1 FROM public.equipe_escola e WHERE e.user_id = (SELECT auth.uid())));
CREATE POLICY desabafos_insert_anon_authenticated
    ON public.desabafos_anonimos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY desabafos_select_equipe_escola
    ON public.desabafos_anonimos FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.equipe_escola e WHERE e.user_id = (SELECT auth.uid())));
CREATE POLICY registro_estatistico_select_equipe_escola
    ON public.registro_estatistico FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.equipe_escola e WHERE e.user_id = (SELECT auth.uid())));

REVOKE INSERT, UPDATE, DELETE ON public.equipe_escola FROM authenticated;
GRANT SELECT ON public.equipe_escola TO authenticated;
GRANT INSERT ON public.sessao, public.registros, public.alertas, public.respostas,
    public.desabafos_anonimos TO anon, authenticated;
GRANT INSERT ON public.acessos_portal TO anon, authenticated;
GRANT SELECT ON public.sessao, public.registros, public.alertas, public.respostas,
    public.anotacoes, public.historico_status, public.contatos_apoio,
    public.desabafos_anonimos, public.registro_estatistico,
    public.acessos_portal TO authenticated;
GRANT UPDATE ON public.alertas TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.anotacoes TO authenticated;
GRANT INSERT ON public.historico_status TO authenticated;
GRANT SELECT ON public.contatos_apoio TO anon;
GRANT INSERT ON public.desabafos_anonimos TO anon;
GRANT INSERT, UPDATE, DELETE ON public.contatos_apoio TO authenticated;
GRANT ALL ON public.equipe_escola, public.sessao, public.registros, public.alertas,
    public.respostas, public.anotacoes, public.historico_status, public.contatos_apoio,
    public.desabafos_anonimos, public.registro_estatistico,
    public.acessos_portal TO service_role;

ALTER TABLE public.alertas REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alertas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.acessos_portal;
ALTER PUBLICATION supabase_realtime ADD TABLE public.registros;