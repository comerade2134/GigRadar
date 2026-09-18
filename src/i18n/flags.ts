import type { SupportedLocale } from './types'

export const FLAG_SVGS: Record<SupportedLocale, string> = {
  en: `
    <svg viewBox="0 0 60 40" class="h-4 w-6 flex-none overflow-hidden rounded-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.5)] border border-white/10" aria-hidden="true">
      <clipPath id="uk-clip"><rect width="60" height="40" rx="3"/></clipPath>
      <g clip-path="url(#uk-clip)">
        <path fill="#012169" d="M0 0h60v40H0z"/>
        <path stroke="#fff" stroke-width="6" d="M0 0l60 40M60 0L0 40"/>
        <path stroke="#C8102E" stroke-width="3.5" d="M0 0l60 40M60 0L0 40"/>
        <path stroke="#fff" stroke-width="10" d="M30 0v40M0 20h60"/>
        <path stroke="#C8102E" stroke-width="6" d="M30 0v40M0 20h60"/>
      </g>
    </svg>`,

  es: `
    <svg viewBox="0 0 60 40" class="h-4 w-6 flex-none overflow-hidden rounded-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.5)] border border-white/10" aria-hidden="true">
      <rect width="60" height="40" fill="#AA151B"/>
      <rect y="10" width="60" height="20" fill="#F1BF00"/>
    </svg>`,

  de: `
    <svg viewBox="0 0 60 40" class="h-4 w-6 flex-none overflow-hidden rounded-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.5)] border border-white/10" aria-hidden="true">
      <rect width="60" height="13.33" fill="#111827"/>
      <rect y="13.33" width="60" height="13.34" fill="#DD0000"/>
      <rect y="26.67" width="60" height="13.33" fill="#FFCE00"/>
    </svg>`,

  pt: `
    <svg viewBox="0 0 60 40" class="h-4 w-6 flex-none overflow-hidden rounded-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.5)] border border-white/10" aria-hidden="true">
      <rect width="24" height="40" fill="#046A38"/>
      <rect x="24" width="36" height="40" fill="#DA291C"/>
      <circle cx="24" cy="20" r="7.5" fill="#FFC72C" stroke="#DA291C" stroke-width="1.5"/>
    </svg>`,

  fr: `
    <svg viewBox="0 0 60 40" class="h-4 w-6 flex-none overflow-hidden rounded-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.5)] border border-white/10" aria-hidden="true">
      <rect width="20" height="40" fill="#002395"/>
      <rect x="20" width="20" height="40" fill="#FFFFFF"/>
      <rect x="40" width="20" height="40" fill="#ED2939"/>
    </svg>`,

  ru: `
    <svg viewBox="0 0 60 40" class="h-4 w-6 flex-none overflow-hidden rounded-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.5)] border border-white/10" aria-hidden="true">
      <rect width="60" height="13.33" fill="#FFFFFF"/>
      <rect y="13.33" width="60" height="13.34" fill="#0039A6"/>
      <rect y="26.67" width="60" height="13.33" fill="#D52B1E"/>
    </svg>`,

  ur: `
    <svg viewBox="0 0 60 40" class="h-4 w-6 flex-none overflow-hidden rounded-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.5)] border border-white/10" aria-hidden="true">
      <rect width="60" height="40" fill="#01411C"/>
      <rect width="15" height="40" fill="#FFFFFF"/>
      <circle cx="37" cy="20" r="8.5" fill="#FFFFFF"/>
      <circle cx="39" cy="18.5" r="7.5" fill="#01411C"/>
      <polygon points="41,15 42,17.5 45,17.5 43,19.5 44,22 41,20.5 38,22 39,19.5 37,17.5 40,17.5" fill="#FFFFFF"/>
    </svg>`,

  hi: `
    <svg viewBox="0 0 60 40" class="h-4 w-6 flex-none overflow-hidden rounded-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.5)] border border-white/10" aria-hidden="true">
      <rect width="60" height="13.33" fill="#FF9933"/>
      <rect y="13.33" width="60" height="13.34" fill="#FFFFFF"/>
      <rect y="26.67" width="60" height="13.33" fill="#138808"/>
      <circle cx="30" cy="20" r="4.5" fill="none" stroke="#000080" stroke-width="1.2"/>
      <circle cx="30" cy="20" r="1.5" fill="#000080"/>
    </svg>`
}

export function getFlagSvg(locale: SupportedLocale): string {
  return FLAG_SVGS[locale] || FLAG_SVGS.en
}
