import { useTranslation } from 'react-i18next';
import { faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { IconCircle } from '../components/ui';
import { PublicHeader, PublicFooter } from '../components/layout';

/**
 * Public security practices page for stakeholders (hubs, funders, partners).
 * Describes Relay's security architecture in more technical detail than /privacy.
 */
export function SecurityPage() {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary-50/40 to-white">
      <PublicHeader />

      <main className="flex-1 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Page header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-4">
              <IconCircle icon={faShieldHalved} size="lg" color="primary" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-gray-900">{t('security.title')}</h1>
            <p className="mt-4 text-gray-700">{t('security.intro')}</p>
          </div>

          <div className="space-y-8">
            <SecuritySection
              title={t('security.approachTitle')}
              body={t('security.approachDesc')}
            />
            <SecuritySection
              title={t('security.encryptionTitle')}
              body={t('security.encryptionDesc')}
            />
            <SecuritySection
              title={t('security.anonymousAccessTitle')}
              body={t('security.anonymousAccessDesc')}
            />
            <SecuritySection
              title={t('security.infrastructureTitle')}
              body={t('security.infrastructureDesc')}
            />
            <SecuritySection title={t('security.authTitle')} body={t('security.authDesc')} />
            <SecuritySection
              title={t('security.inputValidationTitle')}
              body={t('security.inputValidationDesc')}
            />
            <SecuritySection
              title={t('security.dataRetentionTitle')}
              body={t('security.dataRetentionDesc')}
            />
            <SecuritySection
              title={t('security.subpoenaTitle')}
              body={t('security.subpoenaDesc')}
            />
            <SecuritySection
              title={t('security.openSourceTitle')}
              body={t('security.openSourceDesc')}
            />
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

function SecuritySection({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-heading text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-700 leading-relaxed">{body}</p>
    </div>
  );
}
