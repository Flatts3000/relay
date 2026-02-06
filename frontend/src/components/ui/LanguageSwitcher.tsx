import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGlobe } from '@fortawesome/free-solid-svg-icons';
import { SUPPORTED_LANGUAGES } from '../../i18n';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const currentLanguage =
    SUPPORTED_LANGUAGES.find((lang) => lang.code === i18n.language) || SUPPORTED_LANGUAGES[0];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="relative inline-flex items-center">
      <FontAwesomeIcon
        icon={faGlobe}
        className="absolute left-3 text-gray-400 pointer-events-none text-sm"
        aria-hidden="true"
      />
      <select
        value={currentLanguage.code}
        onChange={handleChange}
        className="appearance-none pl-8 pr-8 py-2 min-h-[44px] text-sm border border-gray-300 rounded-md bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[position:right_0.5rem_center] bg-no-repeat focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        aria-label="Select language"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
