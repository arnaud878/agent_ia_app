export type UserSession = {
  id: string
  email: string
  roleSlug: string
}

export type LoginResponse = {
  access_token: string
  user: UserSession & {
    dataAccess?: { kind: string; tableNames?: string[] }
  }
}

export type RoleRow = {
  id: string
  name: string
  slug: string
  description: string | null
  accessAll: boolean
  createdAt?: string
  tables: string[]
}

export type UserRow = {
  id: string
  email: string
  active: boolean
  roleId: string
  roleSlug: string
  roleName: string
  createdAt?: string
}
