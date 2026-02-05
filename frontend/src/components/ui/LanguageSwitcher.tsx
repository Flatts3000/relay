import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../i18n';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const currentLanguage =
    SUPPORTED_LANGUAGES.find((lang) => lang.code === i18n.language) || SUPPORTED_LANGUAGES[0];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <select
      value={currentLanguage.code}
      onChange={handleChange}
      className="px-3 py-2 min-h-[44px] text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      aria-label="Select language"
    >
      {SUPPORTED_LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.nativeName}
        </option>
      ))}
    </select>
  );
}
