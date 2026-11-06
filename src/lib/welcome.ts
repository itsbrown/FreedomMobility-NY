/**
 * Welcome Loop decisions for Freedom Mobility NY.
 *
 * Adapted from the live Rochester HealthTech client (the GitHub repo was not
 * readable). Personalized copy is applied only for an approved hero variant
 * that passes the Freedom allowlists. Holdout and any failed check keep the
 * authored headline. Nothing here sends email or other outreach.
 */

export const WELCOME_STORAGE_KEY = 'fm_welcome';
export const WELCOME_PENDING_CLASS = 'fm-welcome-pending';
export const WELCOME_COOKIE = 'fm_vid';
export const WELCOME_PAINT_MS = 2500;

export const WELCOME_MEDIUMS = ['email', 'outreach', 'followup'] as const;
export const WELCOME_CTA_HREFS = [
  '/contact',
  '/stairs-where-to-start',
  '/stairlifts',
  '/ramps',
  '/vertical-platform-lifts',
  '/resources',
] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

export interface WelcomeCopy {
  eyebrow: string;
  headline: string;
  subhead: string;
  cta: string;
  ctaHref: string;
}

export interface WelcomeVariant {
  id: string;
  status: string;
  slot: string;
  segment: string;
  copy: {
    eyebrow?: string;
    headline?: string;
    subhead?: string;
    cta?: string;
    cta_href?: string;
  };
}

export interface WelcomeResolution {
  copy: WelcomeCopy;
  variantId: string;
  holdout: boolean;
  rule: string;
  track: boolean;
  state: 'off' | 'default' | 'variant';
}

export function welcomePathAllowed(pathname: string): boolean {
  const path = String(pathname || '/');
  const trimmed = path.length > 1 ? path.replace(/\/+$/, '') : path || '/';
  return trimmed === '' || trimmed === '/' || trimmed === '/index.html';
}

export function campaignSlug(value: string | null | undefined): string {
  const token = String(value || '').trim();
  if (!/^[A-Za-z0-9._~+-]{1,80}$/.test(token) || token.indexOf('@') !== -1) return '';
  if (/^preview-/i.test(token)) return '';
  const slug = token.toLowerCase();
  return SLUG.test(slug) ? slug : '';
}

export function parseWelcomeQuery(search: string): { medium: string; campaign: string } {
  const params = new URLSearchParams(search || '');
  const medium = (params.get('utm_medium') || '').trim().toLowerCase();
  const campaign = campaignSlug(params.get('fm_c')) || campaignSlug(params.get('rh_c')) || campaignSlug(params.get('utm_campaign'));
  return { medium, campaign };
}

export function mediumAllowed(medium: string): boolean {
  return (WELCOME_MEDIUMS as readonly string[]).indexOf(medium) !== -1;
}

export function privacyBlocksWelcome(doNotTrack: string | null | undefined, globalPrivacyControl: boolean): boolean {
  return doNotTrack === '1' || doNotTrack === 'yes' || globalPrivacyControl === true;
}

export function hasWelcomeOptOut(search: string, stored: string | null): boolean {
  const params = new URLSearchParams(search || '');
  if (params.get('fm_optout') === '1' || params.get('rh_optout') === '1') return true;
  return stored === 'optout';
}

/** Self-contained so the head paint script can inline it. */
export function shouldHoldWelcomePaint(input: {
  pathname: string;
  search: string;
  optout: boolean;
  doNotTrack: string | null;
  globalPrivacyControl: boolean;
}): boolean {
  const path = String(input.pathname || '/');
  const trimmed = path.length > 1 ? path.replace(/\/+$/, '') : path || '/';
  if (!(trimmed === '' || trimmed === '/' || trimmed === '/index.html')) return false;
  if (input.optout) return false;
  if (input.doNotTrack === '1' || input.doNotTrack === 'yes' || input.globalPrivacyControl === true) return false;
  const params = new URLSearchParams(input.search || '');
  const medium = (params.get('utm_medium') || '').trim().toLowerCase();
  if (medium !== 'email' && medium !== 'outreach' && medium !== 'followup') return false;
  const raw = (params.get('fm_c') || params.get('rh_c') || params.get('utm_campaign') || '').trim();
  if (!/^[A-Za-z0-9._~+-]{1,80}$/.test(raw) || raw.indexOf('@') !== -1 || /^preview-/i.test(raw)) return false;
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(raw.toLowerCase());
}

function cleanCopyText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  if (!text || text.length > max) return '';
  if (/[<>]|@|mailto:|javascript:|data:|https?:\/\//i.test(text)) return '';
  if (/[\u0000-\u001F\u007F]/.test(text)) return '';
  return text;
}

