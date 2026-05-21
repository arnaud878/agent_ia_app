import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { getAppEnv } from '@/config/env'
import { useAuth } from '@/auth/AuthContext'
import {
  apiCreateRole,
  apiCreateUser,
  apiGetBiConnection,
  apiGetLlmSettings,
  apiListBiTables,
  apiListRoles,
  apiListUsers,
  apiSetBiConnection,
  apiSetBiTables,
  apiSetLlmSettings,
  apiSetRoleTables,
  type BiDbType,
  type LlmProvider,
} from '@/api/iam-client'
import type { RoleRow, UserRow } from '@/auth/types'
import { useI18n } from '@/i18n'

const STORED_API_KEY_MASK = '........'

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
  const [biConnectionDraft, setBiConnectionDraft] = useState('')
  const [biDbType, setBiDbType] = useState<BiDbType>('postgresql')
  const [llmProvider, setLlmProvider] = useState<LlmProvider>('gemini')
  const [llmModel, setLlmModel] = useState('gemini-2.5-flash')
  const [llmApiKey, setLlmApiKey] = useState('')
  const [llmHasApiKey, setLlmHasApiKey] = useState(false)

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
    const [conn, llm] = await Promise.all([
      apiGetBiConnection(baseUrl, token),
      apiGetLlmSettings(baseUrl, token),
    ])
    setBiTables(bi)
    setBiTablesDraft(bi.join('\n'))
    setBiConnectionDraft(conn.connectionString || '')
    setBiDbType(conn.dbType ?? 'postgresql')
    setLlmProvider(llm.provider)
    setLlmModel(llm.model)
    setLlmHasApiKey(llm.hasApiKey)
    setLlmApiKey(llm.hasApiKey ? STORED_API_KEY_MASK : '')
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

  const onSaveBiConnection = () => {
    if (!token) {
      return
    }
    setError(null)
    setSuccess(null)
    void (async () => {
      try {
        await apiSetBiConnection(baseUrl, token, biConnectionDraft, biDbType)
        await load()
        setSuccess(t('admin.success.biConnectionUpdated'))
      } catch (e) {
        setError(e instanceof Error ? e.message : t('common.error'))
      }
    })()
  }

  const onSaveLlmSettings = () => {
    if (!token) {
      return
    }
    setError(null)
    setSuccess(null)
    void (async () => {
      try {
        await apiSetLlmSettings(baseUrl, token, {
          provider: llmProvider,
          model: llmModel.trim(),
          apiKey:
            llmApiKey.trim().length > 0 && llmApiKey !== STORED_API_KEY_MASK
              ? llmApiKey.trim()
              : undefined,
        })
        await load()
        setSuccess(t('admin.success.llmUpdated'))
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
    biConnectionDraft,
    setBiConnectionDraft,
    biDbType,
    setBiDbType,
    llmProvider,
    setLlmProvider,
    llmModel,
    setLlmModel,
    llmApiKey,
    setLlmApiKey,
    llmHasApiKey,
    onCreateUser,
    onCreateRole,
    openTableEditor,
    onSaveRoleTables,
    onSaveBiTables,
    onSaveBiConnection,
    onSaveLlmSettings,
    load,
  }
}

export type AdminIamContextValue = ReturnType<typeof useAdminIam>
