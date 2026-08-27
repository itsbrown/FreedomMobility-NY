import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  FORMSPREE_RECAPTCHA_ACTION,
  buildPayFormPayload,
  formatFormspreeError,
} from '../src/lib/tech-pay-client';

describe('pay form Formspree payload', () => {
  it('uses the Formspree recaptcha action that the contact form uses', () => {
    assert.equal(FORMSPREE_RECAPTCHA_ACTION, 'submit');
  });

  it('sends timesheet + recaptcha token and does not rely on _cc for delivery', () => {
    const payload = buildPayFormPayload({
      subject: 'Weekly Pay Form - Test Tech - Week Ending 2026-08-22',
      name: 'Test Tech',
      week: '2026-08-22',
      timesheet: 'Freedom Mobility NY — Weekly Pay Form\nSend to: freedommobilityllc@outlook.com',
      installationTotal: '175.00',
      mileageTotal: '0.00',
      grandTotal: '175.00',
      billableMiles: '0.0',
      recipient: 'freedommobilityllc@outlook.com',
      recaptchaToken: 'test-token',
    });

    assert.equal(payload['g-recaptcha-response'], 'test-token');
    assert.equal(payload._subject, 'Weekly Pay Form - Test Tech - Week Ending 2026-08-22');
    assert.equal(payload.subject, payload._subject);
    assert.equal(payload.intendedRecipient, 'freedommobilityllc@outlook.com');
    assert.equal(payload.source, 'Website - Tech Pay Form');
    assert.equal(payload._cc, undefined);
  });

  it('explains Formspree recaptcha rejections', () => {
    const message = formatFormspreeError({ error: 'Please complete the reCAPTCHA' }, 400);
    assert.match(message, /Please complete the reCAPTCHA/);
    assert.match(message, /freedommobilityny.com/);
  });
});
