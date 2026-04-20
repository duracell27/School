import countries from 'i18n-iso-countries';
import ukLocale from 'i18n-iso-countries/langs/uk.json';

countries.registerLocale(ukLocale);

function getFlagEmoji(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join('');
}

export interface Country {
  code: string;
  name: string;
  flag: string;
}

export const COUNTRIES: Country[] = Object.entries(
  countries.getNames('uk', { select: 'official' }),
)
  .map(([code, name]) => ({ code, name, flag: getFlagEmoji(code) }))
  .sort((a, b) => a.name.localeCompare(b.name, 'uk'));

export const DEFAULT_COUNTRY = 'UA';

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}
