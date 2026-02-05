import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faLock,
  faArrowRight,
  faXmark,
  faHandHoldingHeart,
  faBuilding,
  faShieldHalved,
  faEnvelope,
  faLocationDot,
  faComments,
  faHandshake,
  faEyeSlash,
  faLightbulb,
  faBuildingColumns,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { LanguageSwitcher, Button, Input, Alert } from '../components/ui';
import { HeroIllustration } from './HeroIllustration';

const individualStepIcons = [faEnvelope, faLocationDot, faComments, faHandshake];

export function HomePage() {
  const { t } = useTranslation(['home', 'common']);
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactStatus, setContactStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setContactStatus('idle');

    try {
      const response = await fetch('https://formspree.io/f/mvzbpwzw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: contactEmail,
          message: contactMessage,
        }),
      });

      if (response.ok) {
        setContactStatus('success');
        setContactEmail('');
        setContactMessage('');
      } else {
        setContactStatus('error');
      }
    } catch {
      setContactStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
      >
        {t('home:skipToContent')}
      </a>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center">
              <img src="/logo.png" alt={t('common:appName')} className="h-7" />
            </Link>
            <nav className="hidden sm:flex items-center gap-6">
              <button
                type="button"
                onClick={() => scrollToSection('individual')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {t('home:nav.forIndividuals')}
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('organizations')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {t('home:nav.forOrganizations')}
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('safety')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {t('home:nav.safety')}
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('contact')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {t('home:nav.contact')}
              </button>
              <LanguageSwitcher />
            </nav>
            <div className="sm:hidden">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      <main id="main-content">
        {/* Hero Section — Split Layout */}
        <section className="py-20 sm:py-28 bg-gradient-to-b from-blue-50/40 to-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                  {t('home:hero.title')}
                </h1>
                <p className="text-lg sm:text-xl text-gray-600 mb-10">{t('home:hero.subtitle')}</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <button
                    type="button"
                    onClick={() => scrollToSection('individual')}
                    className="inline-flex items-center justify-center px-8 py-4 min-h-[52px] bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-lg"
                  >
                    {t('home:hero.individualCta')}
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection('organizations')}
                    className="inline-flex items-center justify-center px-8 py-4 min-h-[52px] bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-lg"
                  >
                    {t('home:hero.orgCta')}
                  </button>
                </div>
              </div>
              <div className="flex-1 hidden md:flex justify-center">
                <HeroIllustration />
              </div>
            </div>
          </div>
        </section>

        {/* Gradient separator */}
        <div
          className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"
          aria-hidden="true"
        />

        {/* Individual Path Section */}
        <section
          id="individual"
          className="py-16 sm:py-24 bg-blue-50 scroll-mt-20"
          aria-labelledby="individual-title"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <FontAwesomeIcon icon={faHandHoldingHeart} className="text-2xl text-blue-600" />
              </div>
              <h2
                id="individual-title"
                className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2"
              >
                {t('home:paths.individual.title')}
              </h2>
              <p className="text-lg text-blue-700 font-medium mb-4">
                {t('home:paths.individual.subtitle')}
              </p>
              <p className="text-gray-600 max-w-2xl mx-auto">
                {t('home:paths.individual.description')}
              </p>
            </div>

            {/* Feature bullets */}
            <div className="max-w-2xl mx-auto mb-12">
              <ul className="grid sm:grid-cols-2 gap-3">
                {(t('home:paths.individual.features', { returnObjects: true }) as string[]).map(
                  (feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="text-blue-500 flex-shrink-0 mt-0.5" aria-hidden="true">
                        <FontAwesomeIcon icon={faCheck} />
                      </span>
                      {feature}
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* How it works — 4 steps with icon stepper */}
            <div className="mb-12">
              <h3 className="text-xl font-semibold text-gray-900 text-center mb-8">
                {t('home:paths.individual.howItWorks.title')}
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((step, idx) => (
                  <div key={step} className="flex flex-col items-center">
                    {/* Vertical connector on mobile (between steps) */}
                    {idx > 0 && (
                      <div className="w-0.5 h-6 bg-blue-200 sm:hidden mb-2" aria-hidden="true" />
                    )}
                    <div className="text-center w-full relative">
                      <div className="relative inline-block mb-3">
                        <div className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md shadow-blue-200">
                          <FontAwesomeIcon icon={individualStepIcons[idx]!} className="text-lg" />
                        </div>
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-blue-600 rounded-full text-xs font-bold flex items-center justify-center ring-2 ring-blue-600">
                          {step}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {t(`home:paths.individual.howItWorks.step${step}.title`)}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {t(`home:paths.individual.howItWorks.step${step}.description`)}
                      </p>
                      {/* Horizontal connector on lg (between steps) */}
                      {idx < 3 && (
                        <div
                          className="hidden lg:block absolute top-10 -right-3 w-6 h-0.5 bg-blue-200"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Privacy guarantees */}
            <div className="border-t border-blue-200 pt-8 max-w-2xl mx-auto mb-8">
              <h3 className="font-semibold text-gray-900 mb-4 text-center flex items-center justify-center gap-2">
                <FontAwesomeIcon icon={faLock} className="text-blue-500" />
                {t('home:paths.individual.privacy.title')}
              </h3>
              <ul className="space-y-2">
                {(
                  t('home:paths.individual.privacy.items', { returnObjects: true }) as string[]
                ).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-600 text-sm">
                    <span className="text-blue-500 flex-shrink-0 mt-0.5" aria-hidden="true">
                      <FontAwesomeIcon icon={faLock} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="text-center">
              <Link
                to="/help"
                className="inline-flex items-center justify-center px-8 py-4 min-h-[52px] bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-lg"
              >
                {t('home:paths.individual.cta')}
              </Link>
            </div>
          </div>
        </section>

        {/* Organization Path Section */}
        <section
          id="organizations"
          className="py-16 sm:py-24 scroll-mt-20"
          aria-labelledby="organizations-title"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <FontAwesomeIcon icon={faBuilding} className="text-2xl text-gray-700" />
              </div>
              <h2
                id="organizations-title"
                className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2"
              >
                {t('home:paths.org.title')}
              </h2>
              <p className="text-lg text-gray-500 font-medium mb-4">
                {t('home:paths.org.subtitle')}
              </p>
              <p className="text-gray-600 max-w-2xl mx-auto">{t('home:paths.org.description')}</p>
            </div>

            {/* Two sub-cards: Hubs and Groups — differentiated */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="border-l-4 border-l-blue-400 pl-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={faBuildingColumns} className="text-blue-400" />
                  {t('home:paths.org.forHubs.title')}
                </h3>
                <ul className="space-y-3">
                  {(t('home:paths.org.forHubs.items', { returnObjects: true }) as string[]).map(
                    (item, i) => (
                      <li key={i} className="text-gray-600 flex gap-2 text-sm">
                        <span className="text-blue-400 flex-shrink-0" aria-hidden="true">
                          <FontAwesomeIcon icon={faArrowRight} />
                        </span>
                        {item}
                      </li>
                    )
                  )}
                </ul>
              </div>

              <div className="border-l-4 border-l-emerald-400 pl-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={faUsers} className="text-emerald-500" />
                  {t('home:paths.org.forGroups.title')}
                </h3>
                <ul className="space-y-3">
                  {(t('home:paths.org.forGroups.items', { returnObjects: true }) as string[]).map(
                    (item, i) => (
                      <li key={i} className="text-gray-600 flex gap-2 text-sm">
                        <span className="text-emerald-500 flex-shrink-0" aria-hidden="true">
                          <FontAwesomeIcon icon={faArrowRight} />
                        </span>
                        {item}
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>

            {/* How it works — Vertical Timeline */}
            <div className="mb-12">
              <h3 className="text-xl font-semibold text-gray-900 text-center mb-8">
                {t('home:paths.org.howItWorks.title')}
              </h3>
              <div className="max-w-2xl mx-auto">
                {[1, 2, 3].map((step, idx) => (
                  <div key={step} className="flex gap-6 pb-10 last:pb-0 relative">
                    {/* Timeline line */}
                    {idx < 2 && (
                      <div
                        className="absolute left-5 top-12 bottom-0 w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    )}
                    {/* Circle */}
                    <div className="w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold shadow-md shadow-gray-400 relative z-10">
                      {step}
                    </div>
                    {/* Content */}
                    <div className="pt-1">
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">
                        {t(`home:paths.org.howItWorks.step${step}.title`)}
                      </h4>
                      <p className="text-gray-600">
                        {t(`home:paths.org.howItWorks.step${step}.description`)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA — scroll to contact */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => scrollToSection('contact')}
                className="inline-flex items-center justify-center px-8 py-4 min-h-[52px] bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors text-lg"
              >
                {t('home:contact.title')}
              </button>
            </div>
          </div>
        </section>

        {/* Safety by Design — Dark Section */}
        <section
          id="safety"
          className="py-20 sm:py-28 bg-gray-900 text-white scroll-mt-20"
          aria-labelledby="safety-title"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FontAwesomeIcon icon={faShieldHalved} className="text-3xl text-blue-400" />
              </div>
              <h2 id="safety-title" className="text-2xl sm:text-3xl font-bold mb-2">
                {t('home:safety.title')}
              </h2>
              <p className="text-gray-400">{t('home:safety.subtitle')}</p>
            </div>

            {/* Two columns: individuals and orgs */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div>
                <h3 className="font-semibold text-blue-400 mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={faEyeSlash} />
                  {t('home:safety.forIndividuals.title')}
                </h3>
                <ul className="space-y-2">
                  {(t('home:safety.forIndividuals.items', { returnObjects: true }) as string[]).map(
                    (item, i) => (
                      <li key={i} className="text-gray-300 flex gap-2 text-sm">
                        <span className="text-blue-400 flex-shrink-0" aria-hidden="true">
                          <FontAwesomeIcon icon={faCheck} />
                        </span>
                        {item}
                      </li>
                    )
                  )}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-green-400 mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={faLock} />
                  {t('home:safety.forOrgs.title')}
                </h3>
                <ul className="space-y-2">
                  {(t('home:safety.forOrgs.items', { returnObjects: true }) as string[]).map(
                    (item, i) => (
                      <li key={i} className="text-gray-300 flex gap-2 text-sm">
                        <span className="text-green-400 flex-shrink-0" aria-hidden="true">
                          <FontAwesomeIcon icon={faCheck} />
                        </span>
                        {item}
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-700 max-w-3xl mx-auto my-12" aria-hidden="true" />

            {/* Tips for organizers */}
            <div>
              <h3 className="text-lg font-semibold text-gray-200 text-center mb-6">
                {t('home:safety.tips.title')}
              </h3>
              <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {(
                  t('home:safety.tips.items', { returnObjects: true }) as Array<{
                    title: string;
                    description: string;
                  }>
                ).map((tip, i) => (
                  <div key={i}>
                    <h4 className="font-semibold text-gray-100 mb-2 flex items-center gap-2">
                      <FontAwesomeIcon icon={faLightbulb} className="text-yellow-400 text-sm" />
                      {tip.title}
                    </h4>
                    <p className="text-gray-400 text-sm">{tip.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* What This Is / What This Is Not */}
        <section className="py-12 sm:py-16 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid md:grid-cols-2 gap-8">
              {/* What Is — green accent */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <span
                    className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <FontAwesomeIcon icon={faCheck} className="text-sm" />
                  </span>
                  {t('home:whatIs.title')}
                </h2>
                <ul className="space-y-3">
                  {(t('home:whatIs.items', { returnObjects: true }) as string[]).map((item, i) => (
                    <li key={i} className="text-gray-600 flex gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0 mt-2"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* What Is Not — neutral */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <span
                    className="w-8 h-8 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <FontAwesomeIcon icon={faXmark} className="text-sm" />
                  </span>
                  {t('home:whatIsNot.title')}
                </h2>
                <ul className="space-y-3">
                  {(t('home:whatIsNot.items', { returnObjects: true }) as string[]).map(
                    (item, i) => (
                      <li key={i} className="text-gray-600 flex gap-2">
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0 mt-2"
                          aria-hidden="true"
                        />
                        {item}
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Gradient separator */}
        <div
          className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"
          aria-hidden="true"
        />

        {/* Pilot Status */}
        <section
          id="pilot"
          className="py-12 sm:py-16 bg-yellow-50/50 scroll-mt-20"
          aria-labelledby="pilot-title"
        >
          <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium mb-4">
              {t('home:pilot.badge')}
            </span>
            <h2 id="pilot-title" className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              {t('home:pilot.title')}
            </h2>
            <p className="text-gray-600 mb-8">{t('home:pilot.description')}</p>

            <ul className="inline-block text-left space-y-2 mb-8">
              {(t('home:pilot.details', { returnObjects: true }) as string[]).map((detail, i) => (
                <li key={i} className="text-gray-600 flex gap-2">
                  <span className="text-gray-500 flex-shrink-0" aria-hidden="true">
                    <FontAwesomeIcon icon={faArrowRight} />
                  </span>
                  {detail}
                </li>
              ))}
            </ul>

            <div>
              <button
                type="button"
                onClick={() => scrollToSection('contact')}
                className="inline-flex items-center justify-center px-6 py-3 min-h-[44px] bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                {t('home:pilot.cta')}
              </button>
            </div>
          </div>
        </section>

        {/* Contact Form */}
        <section
          id="contact"
          className="py-16 sm:py-20 scroll-mt-20"
          aria-labelledby="contact-title"
        >
          <div className="max-w-xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FontAwesomeIcon icon={faEnvelope} className="text-xl text-blue-600" />
              </div>
              <h2 id="contact-title" className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {t('home:contact.title')}
              </h2>
              <p className="text-gray-600">{t('home:contact.description')}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 sm:p-8">
              <form onSubmit={handleContactSubmit} className="space-y-4">
                {contactStatus === 'success' && (
                  <Alert type="success">{t('home:contact.success')}</Alert>
                )}
                {contactStatus === 'error' && <Alert type="error">{t('home:contact.error')}</Alert>}

                <Input
                  label={t('home:contact.emailLabel')}
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder={t('home:contact.emailPlaceholder')}
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('home:contact.messageLabel')}
                  </label>
                  <textarea
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder={t('home:contact.messagePlaceholder')}
                    rows={4}
                    required
                    className="w-full px-4 py-3 min-h-[120px] rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                >
                  {t('home:contact.submit')}
                </Button>
              </form>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <img src="/logo.png" alt={t('common:appName')} className="h-5" />
              <span aria-hidden="true">—</span>
              <span>{t('home:footer.tagline')}</span>
            </div>
            <div className="flex items-center gap-4 text-gray-500">
              <span className="text-gray-400">{t('home:footer.privacy')}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" aria-hidden="true" />
              <span>
                {t('home:footer.builtBy')}{' '}
                <a
                  href="https://mythicworks.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-900"
                >
                  {t('home:footer.builtByName')}
                </a>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
