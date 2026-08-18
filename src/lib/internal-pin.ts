export const INTERNAL_PIN_KEY = 'fm-tech-pay-unlocked';
export const INTERNAL_PIN_VALUE = 'fm-tech-pay-pin';

export function initInternalPin(pin: string): void {
  const pinGate = document.getElementById('pin-gate');
  if (!pinGate) return;

  if (!pin) {
    pinGate.classList.add('hidden');
    pinGate.classList.remove('flex');
    return;
  }

  if (sessionStorage.getItem(INTERNAL_PIN_KEY) === '1') return;

  pinGate.classList.remove('hidden');
  pinGate.classList.add('flex');

  const pinForm = document.getElementById('pin-form') as HTMLFormElement | null;
  const pinInput = document.getElementById('pin-input') as HTMLInputElement | null;
  const pinError = document.getElementById('pin-error');

  pinForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (pinInput?.value === pin) {
      sessionStorage.setItem(INTERNAL_PIN_KEY, '1');
      sessionStorage.setItem(INTERNAL_PIN_VALUE, pinInput.value);
      pinGate.classList.add('hidden');
      pinGate.classList.remove('flex');
    } else if (pinError) {
      pinError.textContent = 'Incorrect PIN. Try again.';
      pinError.classList.remove('hidden');
    }
  });
}
