import { useI18n } from '@/i18n'

/** État d’attente partagé (chargement de session, routage) */
export function PageWait() {
  const { t } = useI18n()
  return <p className="page-wait">{t('app.wait')}</p>
}
