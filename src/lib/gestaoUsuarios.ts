import { supabaseClient } from "@/lib/supabaseClient";

export type CargoGerenciavel = "psicologo" | "orientador";

export interface NovoMembroEquipe {
  nome: string;
  email: string;
  cargo: CargoGerenciavel;
}

export interface MembroEquipeCriado {
  id: string;
  email: string;
  cargo: CargoGerenciavel;
}

export async function cadastrarMembroEquipe(membro: NovoMembroEquipe): Promise<MembroEquipeCriado> {
  const { data, error } = await supabaseClient.functions.invoke<MembroEquipeCriado>(
    "gestao-usuarios",
    {
      body: {
        nome: membro.nome.trim(),
        email: membro.email.trim().toLowerCase(),
        cargo: membro.cargo,
      },
    },
  );

  if (error) {
    throw new Error(`Não foi possível cadastrar o membro da equipe: ${error.message}`, {
      cause: error,
    });
  }
  if (!data?.id || !data.email) {
    throw new Error("A API não retornou os dados do membro cadastrado.");
  }

  return data;
}
