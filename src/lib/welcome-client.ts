import { pagePath, referrerHost, sanitizedCampaignSearch } from './analytics';
import {
  WELCOME_STORAGE_KEY,
  hasWelcomeOptOut,
  interpretWelcome,
  parseWelcomeQuery,
  privacyBlocksWelcome,
  welcomePathAllowed,
  type WelcomeCopy,
} from './welcome';

function readDefaults(root: ParentNode): WelcomeCopy | null {
  const eyebrow = root.querySelector('[data-welcome-eyebrow]');
  const headline = root.querySelector('[data-welcome-headline]');
  const subhead = root.querySelector('[data-welcome-subhead]');
  const cta = root.querySelector<HTMLAnchorElement>('[data-welcome-cta]');
  if (!eyebrow || !headline || !subhead || !cta) return null;
  return {
    eyebrow: (eyebrow.textContent || '').trim(),
    headline: (headline.textContent || '').replace(/\s+/g, ' ').trim(),
    subhead: (subhead.textContent || '').replace(/\s+/g, ' ').trim(),
    cta: (cta.textContent || '').trim(),
    ctaHref: cta.getAttribute('href') || '/contact',
  };
}

function applyCopy(copy: WelcomeCopy): void {
  const eyebrow = document.querySelector('[data-welcome-eyebrow]');
  const headline = document.querySelector('[data-welcome-headline]');
  const subhead = document.querySelector('[data-welcome-subhead]');
  const cta = document.querySelector<HTMLAnchorElement>('[data-welcome-cta]');
  if (eyebrow) eyebrow.textContent = copy.eyebrow;
  if (headline) headline.textContent = copy.headline;
  if (subhead) subhead.textContent = copy.subhead;
  if (cta) {
    cta.textContent = copy.cta;
    cta.setAttribute('href', copy.ctaHref);
  }
}

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  const type = response.headers.get('content-type') || '';
  if (!response.ok || type.indexOf('application/json') === -1) return null;
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function postOptOut(page: string): void {
  fetch('/api/visit.php', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ optout: true, page }),
    keepalive: true,
  }).catch(() => {});
}

export function persistWelcomeOptOut(): void {
  try {
    localStorage.setItem(WELCOME_STORAGE_KEY, 'optout');
  } catch {
    /* still tell the server to clear the cookie */
  }
  window.__fmWelcomeExpired = true;
  window.__fmWelcomeSettled = true;
  document.documentElement.classList.remove('fm-welcome-pending');
  const section = document.querySelector('[data-welcome-state]');
  if (section) section.setAttribute('data-welcome-state', 'off');
  postOptOut(pagePath(location.pathname));
}

export function bootWelcome(): void {
  const button = document.querySelector('[data-fm-welcome-optout]');
  button?.addEventListener('click', (event) => {
    event.preventDefault();
    persistWelcomeOptOut();
  });

  const stored = (() => {
    try {
      return localStorage.getItem(WELCOME_STORAGE_KEY);
    } catch {
      return 'optout';
    }
  })();
  const search = location.search;
  const page = pagePath(location.pathname);
  const onWelcomePath = welcomePathAllowed(location.pathname);
  if (hasWelcomeOptOut(search, null)) {
    persistWelcomeOptOut();
    return;
  }
  if (stored === 'optout') {
    if (onWelcomePath) postOptOut(page);
    return;
  }

  let doNotTrack: string | null = null;
  try {
    doNotTrack = navigator.doNotTrack;
  } catch {
    doNotTrack = '1';
  }
  const gpc = typeof navigator !== 'undefined' && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
  if (privacyBlocksWelcome(doNotTrack, gpc)) {
    if (onWelcomePath) postOptOut(page);
    return;
  }
  if (!onWelcomePath) return;

  const defaults = readDefaults(document);
  if (!defaults) return;
  const { medium, campaign } = parseWelcomeQuery(search);
  const section = document.querySelector('[data-welcome-state]');

  void (async () => {
    try {
      const visitResponse = await fetch('/api/visit.php' + sanitizedCampaignSearch(search), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          page: pagePath(location.pathname),
          referrer_host: referrerHost(document.referrer),
        }),
        keepalive: true,
      });
      const visit = await readJson(visitResponse);
      if (window.__fmWelcomeExpired) return;
      if (!visit || visit.personalization !== true) {
        section?.setAttribute('data-welcome-state', 'default');
        return;
      }
      const variantResponse = await fetch(
        '/api/variants.php?slot=hero&rh_c=' + encodeURIComponent(campaign),
        { credentials: 'same-origin', headers: { Accept: 'application/json' } },
      );
      const variants = await readJson(variantResponse);
      if (window.__fmWelcomeExpired) return;
      const decision = interpretWelcome({
        defaults,
        medium,
        campaign,
        visit: visit as { personalization?: unknown; profile?: { holdout?: unknown } },
        variants: variants as { personalization?: unknown; variants?: unknown } | null,
        expired: false,
      });
      if (decision.applyCopy) applyCopy(decision.copy);
      section?.setAttribute('data-welcome-state', decision.state);
      if (decision.track && typeof window.fmTrack === 'function') {
        window.fmTrack('personalization_view', decision.track);
      }
    } catch {
      section?.setAttribute('data-welcome-state', 'default');
    } finally {
      window.__fmWelcomeSettled = true;
      document.documentElement.classList.remove('fm-welcome-pending');
    }
  })();
}