export function pickApprovedVariant(variants: unknown, campaign: string): WelcomeVariant | null {
  if (!SLUG.test(campaign) || !Array.isArray(variants)) return null;
  for (const candidate of variants) {
    if (!candidate || typeof candidate !== 'object') continue;
    const variant = candidate as WelcomeVariant;
    if (variant.status !== 'approved' || variant.slot !== 'hero' || variant.segment !== campaign) continue;
    if (typeof variant.id !== 'string' || !UUID.test(variant.id)) continue;
    const href = variant.copy?.cta_href || '';
    if ((WELCOME_CTA_HREFS as readonly string[]).indexOf(href) === -1) continue;
    const eyebrow = cleanCopyText(variant.copy?.eyebrow, 80);
    const headline = cleanCopyText(variant.copy?.headline, 140);
    const subhead = cleanCopyText(variant.copy?.subhead, 320);
    const cta = cleanCopyText(variant.copy?.cta, 48);
    if (!eyebrow || !headline || !subhead || !cta) continue;
    return {
      id: variant.id.toLowerCase(),
      status: 'approved',
      slot: 'hero',
      segment: campaign,
      copy: { eyebrow, headline, subhead, cta, cta_href: href },
    };
  }
  return null;
}

export function resolveWelcome(input: {
  defaults: WelcomeCopy;
  medium: string;
  campaign: string;
  holdout: boolean;
  variants: unknown;
}): WelcomeResolution {
  const defaults = input.defaults;
  const idle: WelcomeResolution = {
    copy: defaults,
    variantId: 'default',
    holdout: false,
    rule: 'default',
    track: false,
    state: 'default',
  };
  const medium = input.medium.trim().toLowerCase();
  const campaign = campaignSlug(input.campaign);
  if (!mediumAllowed(medium) || !campaign) return idle;
  const approved = pickApprovedVariant(input.variants, campaign);
  if (approved && input.holdout !== true) {
    return {
      copy: {
        eyebrow: approved.copy.eyebrow || '',
        headline: approved.copy.headline || '',
        subhead: approved.copy.subhead || '',
        cta: approved.copy.cta || '',
        ctaHref: approved.copy.cta_href || defaults.ctaHref,
      },
      variantId: approved.id,
      holdout: false,
      rule: medium === 'email' ? 'email_campaign' : medium === 'outreach' ? 'outreach' : 'followup',
      track: true,
      state: 'variant',
    };
  }
  return {
    copy: defaults,
    variantId: 'default',
    holdout: input.holdout === true,
    rule: input.holdout === true ? 'holdout' : 'default',
    track: true,
    state: 'default',
  };
}

export interface WelcomePayload {
  personalization?: unknown;
  profile?: { holdout?: unknown };
  variants?: unknown;
}

export function interpretWelcome(input: {
  defaults: WelcomeCopy;
  medium: string;
  campaign: string;
  visit: WelcomePayload | null;
  variants: WelcomePayload | null;
  expired: boolean;
}): {
  applyCopy: boolean;
  copy: WelcomeCopy;
  state: 'default' | 'variant' | 'off';
  track: { slot: string; variant_id: string; rule: string; holdout: string } | null;
} {
  const keep = {
    applyCopy: false,
    copy: input.defaults,
    state: 'default' as const,
    track: null,
  };
  if (input.expired) return keep;
  const visit = input.visit;
  if (!visit || visit.personalization !== true || !visit.profile || typeof visit.profile.holdout !== 'boolean') {
    return keep;
  }
  const variants = input.variants;
  if (!variants || variants.personalization !== true) return keep;
  const resolved = resolveWelcome({
    defaults: input.defaults,
    medium: input.medium,
    campaign: input.campaign,
    holdout: visit.profile.holdout,
    variants: variants.variants,
  });
  return {
    applyCopy: resolved.state === 'variant',
    copy: resolved.state === 'variant' ? resolved.copy : input.defaults,
    state: resolved.state === 'variant' ? 'variant' : 'default',
    track: resolved.track
      ? {
          slot: 'hero',
          variant_id: resolved.variantId,
          rule: resolved.rule,
          holdout: resolved.holdout ? 'true' : 'false',
        }
      : null,
  };
}

export function welcomePaintSource(): string {
  return (
    shouldHoldWelcomePaint.toString() +
    `
(function () {
  try {
    var params = new URLSearchParams(location.search);
    var stored = '';
    try { stored = localStorage.getItem('fm_welcome') || ''; } catch (e) { stored = 'optout'; }
    var optout = params.get('fm_optout') === '1' || params.get('rh_optout') === '1' || stored === 'optout';
    var dnt = navigator.doNotTrack;
    if (!shouldHoldWelcomePaint({
      pathname: location.pathname,
      search: location.search,
      optout: optout,
      doNotTrack: dnt == null ? null : String(dnt),
      globalPrivacyControl: navigator.globalPrivacyControl === true
    })) return;
    document.documentElement.classList.add('fm-welcome-pending');
    setTimeout(function () {
      if (window.__fmWelcomeSettled) return;
      window.__fmWelcomeExpired = true;
      document.documentElement.classList.remove('fm-welcome-pending');
    }, 2500);
  } catch (e) {}
})();
`
  );
}
