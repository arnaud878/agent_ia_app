import { createContext } from 'react'
import type { AdminIamContextValue } from '@/hooks/use-admin-iam'

export const AdminIamContext = createContext<AdminIamContextValue | null>(null)
