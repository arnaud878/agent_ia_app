import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { getAppEnv } from '@/config/env'
import { useAuth } from '@/auth/AuthContext'
import {
  apiCreateRole,
  apiCreateUser,
  apiListBiTables,
  apiListRoles,
  apiListUsers,
  apiSetBiTables,
  apiSetRoleTables,
} from '@/api/iam-client'
import type { RoleRow, UserRow } from '@/auth/types'
import { useI18n } from '@/i18n'

/**
 * État partagé entre les écrans d’administration (utilisateurs / rôles).
 */
export function useAdminIam() {
  const { t } = useI18n()
  const { token, refreshUser } = useAuth()
  const baseUrl = getAppEnv().baseUrl

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [biTables, setBiTables] = useState<string[]>([])
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [users, setUsers] = useState<UserRow[]>([])

  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRoleId, setNewUserRoleId] = useState('')

  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleSlug, setNewRoleSlug] = useState('')
  const [newRoleAll, setNewRoleAll] = useState(false)
  const [newRoleDesc, setNewRoleDesc] = useState('')

  const [tableEditRoleId, setTableEditRoleId] = useState<string | null>(null)
  const [tableSelection, setTableSelection] = useState<Record<string, boolean>>(
    {},
  )
  const [biTablesDraft, setBiTablesDraft] = useState('')

  const load = useCallback(async () => {
    if (!token) {
      return
    }
    setError(null)
    setSuccess(null)
    const [bi, r, u] = await Promise.all([
      apiListBiTables(baseUrl, token),
      apiListRoles(baseUrl, token),
      apiListUsers(baseUrl, token),
    ])
    setBiTables(bi)
    setBiTablesDraft(bi.join('\n'))
    setRoles(r)
    setUsers(u)
  }, [baseUrl, token])

  useEffect(() => {
    void (async () => {
      if (!token) {
        return
      }
      try {
        await load()
        await refreshUser()
      } catch (e) {
        setError(e instanceof Error ? e.message : t('common.errorLoad'))
      }
    })()
  }, [token, load, refreshUser, t])

  useEffect(() => {
    if (!success) {
      return
    }
    const id = window.setTimeout(() => setSuccess(null), 3000)
    return () => window.clearTimeout(id)
  }, [success])

  const onCreateUser = (e: FormEvent) => {
    e.preventDefault()
    if (!token || !newUserRoleId) {
      return
    }
    setError(null)
    setSuccess(null)
    void (async () => {
      try {
        await apiCreateUser(baseUrl, token, {
          email: newUserEmail.trim(),
          password: newUserPassword,
          roleId: newUserRoleId,
        })
        setNewUserEmail('')
        setNewUserPassword('')
        setNewUserRoleId('')
        await load()
        setSuccess(t('admin.success.userCreated'))
      } catch (e) {
        setError(e instanceof Error ? e.message : t('common.error'))
      }
    })()
  }

  const onCreateRole = (e: FormEvent) => {
    e.preventDefault()
    if (!token) {
      return
    }
    setError(null)
    setSuccess(null)
    void (async () => {
      try {
        await apiCreateRole(baseUrl, token, {
          name: newRoleName,
          slug: newRoleSlug,
          accessAllTables: newRoleAll,
          description: newRoleDesc || undefined,
        })
        setNewRoleName('')
        setNewRoleSlug('')
        setNewRoleAll(false)
        setNewRoleDesc('')
        await load()
        setSuccess(t('admin.success.roleCreated'))
      } catch (e) {
        setError(e instanceof Error ? e.message : t('common.error'))
      }
    })()
  }

  const openTableEditor = (r: RoleRow) => {
    if (r.accessAll) {
      return
    }
    setTableEditRoleId(r.id)
    const sel: Record<string, boolean> = {}
    for (const name of biTables) {
      sel[name] = r.tables.includes(name)
    }
    setTableSelection(sel)
  }

  const onSaveRoleTables = () => {
    if (!token || !tableEditRoleId) {
      return
    }
    const names = Object.entries(tableSelection)
      .filter(([, v]) => v)
      .map(([k]) => k)
    setError(null)
    setSuccess(null)
    void (async () => {
      try {
        await apiSetRoleTables(baseUrl, token, tableEditRoleId, names)
        setTableEditRoleId(null)
        await load()
        setSuccess(t('admin.success.roleTablesUpdated'))
      } catch (e) {
        setError(e instanceof Error ? e.message : t('common.error'))
      }
    })()
  }

  const onSaveBiTables = () => {
    if (!token) {
      return
    }
    const names = biTablesDraft
      .split('\n')
      .map((x) => x.trim())
      .filter((x) => x.length > 0)
    setError(null)
    setSuccess(null)
    void (async () => {
      try {
        const saved = await apiSetBiTables(baseUrl, token, names)
        setBiTables(saved)
        setBiTablesDraft(saved.join('\n'))
        await load()
        setSuccess(t('admin.success.biTablesUpdated'))
      } catch (e) {
        setError(e instanceof Error ? e.message : t('common.error'))
      }
    })()
  }

  return {
    token,
    error,
    setError,
    success,
    setSuccess,
    biTables,
    roles,
    users,
    newUserEmail,
    setNewUserEmail,
    newUserPassword,
    setNewUserPassword,
    newUserRoleId,
    setNewUserRoleId,
    newRoleName,
    setNewRoleName,
    newRoleSlug,
    setNewRoleSlug,
    newRoleAll,
    setNewRoleAll,
    newRoleDesc,
    setNewRoleDesc,
    tableEditRoleId,
    setTableEditRoleId,
    tableSelection,
    setTableSelection,
    biTablesDraft,
    setBiTablesDraft,
    onCreateUser,
    onCreateRole,
    openTableEditor,
    onSaveRoleTables,
    onSaveBiTables,
    load,
  }
}

export type AdminIamContextValue = ReturnType<typeof useAdminIam>
