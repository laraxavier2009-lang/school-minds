export type CargoEquipe = "psicologo" | "orientador" | "gestor";

export type Tema = "ansiedade" | "tristeza" | "bullying" | "luto" | "estresse" | "pedir_ajuda";

export type NivelRisco = "leve" | "medio" | "grave";

export type NivelAlerta = "medio" | "grave";

export type StatusAlerta = "pendente" | "em_atendimento" | "concluido";

export interface EquipeEscolaRow {
  id: string;
  nome: string;
  email: string;
  cargo: CargoEquipe;
  criado_em: string;
}

export interface EquipeEscolaInsert {
  id: string;
  nome: string;
  email: string;
  cargo: CargoEquipe;
  criado_em?: string;
}

export interface EquipeEscolaUpdate {
  id?: string;
  nome?: string;
  email?: string;
  cargo?: CargoEquipe;
  criado_em?: string;
}

export interface SessaoRow {
  id: string;
  iniciada_em: string;
  encerrada_em: string | null;
  status: string;
}

export interface SessaoInsert {
  id?: string;
  iniciada_em?: string;
  encerrada_em?: string | null;
  status: string;
}

export interface SessaoUpdate {
  id?: string;
  iniciada_em?: string;
  encerrada_em?: string | null;
  status?: string;
}

export interface RegistroRow {
  id: string;
  sessao_id: string;
  tema: Tema;
  pontuacao_total: number;
  nivel_risco: NivelRisco;
  criado_em: string;
}

export interface RegistroInsert {
  id?: string;
  sessao_id: string;
  tema: Tema;
  pontuacao_total: number;
  nivel_risco: NivelRisco;
  criado_em?: string;
}

export interface RegistroUpdate {
  id?: string;
  sessao_id?: string;
  tema?: Tema;
  pontuacao_total?: number;
  nivel_risco?: NivelRisco;
  criado_em?: string;
}

export interface AlertaRow {
  id: string;
  registro_id: string;
  nivel: NivelAlerta;
  status: StatusAlerta;
  visualizado: boolean;
  visualizado_por: string | null;
  emitido_em: string;
}

export interface AlertaInsert {
  id?: string;
  registro_id: string;
  nivel: NivelAlerta;
  status: StatusAlerta;
  visualizado?: boolean;
  visualizado_por?: string | null;
  emitido_em?: string;
}

export interface AlertaUpdate {
  id?: string;
  registro_id?: string;
  nivel?: NivelAlerta;
  status?: StatusAlerta;
  visualizado?: boolean;
  visualizado_por?: string | null;
  emitido_em?: string;
}

export interface RegistroEstatisticoRow {
  id: string;
  registro_id: string;
  tema: string;
  nivel_gravidade: string;
  semana_ano: number;
  ano: number;
}

export interface RegistroEstatisticoInsert {
  id?: string;
  registro_id: string;
  tema: string;
  nivel_gravidade: string;
  semana_ano: number;
  ano: number;
}

export interface RegistroEstatisticoUpdate {
  id?: string;
  registro_id?: string;
  tema?: string;
  nivel_gravidade?: string;
  semana_ano?: number;
  ano?: number;
}

type DatabaseObject<T> = { [Property in keyof T]: T[Property] };

export interface Database {
  public: {
    Tables: {
      equipe_escola: {
        Row: DatabaseObject<EquipeEscolaRow>;
        Insert: DatabaseObject<EquipeEscolaInsert>;
        Update: DatabaseObject<EquipeEscolaUpdate>;
        Relationships: [];
      };
      sessao: {
        Row: DatabaseObject<SessaoRow>;
        Insert: DatabaseObject<SessaoInsert>;
        Update: DatabaseObject<SessaoUpdate>;
        Relationships: [];
      };
      registros: {
        Row: DatabaseObject<RegistroRow>;
        Insert: DatabaseObject<RegistroInsert>;
        Update: DatabaseObject<RegistroUpdate>;
        Relationships: [
          {
            foreignKeyName: "registros_sessao_id_fkey";
            columns: ["sessao_id"];
            isOneToOne: false;
            referencedRelation: "sessao";
            referencedColumns: ["id"];
          },
        ];
      };
      alertas: {
        Row: DatabaseObject<AlertaRow>;
        Insert: DatabaseObject<AlertaInsert>;
        Update: DatabaseObject<AlertaUpdate>;
        Relationships: [
          {
            foreignKeyName: "alertas_registro_id_fkey";
            columns: ["registro_id"];
            isOneToOne: false;
            referencedRelation: "registros";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alertas_visualizado_por_fkey";
            columns: ["visualizado_por"];
            isOneToOne: false;
            referencedRelation: "equipe_escola";
            referencedColumns: ["id"];
          },
        ];
      };
      registro_estatistico: {
        Row: DatabaseObject<RegistroEstatisticoRow>;
        Insert: DatabaseObject<RegistroEstatisticoInsert>;
        Update: DatabaseObject<RegistroEstatisticoUpdate>;
        Relationships: [
          {
            foreignKeyName: "registro_estatistico_registro_id_fkey";
            columns: ["registro_id"];
            isOneToOne: false;
            referencedRelation: "registros";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
