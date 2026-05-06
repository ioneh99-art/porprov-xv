export type UserRole = 'admin' | 'konida' | 'operator_cabor'

export interface AuthUser {
  id: string
  username: string
  nama: string
  role: UserRole
  kontingen_id?: number | null
  cabor_id?: number | null
}