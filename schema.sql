CREATE TABLE public.equipe_escola (
    id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    cargo TEXT NOT NULL CHECK (cargo IN ('psicologo', 'orientador', 'gestor')),
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.sessao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iniciada_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    encerrada_em TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL
);

CREATE TABLE public.registros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sessao_id UUID NOT NULL REFERENCES public.sessao (id),
    tema TEXT NOT NULL CHECK (
        tema IN ('ansiedade', 'tristeza', 'bullying', 'luto', 'estresse', 'pedir_ajuda')
    ),
    pontuacao_total INT NOT NULL,
    nivel_risco TEXT NOT NULL CHECK (nivel_risco IN ('leve', 'medio', 'grave')),
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.registros IS
    'Nao armazene texto de conversa nem nomes de alunos nesta tabela (LGPD).';

CREATE TABLE public.alertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registro_id UUID NOT NULL REFERENCES public.registros (id),
    nivel TEXT NOT NULL CHECK (nivel IN ('medio', 'grave')),
    status TEXT NOT NULL CHECK (status IN ('pendente', 'em_atendimento', 'concluido')),
    visualizado BOOLEAN NOT NULL DEFAULT false,
    visualizado_por UUID REFERENCES public.equipe_escola (id),
    emitido_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.registro_estatistico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registro_id UUID NOT NULL REFERENCES public.registros (id),
    tema TEXT NOT NULL,
    nivel_gravidade TEXT NOT NULL,
    semana_ano INT NOT NULL,
    ano INT NOT NULL
);

ALTER TABLE public.equipe_escola ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registro_estatistico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipe_escola_select_proprio_perfil"
    ON public.equipe_escola
    FOR SELECT
    TO authenticated
    USING (id = (SELECT auth.uid()));

CREATE POLICY "sessao_insert_anon_authenticated"
    ON public.sessao
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "registros_insert_anon_authenticated"
    ON public.registros
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "registros_select_equipe_escola"
    ON public.registros
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.equipe_escola AS equipe
            WHERE equipe.id = (SELECT auth.uid())
        )
    );

CREATE POLICY "alertas_insert_anon_authenticated"
    ON public.alertas
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "alertas_select_equipe_escola"
    ON public.alertas
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.equipe_escola AS equipe
            WHERE equipe.id = (SELECT auth.uid())
        )
    );

CREATE POLICY "alertas_update_equipe_escola"
    ON public.alertas
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.equipe_escola AS equipe
            WHERE equipe.id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.equipe_escola AS equipe
            WHERE equipe.id = (SELECT auth.uid())
        )
    );

GRANT SELECT ON public.equipe_escola TO authenticated;
GRANT INSERT ON public.sessao, public.registros, public.alertas TO anon, authenticated;
GRANT SELECT ON public.registros, public.alertas TO authenticated;
GRANT UPDATE ON public.alertas TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.alertas;