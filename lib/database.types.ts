export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: number
          user_id: string
          nazov: string
          ulica: string
          mesto: string
          tel: string
          email: string
          kotol: string
          interval: string
          datum_m: string | null
          poznamka: string
          sluzba: string
          vyrobne_cislo: string
          gdpr_consent: boolean
          gdpr_consent_date: string | null
          gdpr_signature: string | null
          created_at: string
        }
        Insert: {
          id?: never
          user_id?: string
          nazov: string
          ulica?: string
          mesto?: string
          tel?: string
          email?: string
          kotol?: string
          interval?: string
          datum_m?: string | null
          poznamka?: string
          sluzba?: string
          vyrobne_cislo?: string
          gdpr_consent?: boolean
          gdpr_consent_date?: string | null
          gdpr_signature?: string | null
          created_at?: string
        }
        Update: {
          user_id?: string
          nazov?: string
          ulica?: string
          mesto?: string
          tel?: string
          email?: string
          kotol?: string
          interval?: string
          datum_m?: string | null
          poznamka?: string
          sluzba?: string
          vyrobne_cislo?: string
          gdpr_consent?: boolean
          gdpr_consent_date?: string | null
          gdpr_signature?: string | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          user_id: string
          company_id: string
          role: 'admin' | 'technician'
          full_name: string
          company_name: string  // legacy column
          phone: string         // legacy column
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          company_id?: string
          role?: 'admin' | 'technician'
          full_name?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          role?: 'admin' | 'technician'
          full_name?: string
          email?: string
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          phone: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string
          phone?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          phone?: string
          email?: string
          updated_at?: string
        }
      }
      kotle: {
        Row: {
          id: number
          nazov: string
        }
        Insert: {
          id?: never
          nazov: string
        }
        Update: {
          nazov?: string
        }
      }
      komponenty: {
        Row: {
          id: number
          nazov: string
        }
        Insert: {
          id?: never
          nazov: string
        }
        Update: {
          nazov?: string
        }
      }
      ukony: {
        Row: {
          id: number
          nazov: string
          created_at: string
        }
        Insert: {
          id?: never
          nazov: string
          created_at?: string
        }
        Update: {
          nazov?: string
        }
      }
      revizie: {
        Row: {
          id: number
          user_id: string
          customer_id: number | null
          umiestnenie: string
          kotol: string
          vyrobne_cislo: string
          datum: string
          checks: Json
          poznamka: string
          sposobile: boolean | null
          reminder_sent: boolean
          reminder_sent_at: string | null
          reminder_response: 'yes' | 'no' | null
          reminder_response_at: string | null
          next_revizia_date: string | null
          protokol_url: string | null
          created_at: string
        }
        Insert: {
          id?: never
          user_id?: string
          customer_id?: number | null
          umiestnenie?: string
          kotol?: string
          vyrobne_cislo?: string
          datum?: string
          checks?: Json
          poznamka?: string
          sposobile?: boolean | null
          reminder_sent?: boolean
          reminder_sent_at?: string | null
          reminder_response?: 'yes' | 'no' | null
          reminder_response_at?: string | null
          next_revizia_date?: string | null
          protokol_url?: string | null
          created_at?: string
        }
        Update: {
          user_id?: string
          customer_id?: number | null
          umiestnenie?: string
          kotol?: string
          vyrobne_cislo?: string
          datum?: string
          checks?: Json
          poznamka?: string
          sposobile?: boolean | null
          reminder_sent?: boolean
          reminder_sent_at?: string | null
          reminder_response?: 'yes' | 'no' | null
          reminder_response_at?: string | null
          next_revizia_date?: string | null
          protokol_url?: string | null
        }
      }
      opravy: {
        Row: {
          id: number
          user_id: string
          customer_id: number | null
          servisny_list_cislo: string
          datum_vyjazdu: string
          cas_od: string
          cas_do: string
          vyrobne_cislo: string
          nahlasena_porucha: string
          diagnostika: string
          odstranenie: string
          poznamka: string
          material: Json
          ukony: Json
          servisny_vyjazd: number
          ico: string
          ic_dph: string
          datum_uhrady: string | null
          zaznam_url: string | null
          created_at: string
        }
        Insert: {
          id?: never
          user_id?: string
          customer_id?: number | null
          servisny_list_cislo?: string
          datum_vyjazdu?: string
          cas_od?: string
          cas_do?: string
          vyrobne_cislo?: string
          nahlasena_porucha?: string
          diagnostika?: string
          odstranenie?: string
          poznamka?: string
          material?: Json
          ukony?: Json
          servisny_vyjazd?: number
          ico?: string
          ic_dph?: string
          datum_uhrady?: string | null
          zaznam_url?: string | null
          created_at?: string
        }
        Update: {
          user_id?: string
          customer_id?: number | null
          servisny_list_cislo?: string
          datum_vyjazdu?: string
          cas_od?: string
          cas_do?: string
          vyrobne_cislo?: string
          nahlasena_porucha?: string
          diagnostika?: string
          odstranenie?: string
          poznamka?: string
          material?: Json
          ukony?: Json
          servisny_vyjazd?: number
          ico?: string
          ic_dph?: string
          datum_uhrady?: string | null
          zaznam_url?: string | null
        }
      }
    }
  }
}

export type Customer = Database['public']['Tables']['customers']['Row']
export type CustomerInsert = Database['public']['Tables']['customers']['Insert']
export type CustomerUpdate = Database['public']['Tables']['customers']['Update']

export type Kotol = Database['public']['Tables']['kotle']['Row']
export type Komponent = Database['public']['Tables']['komponenty']['Row']
export type Ukon = Database['public']['Tables']['ukony']['Row']

export type Revizia = Database['public']['Tables']['revizie']['Row']
export type ReviziaInsert = Database['public']['Tables']['revizie']['Insert']
export type ReviziaUpdate = Database['public']['Tables']['revizie']['Update']

export type Oprava = Database['public']['Tables']['opravy']['Row']
export type OpravaInsert = Database['public']['Tables']['opravy']['Insert']
export type OpravaUpdate = Database['public']['Tables']['opravy']['Update']

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Company = Database['public']['Tables']['companies']['Row']
export type CompanyInsert = Database['public']['Tables']['companies']['Insert']
export type CompanyUpdate = Database['public']['Tables']['companies']['Update']

export interface CheckItem {
  id: string
  label: string
  checked: boolean
}

export interface MaterialRow {
  id: string
  nazov: string
  ks: number
  cena_bez_dph: number
  spolu_bez_dph: number
}

export interface UkonRow {
  id: string
  nazov: string
  cena_bez_dph: number
}
