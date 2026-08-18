import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getDefaultPayRates,
  parsePayRates,
  tasksByCategory,
} from '../src/data/pay-rates';

describe('parsePayRates', () => {
  it('accepts the built-in catalog', () => {
    const parsed = parsePayRates(getDefaultPayRates());
    assert.ok(parsed);
    assert.equal(parsed.recipient, 'brian.parmele@freedommobilityva.com');
    assert.equal(parsed.ratesDraft, true);
    assert.ok(parsed.installationTasks.length >= 8);
    assert.ok(parsed.mileageServiceItems.length >= 3);
  });

  it('rejects empty or malformed payloads', () => {
    assert.equal(parsePayRates(null), null);
    assert.equal(parsePayRates({}), null);
    assert.equal(parsePayRates({ installationTasks: [], mileageServiceItems: [], mileageConfig: { ratePerMile: 1, qualifyMilesOneWay: 1 } }), null);
  });

  it('drops invalid tasks and keeps valid ones', () => {
    const parsed = parsePayRates({
      ...getDefaultPayRates(),
      installationTasks: [
        { id: 'ok', category: 'Stairlifts', name: 'Valid', rate: 10 },
        { id: 'bad', category: 'Stairlifts', name: '', rate: 10 },
        { id: 'zero', category: 'Ramps', name: 'Free', rate: 0 },
      ],
    });
    assert.ok(parsed);
    assert.deepEqual(parsed.installationTasks.map((t) => t.id), ['ok', 'zero']);
  });

  it('falls back to the VA inbox when recipient is blank', () => {
    const parsed = parsePayRates({ ...getDefaultPayRates(), recipient: 'not-an-email' });
    assert.ok(parsed);
    assert.equal(parsed.recipient, 'brian.parmele@freedommobilityva.com');
  });
});

describe('catalog helpers', () => {
  it('keeps unique task ids', () => {
    const rates = getDefaultPayRates();
    const ids = rates.installationTasks.map((t) => t.id);
    assert.equal(ids.length, new Set(ids).size);
  });

  it('groups installation tasks by category', () => {
    const groups = tasksByCategory();
    const names = groups.map(([name]) => name);
    assert.ok(names.includes('Stairlifts'));
    assert.ok(names.includes('Ramps'));
    assert.ok(names.includes('Vertical Platform Lifts'));
  });
});

describe('pay math', () => {
  it('computes install, mileage, and grand totals', () => {
    const rates = getDefaultPayRates();
    const straight = rates.installationTasks.find((t) => t.id === 'sl-straight');
    const service = rates.mileageServiceItems.find((t) => t.id === 'service-call');
    assert.ok(straight && service);

    const install = straight.rate * 2;
    const miles = 80;
    const mileage = miles * rates.mileageConfig.ratePerMile;
    const servicePay = service.rate * 1;
    const grand = install + mileage + servicePay;

    assert.equal(install, 350);
    assert.equal(Number(mileage.toFixed(2)), 53.6);
    assert.equal(servicePay, 65);
    assert.equal(Number(grand.toFixed(2)), 468.6);
  });

  it('treats one-way miles under the threshold as not billable', () => {
    const { qualifyMilesOneWay } = getDefaultPayRates().mileageConfig;
    const oneWay = 29.9;
    const qualifies = oneWay >= qualifyMilesOneWay;
    assert.equal(qualifies, false);
    assert.equal(30 >= qualifyMilesOneWay, true);
  });
});
