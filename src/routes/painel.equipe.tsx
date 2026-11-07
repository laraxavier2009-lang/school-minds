import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GestaoEquipe } from "@/components/GestaoEquipe";

export const Route = createFileRoute("/painel/equipe")({
  head: () => ({ meta: [{ title: "Gestão de equipe — Saúde Mental" }] }),
  component: () => (
    <ProtectedRoute cargosPermitidos={CARGOS_GESTOR}>
      <GestaoEquipePage />
    </ProtectedRoute>
  ),
});

const CARGOS_GESTOR = ["gestor"] as const;

function GestaoEquipePage() {
  return <GestaoEquipe />;
}
