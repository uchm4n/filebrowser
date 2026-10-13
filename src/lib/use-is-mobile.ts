import { useMediaQuery } from '@vueuse/core'

/**
 * Tailwind's `md` breakpoint, stated once. Every responsive branch reads it
 * from here so the CSS and the JS can never disagree about where it falls.
 *
 * `.98px`, not `767px`: browser zoom makes `innerWidth` fractional, and a plain
 * 767 would leave a dead band just under 768px where neither this query nor
 * Tailwind's `min-width: 768px` matches — the sidebar would go `fixed` while
 * the JS still believed it was on desktop.
 */
export const MOBILE_QUERY = '(max-width: 767.98px)'

export function useIsMobile() {
  return useMediaQuery(MOBILE_QUERY)
}
