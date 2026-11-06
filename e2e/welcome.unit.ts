import assert from 'node:assert/strict';
import vm from 'node:vm';
import { describe, it } from 'node:test';
import {
  interpretWelcome,
  pickApprovedVariant,
  resolveWelcome,
  shouldHoldWelcomePaint,
  welcomePaintSource,
  type WelcomeCopy,
} from '../src/lib/welcome';

const defaults: WelcomeCopy = {
  eyebrow: 'ROCHESTER • BUFFALO • SYRACUSE',
  headline: 'Home accessibility experts you can trust.',
  subhead: 'Locally owned and operated.',
  cta: 'Schedule Your Free Consultation',
  ctaHref: '/contact',
};

const approved = {
  id: '44444444-4444-4444-8444-444444444444',
  status: 'approved',
  slot: 'hero',
  segment: 'spring-stairs',
  copy: {
    eyebrow: 'Freedom Mobility LLC',
    headline: 'Stairs getting hard at home?',
    subhead: 'Free in-home visits in Rochester, Buffalo, and Syracuse.',
    cta: 'Schedule a visit',
    cta_href: '/contact',
  },
};

describe('welcome decisions', () => {
  it('shows only an approved allowlisted variant and keeps LLC copy', () => {
    const picked = pickApprovedVariant([
      { ...approved, status: 'draft', id: '11111111-1111-4111-8111-111111111111' },
      { ...approved, copy: { ...approved.copy, cta_href: 'https://evil.example' }, id: '22222222-2222-4222-8222-222222222222' },
      { ...approved, copy: { ...approved.copy, headline: 'Email me at a@b.com' }, id: '33333333-3333-4333-8333-333333333333' },
      approved,
    ], 'spring-stairs');
    assert.equal(picked?.id, approved.id);
    assert.match(picked?.copy.eyebrow || '', /LLC/);
  });

  it('holdout keeps the authored headline and still asks for a metric', () => {
    const resolved = resolveWelcome({
      defaults,
      medium: 'email',
      campaign: 'spring-stairs',
      holdout: true,
      variants: [approved],
    });
    assert.equal(resolved.state, 'default');
    assert.equal(resolved.copy.headline, defaults.headline);
    assert.equal(resolved.variantId, 'default');
    assert.equal(resolved.rule, 'holdout');
    assert.equal(resolved.track, true);
  });

  it('does not track or swap copy when the server withholds personalization', () => {
    const decision = interpretWelcome({
      defaults,
      medium: 'outreach',
      campaign: 'spring-stairs',
      visit: { personalization: false },
      variants: { personalization: true, variants: [approved] },
      expired: false,
    });
    assert.equal(decision.applyCopy, false);
    assert.equal(decision.track, null);
    assert.equal(decision.copy.headline, defaults.headline);
  });

  it('does not treat a missing holdout flag as permission to personalize', () => {
    const decision = interpretWelcome({
      defaults,
      medium: 'email',
      campaign: 'spring-stairs',
      visit: { personalization: true, profile: {} },
      variants: { personalization: true, variants: [approved] },
      expired: false,
    });
    assert.equal(decision.applyCopy, false);
    assert.equal(decision.track, null);
  });

  it('applies approved copy and emits a metric without the campaign key', () => {
    const decision = interpretWelcome({
      defaults,
      medium: 'followup',
      campaign: 'spring-stairs',
      visit: { personalization: true, profile: { holdout: false } },
      variants: { personalization: true, variants: [approved] },
      expired: false,
    });
    assert.equal(decision.applyCopy, true);
    assert.equal(decision.copy.headline, 'Stairs getting hard at home?');
    assert.deepEqual(decision.track, {
      slot: 'hero',
      variant_id: approved.id,
      rule: 'followup',
      holdout: 'false',
    });
    assert.equal(JSON.stringify(decision.track).includes('spring-stairs'), false);
  });

  it('ignores a late variant after the paint timeout', () => {
    const decision = interpretWelcome({
      defaults,
      medium: 'email',
      campaign: 'spring-stairs',
      visit: { personalization: true, profile: { holdout: false } },
      variants: { personalization: true, variants: [approved] },
      expired: true,
    });
    assert.equal(decision.applyCopy, false);
    assert.equal(decision.track, null);
  });

  it('holds paint only for an eligible homepage campaign', () => {
    assert.equal(shouldHoldWelcomePaint({
      pathname: '/',
      search: '?utm_medium=email&fm_c=spring-stairs',
      optout: false,
      doNotTrack: null,
      globalPrivacyControl: false,
    }), true);
    assert.equal(shouldHoldWelcomePaint({
      pathname: '/contact',
      search: '?utm_medium=email&fm_c=spring-stairs',
      optout: false,
      doNotTrack: null,
      globalPrivacyControl: false,
    }), false);
    assert.equal(shouldHoldWelcomePaint({
      pathname: '/',
      search: '?utm_medium=email&rh_c=spring-stairs',
      optout: true,
      doNotTrack: null,
      globalPrivacyControl: false,
    }), false);
    assert.equal(shouldHoldWelcomePaint({
      pathname: '/',
      search: '?utm_medium=cpc&utm_campaign=spring-stairs',
      optout: false,
      doNotTrack: '1',
      globalPrivacyControl: false,
    }), false);
  });

  it('paint script reveals the headline if recognition stalls', () => {
    const classes = new Set<string>();
    let stored: string | null = null;
    const timers: Array<() => void> = [];
    const sandbox = {
      URLSearchParams,
      location: { pathname: '/', search: '?utm_medium=outreach&fm_c=spring-stairs' },
      localStorage: {
        getItem: () => stored,
        setItem: (_key: string, value: string) => { stored = value; },
      },
      navigator: { doNotTrack: null, globalPrivacyControl: false },
      document: {
        documentElement: {
          classList: {
            add: (name: string) => { classes.add(name); },
            remove: (name: string) => { classes.delete(name); },
          },
        },
      },
      window: {},
      setTimeout: (fn: () => void) => { timers.push(fn); return 1; },
    };
    vm.runInContext(welcomePaintSource(), vm.createContext(sandbox));
    assert.equal(classes.has('fm-welcome-pending'), true);
    timers[0]();
    assert.equal(classes.has('fm-welcome-pending'), false);
    assert.equal((sandbox.window as { __fmWelcomeExpired?: boolean }).__fmWelcomeExpired, true);
  });
});
