import { useContext } from 'react'
import { AdminIamContext } from '@/context/admin-iam.context'
import type { AdminIamContextValue } from './use-admin-iam'

export function useAdminIamContext(): AdminIamContextValue {
  const v = useContext(AdminIamContext)
  if (v == null) {
    throw new Error('useAdminIamContext doit être utilisé sous AdminLayout')
  }
  return v
}
