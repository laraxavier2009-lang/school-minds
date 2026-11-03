import type { Database as SupabaseDatabase } from "@/integrations/supabase/types";

export type Database = SupabaseDatabase;
export type CargoEquipe = Database["public"]["Tables"]["equipe_escola"]["Row"]["cargo"];
export type Tema = Database["public"]["Enums"]["tema_enum"];
export type NivelRisco = Database["public"]["Enums"]["nivel_enum"];
export type NivelAlerta = Database["public"]["Tables"]["alertas"]["Row"]["nivel"];
export type StatusAlerta = Database["public"]["Enums"]["status_enum"];

export type EquipeEscolaRow = Database["public"]["Tables"]["equipe_escola"]["Row"];
export type EquipeEscolaInsert = Database["public"]["Tables"]["equipe_escola"]["Insert"];
export type EquipeEscolaUpdate = Database["public"]["Tables"]["equipe_escola"]["Update"];
export type SessaoRow = Database["public"]["Tables"]["sessao"]["Row"];
export type SessaoInsert = Database["public"]["Tables"]["sessao"]["Insert"];
export type SessaoUpdate = Database["public"]["Tables"]["sessao"]["Update"];
export type RegistroRow = Database["public"]["Tables"]["registros"]["Row"];
export type RegistroInsert = Database["public"]["Tables"]["registros"]["Insert"];
export type RegistroUpdate = Database["public"]["Tables"]["registros"]["Update"];
export type AlertaRow = Database["public"]["Tables"]["alertas"]["Row"];
export type AlertaInsert = Database["public"]["Tables"]["alertas"]["Insert"];
export type AlertaUpdate = Database["public"]["Tables"]["alertas"]["Update"];
export type RegistroEstatisticoRow = Database["public"]["Tables"]["registro_estatistico"]["Row"];
export type RegistroEstatisticoInsert =
  Database["public"]["Tables"]["registro_estatistico"]["Insert"];
export type RegistroEstatisticoUpdate =
  Database["public"]["Tables"]["registro_estatistico"]["Update"];
