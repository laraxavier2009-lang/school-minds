import { createFileRoute } from "@tanstack/react-router";
import { LoginEquipeEscola } from "@/components/LoginEquipeEscola";

export const Route = createFileRoute("/painel/gestor/login")({
  head: () => ({ meta: [{ title: "Acesso do Gestor — Painel Escolar" }] }),
  component: LoginGestor,
});

function LoginGestor() {
  return (
    <LoginEquipeEscola
      cargosPermitidos={["gestor"]}
      titulo="Acesso do Gestor"
      descricao="Área restrita à gestão escolar"
      textoBotao="Entrar como gestor"
    />
  );
}
