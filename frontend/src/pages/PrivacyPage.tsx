import { useTranslation } from 'react-i18next';
import { faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { IconCircle } from '../components/ui';
import { PublicHeader, PublicFooter } from '../components/layout';

/**
 * Privacy Policy page.
 * CRITICAL: Scaffold content — actual legal language needs review.
 */
export function PrivacyPage() {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary-50/40 to-white">
      <PublicHeader />

      <main className="flex-1 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Page header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-4">
              <IconCircle icon={faEyeSlash} size="lg" color="primary" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-gray-900">
              {t('legal.privacyTitle')}
            </h1>
            <p className="text-sm text-gray-500 mt-2">{t('legal.privacyLastUpdated')}</p>
            <p className="mt-4 text-gray-700">{t('legal.privacyIntro')}</p>
          </div>

          <div className="space-y-8">
            <PrivacySection
              title={t('legal.privacyWhatWeCollect')}
              body={t('legal.privacyWhatWeCollectDesc')}
            />
            <PrivacySection
              title={t('legal.privacyWhatWeDontCollect')}
              body={t('legal.privacyWhatWeDontCollectDesc')}
            />
            <PrivacySection
              title={t('legal.privacyEncryption')}
              body={t('legal.privacyEncryptionDesc')}
            />
            <PrivacySection
              title={t('legal.privacyDataRetention')}
              body={t('legal.privacyDataRetentionDesc')}
            />
            <PrivacySection
              title={t('legal.privacySubpoena')}
              body={t('legal.privacySubpoenaDesc')}
            />
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

function PrivacySection({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-heading text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-700 leading-relaxed">{body}</p>
    </div>
  );
}
