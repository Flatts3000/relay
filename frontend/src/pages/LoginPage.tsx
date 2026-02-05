import { useState, type FormEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts';
import { requestMagicLink } from '../api/auth';
import { Button, Input, Alert, LanguageSwitcher } from '../components/ui';

export function LoginPage() {
  const { t } = useTranslation(['auth', 'common']);
  const { isAuthenticated, isLoading, login } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Handle token verification from URL
  if (token && !isVerifying) {
    setIsVerifying(true);
    login(token)
      .then(() => {
        // Will redirect via isAuthenticated
      })
      .catch((err) => {
        setError(err.message || t('auth:invalidToken'));
        setIsVerifying(false);
      });
  }

  if (isLoading || isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-2 text-gray-600">
            {isVerifying ? t('auth:verifyingLogin') : t('common:loading')}
          </p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      await requestMagicLink(email);
      setSuccess(t('auth:magicLinkSent'));
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common:somethingWentWrong'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('common:appName')}</h1>
          <p className="mt-2 text-gray-600">
            {t('auth:signInDescription')}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert type="error">{error}</Alert>}
            {success && <Alert type="success">{success}</Alert>}

            <Input
              label={t('auth:email')}
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth:emailPlaceholder')}
              autoComplete="email"
              required
            />

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              {t('auth:sendLoginLink')}
            </Button>
          </form>

          <p className="mt-4 text-sm text-gray-500 text-center">
            {t('auth:magicLinkDescription')}
          </p>
        </div>
      </div>
    </div>
  );
}
