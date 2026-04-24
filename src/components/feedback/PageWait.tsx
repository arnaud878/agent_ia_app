import { t } from '@/i18n'

/** État d’attente partagé (chargement de session, routage) */
export function PageWait() {
  return <p className="page-wait">{t('app.wait')}</p>
}
