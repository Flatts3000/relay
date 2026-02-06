import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { faScaleBalanced } from '@fortawesome/free-solid-svg-icons';
import { IconCircle } from '../components/ui';
import { PublicHeader, PublicFooter } from '../components/layout';

/**
 * Combined Privacy Policy + Terms of Service page.
 * Linked as /legal#privacy and /legal#terms.
 * CRITICAL: Scaffold content — actual legal language needs review.
 */
export function LegalPage() {
  const { t } = useTranslation('common');
  const { hash } = useLocation();

  // Scroll to anchor on mount or hash change
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [hash]);

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
            <h1 className="font-heading text-3xl font-bold text-gray-900">{t('legal.title')}</h1>
          </div>

          {/* Privacy Policy */}
          <section id="privacy" className="mb-16 scroll-mt-24">
            <h2 className="font-heading text-2xl font-bold text-gray-900 mb-2">
              {t('legal.privacyTitle')}
            </h2>
            <p className="text-sm text-gray-500 mb-6">{t('legal.privacyLastUpdated')}</p>
            <p className="text-gray-700 mb-8">{t('legal.privacyIntro')}</p>

            <div className="space-y-8">
              <LegalSection
                title={t('legal.privacyWhatWeCollect')}
                body={t('legal.privacyWhatWeCollectDesc')}
              />
              <LegalSection
                title={t('legal.privacyWhatWeDontCollect')}
                body={t('legal.privacyWhatWeDontCollectDesc')}
              />
              <LegalSection
                title={t('legal.privacyEncryption')}
                body={t('legal.privacyEncryptionDesc')}
              />
              <LegalSection
                title={t('legal.privacyDataRetention')}
                body={t('legal.privacyDataRetentionDesc')}
              />
              <LegalSection
                title={t('legal.privacySubpoena')}
                body={t('legal.privacySubpoenaDesc')}
              />
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-gray-200 mb-16" />

          {/* Terms of Service */}
          <section id="terms" className="mb-16 scroll-mt-24">
            <h2 className="font-heading text-2xl font-bold text-gray-900 mb-2">
              {t('legal.termsTitle')}
            </h2>
            <p className="text-sm text-gray-500 mb-6">{t('legal.termsLastUpdated')}</p>
            <p className="text-gray-700 mb-8">{t('legal.termsIntro')}</p>

            <div className="space-y-8">
              <LegalSection
                title={t('legal.termsWhatRelayIs')}
                body={t('legal.termsWhatRelayIsDesc')}
              />
              <LegalSection
                title={t('legal.termsNoGuarantees')}
                body={t('legal.termsNoGuaranteesDesc')}
              />
              <LegalSection
                title={t('legal.termsPassphraseResponsibility')}
                body={t('legal.termsPassphraseResponsibilityDesc')}
              />
              <LegalSection
                title={t('legal.termsGroupIndependence')}
                body={t('legal.termsGroupIndependenceDesc')}
              />
              <LegalSection
                title={t('legal.termsAcceptableUse')}
                body={t('legal.termsAcceptableUseDesc')}
              />
            </div>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

function LegalSection({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-heading text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-700 leading-relaxed">{body}</p>
    </div>
  );
}
