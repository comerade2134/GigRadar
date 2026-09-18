import { describe, it, expect } from 'vitest'
import { TRANSLATIONS } from './translations'
import { SUPPORTED_LOCALES, type SupportedLocale, type TranslationKey } from './types'
import { t } from './index'

describe('i18n localization system', () => {
  const enKeys = Object.keys(TRANSLATIONS.en) as TranslationKey[]

  it('contains metadata for all 8 supported locales', () => {
    expect(SUPPORTED_LOCALES.length).toBe(8)
    const codes = SUPPORTED_LOCALES.map((l) => l.code)
    expect(codes).toContain('en')
    expect(codes).toContain('es')
    expect(codes).toContain('de')
    expect(codes).toContain('pt')
    expect(codes).toContain('fr')
    expect(codes).toContain('ru')
    expect(codes).toContain('ur')
    expect(codes).toContain('hi')
  })

  it('guarantees 100% key parity across all supported languages', () => {
    const locales: SupportedLocale[] = ['en', 'es', 'de', 'pt', 'fr', 'ru', 'ur', 'hi']

    for (const locale of locales) {
      const dict = TRANSLATIONS[locale]
      expect(dict, `Dictionary for ${locale} should exist`).toBeDefined()
      for (const key of enKeys) {
        expect(dict[key], `Locale ${locale} missing key "${key}"`).toBeDefined()
        expect(typeof dict[key]).toBe('string')
        expect(dict[key].trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('falls back to default english when given unknown locale', () => {
    const text = t('connects_protected', 'unknown' as any)
    expect(text).toBe('Connects Protected')
  })

  it('correctly translates keys into target languages', () => {
    expect(t('badge_high_intent', 'en')).toBe('HIGH INTENT')
    expect(t('badge_high_intent', 'es')).toBe('ALTA INTENCIÓN')
    expect(t('badge_high_intent', 'de')).toBe('HOHE ABSICHT')
    expect(t('badge_high_intent', 'pt')).toBe('ALTA INTENÇÃO')
    expect(t('badge_high_intent', 'fr')).toBe('FORTE INTENTION')
  })
})
