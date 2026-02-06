import { useTranslation } from 'react-i18next';
import { faScaleBalanced } from '@fortawesome/free-solid-svg-icons';
import { IconCircle } from '../components/ui';
import { PublicHeader, PublicFooter } from '../components/layout';

/**
 * Terms of Service page.
 * CRITICAL: Scaffold content — actual legal language needs review.
 */
export function TermsPage() {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary-50/40 to-white">
      <PublicHeader />

      <main className="flex-1 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Page header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-4">
              <IconCircle icon={faScaleBalanced} size="lg" color="primary" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-gray-900">
              {t('legal.termsTitle')}
            </h1>
            <p className="text-sm text-gray-500 mt-2">{t('legal.termsLastUpdated')}</p>
            <p className="mt-4 text-gray-700">{t('legal.termsIntro')}</p>
          </div>

          <div className="space-y-8">
            <TermsSection
              title={t('legal.termsWhatRelayIs')}
              body={t('legal.termsWhatRelayIsDesc')}
            />
            <TermsSection
              title={t('legal.termsNoGuarantees')}
              body={t('legal.termsNoGuaranteesDesc')}
            />
            <TermsSection
              title={t('legal.termsPassphraseResponsibility')}
              body={t('legal.termsPassphraseResponsibilityDesc')}
            />
            <TermsSection
              title={t('legal.termsGroupIndependence')}
              body={t('legal.termsGroupIndependenceDesc')}
            />
            <TermsSection
              title={t('legal.termsAcceptableUse')}
              body={t('legal.termsAcceptableUseDesc')}
            />
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

function TermsSection({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-heading text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-700 leading-relaxed">{body}</p>
    </div>
  );
}
