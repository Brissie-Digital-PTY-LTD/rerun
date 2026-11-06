import countries from 'i18n-iso-countries'
import english from 'i18n-iso-countries/langs/en.json'
import { getLocales } from 'expo-localization'
import { AsYouType, getCountries, getCountryCallingCode, getExampleNumber, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min'
import mobileExamples from 'libphonenumber-js/mobile/examples'

countries.registerLocale(english)

export type PhoneCountry = { code: CountryCode; name: string; callingCode: string; flag: string }

const FALLBACK_COUNTRY: CountryCode = 'US'

// Hermes has no Intl.DisplayNames, so the names come from a table rather than from the platform.
export const flagOf = (code: string) => String.fromCodePoint(...[...code.toUpperCase()].map(letter => 0x1f1e6 + letter.charCodeAt(0) - 65))

// Calling regions of their own that the ISO table does not list as countries.
const MISSING_NAMES: Partial<Record<CountryCode, string>> = { AC: 'Ascension Island', TA: 'Tristan da Cunha' }

export const PHONE_COUNTRIES: PhoneCountry[] = getCountries()
    .map(code => ({ code, name: countries.getName(code, 'en') ?? MISSING_NAMES[code] ?? code, callingCode: getCountryCallingCode(code), flag: flagOf(code) }))
    .sort((a, b) => a.name.localeCompare(b.name))

const KNOWN = new Set<string>(getCountries())

export const countryByCode = (code: CountryCode): PhoneCountry => PHONE_COUNTRIES.find(country => country.code === code) ?? PHONE_COUNTRIES[0]

export function deviceCountry(): CountryCode {
    const region = getLocales()[0]?.regionCode?.toUpperCase()
    return region && KNOWN.has(region) ? (region as CountryCode) : FALLBACK_COUNTRY
}

export const formatAsTyped = (input: string, country: CountryCode) => new AsYouType(country).input(input)

export const examplePlaceholder = (country: CountryCode) => getExampleNumber(country, mobileExamples)?.formatNational() ?? ''

// Possible, not valid: the hub has the last word, and a number a carrier added last month must not be
// stopped by the copy of the metadata this build carries.
export const isPossibleNumber = (input: string, country: CountryCode) => parsePhoneNumberFromString(input, country)?.isPossible() ?? false

export const internationalNumber = (input: string, country: CountryCode) => parsePhoneNumberFromString(input, country)?.formatInternational() ?? input

export function searchCountries(query: string): PhoneCountry[] {
    const needle = query.trim().toLowerCase().replace(/^\+/, '')
    if (!needle) return PHONE_COUNTRIES
    return PHONE_COUNTRIES.filter(country => country.name.toLowerCase().includes(needle) || country.callingCode.startsWith(needle) || country.code.toLowerCase() === needle)
}
