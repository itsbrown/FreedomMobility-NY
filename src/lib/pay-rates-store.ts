import { getDefaultPayRates, parsePayRates, type PayRatesBundle } from '../data/pay-rates';
import { INTERNAL_PIN_VALUE } from './internal-pin';

export const RATES_STORAGE_KEY = 'fm-pay-rates';
export const RATES_API = '/api/pay-rates';

export type RatesSource = 'api' | 'local' | 'bundled';

export async function loadPayRates(fallback?: PayRatesBundle): Promise<{ rates: PayRatesBundle; source: RatesSource }> {
  const bundled = fallback ?? getDefaultPayRates();

  try {
    const res = await fetch(RATES_API, { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const parsed = parsePayRates(await res.json());
      if (parsed) {
        localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(parsed));
        return { rates: parsed, source: 'api' };
      }
    }
  } catch {
    // Local `astro dev` has no function — fall through.
  }

  try {
    const raw = localStorage.getItem(RATES_STORAGE_KEY);
    if (raw) {
      const parsed = parsePayRates(JSON.parse(raw));
      if (parsed) return { rates: parsed, source: 'local' };
    }
  } catch {
    // ignore bad cache
  }

  return { rates: bundled, source: 'bundled' };
}

export async function savePayRates(rates: PayRatesBundle): Promise<{ ok: boolean; shared: boolean; message: string }> {
  const parsed = parsePayRates(rates);
  if (!parsed) return { ok: false, shared: false, message: 'Rates look invalid. Check names and dollar amounts.' };

  localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(parsed));

  try {
    const res = await fetch(RATES_API, {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-fm-pin': sessionStorage.getItem(INTERNAL_PIN_VALUE) || '',
      },
      body: JSON.stringify(parsed),
    });
    if (res.ok) return { ok: true, shared: true, message: 'Rates saved for the whole shop. Techs will see them on the pay form.' };
    if (res.status === 401) return { ok: false, shared: false, message: 'PIN rejected. Unlock admin again and retry.' };
  } catch {
    // no API in local Astro
  }

  return {
    ok: true,
    shared: false,
    message: 'Saved on this device only. After deploy to Netlify, Save again to share rates with every technician.',
  };
}

export function clearLocalPayRates(): void {
  localStorage.removeItem(RATES_STORAGE_KEY);
}
