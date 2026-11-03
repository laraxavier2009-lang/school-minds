import { createFileRoute } from "@tanstack/react-router";
import { LoginEquipeEscola } from "@/components/LoginEquipeEscola";

export const Route = createFileRoute("/painel/login")({
  head: () => ({ meta: [{ title: "Acesso à Gestão Escolar — Painel" }] }),
  component: LoginPainel,
});

function LoginPainel() {
  return (
    <LoginEquipeEscola
      cargosPermitidos={["psicologo", "orientador"]}
      titulo="Acesso da Equipe Escolar"
      descricao="Área restrita para psicólogos e orientadores"
      textoBotao="Entrar no Painel"
    />
  );
}
