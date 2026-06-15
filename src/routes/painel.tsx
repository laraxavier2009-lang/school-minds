import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/painel")({
  head: () => ({ meta: [{ title: "Painel da escola — Saúde Mental" }] }),
  component: PainelLayout,
});

function PainelLayout() {
  return <Outlet />;
}