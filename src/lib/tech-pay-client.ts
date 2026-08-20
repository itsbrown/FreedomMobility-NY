import { tasksByCategory, type MileageConfig, type MileageServiceItem, type PayTask } from '../data/pay-rates';

export interface TechPayConfig {
  installationTasks: PayTask[];
  mileageServiceItems: MileageServiceItem[];
  mileageConfig: MileageConfig;
  technicians: string[];
  ratesDraft: boolean;
  formspreeEndpoint: string;
  recaptchaSiteKey: string;
  recipient: string;
}

interface Trip {
  id: string;
  homeAddress: string;
  jobAddress: string;
  tripType: 'install' | 'service';
  roundTrip: boolean;
  calculatedMiles: number;
  drivingTimeMinutes: number;
  qualifiesForPay: boolean;
  status: string;
}

interface PhotonFeature {
  properties?: {
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
  };
  geometry?: { coordinates?: [number, number] };
}

const HOME_KEY = 'fm-tech-pay-home';
const NAME_KEY = 'fm-tech-pay-name';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function defaultWeekEnding(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -1 : 6 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function formatDuration(minutes: number): string {
  if (!minutes) return '—';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`;
}

function formatPhotonAddress(feature: PhotonFeature): string {
  const p = feature.properties ?? {};
  const street = [p.housenumber, p.street || p.name].filter(Boolean).join(' ');
  const city = p.city || p.town || p.village || '';
  const state = p.state || '';
  const zip = p.postcode || '';
  const parts = [street, city, [state, zip].filter(Boolean).join(' ')].filter(Boolean);
  return parts.join(', ') || p.name || '';
}

function emptyTrip(home = ''): Trip {
  return {
    id: uid(),
    homeAddress: home,
    jobAddress: '',
    tripType: 'install',
    roundTrip: true,
    calculatedMiles: 0,
    drivingTimeMinutes: 0,
    qualifiesForPay: false,
    status: '',
  };
}

export function initTechPayForm(config: TechPayConfig): void {
  const root = document.getElementById('tech-pay-app');
  if (!root) return;

  const formEl = document.getElementById('pay-form') as HTMLFormElement | null;
  if (!formEl) return;

  const nameInput = document.getElementById('technician-name') as HTMLInputElement;
  const weekInput = document.getElementById('week-ending') as HTMLInputElement;
  const notesInput = document.getElementById('job-notes') as HTMLTextAreaElement;
  const tripsMount = document.getElementById('trips-list');
  const addTripBtn = document.getElementById('add-trip');
  const statusEl = document.getElementById('form-status');
  const submitBtn = document.getElementById('submit-pay') as HTMLButtonElement | null;
  const copyBtn = document.getElementById('copy-timesheet');
  const printBtn = document.getElementById('print-timesheet');

  if (weekInput && !weekInput.value) weekInput.value = defaultWeekEnding();
  if (nameInput) {
    const savedName = localStorage.getItem(NAME_KEY);
    if (savedName && !nameInput.value) nameInput.value = savedName;
    nameInput.addEventListener('change', () => {
      if (nameInput.value.trim()) localStorage.setItem(NAME_KEY, nameInput.value.trim());
    });
  }

  const savedHome = localStorage.getItem(HOME_KEY) || '';
  const trips: Trip[] = [emptyTrip(savedHome)];

  const qty: Record<string, number> = {};
  const serviceQty: Record<string, number> = {};

  function resetQuantities(): void {
    for (const key of Object.keys(qty)) delete qty[key];
    for (const key of Object.keys(serviceQty)) delete serviceQty[key];
    for (const task of config.installationTasks) qty[task.id] = 0;
    for (const item of config.mileageServiceItems) serviceQty[item.id] = 0;
  }

  function renderCatalog(): void {
    const installMount = document.getElementById('install-catalog');
    const serviceMount = document.getElementById('service-catalog');
    const draftBanner = document.getElementById('draft-rates-banner');
    const recipientEl = document.getElementById('pay-recipient');
    const mileageCopy = document.getElementById('mileage-rules');
    const namesList = document.getElementById('tech-names');

    if (draftBanner) draftBanner.classList.toggle('hidden', !config.ratesDraft);
    if (recipientEl) recipientEl.textContent = config.recipient;
    if (mileageCopy) {
      mileageCopy.textContent = `Driving miles from OSRM (real roads, not a straight-line guess). One-way trips of ${config.mileageConfig.qualifyMilesOneWay}+ miles are billable at ${money.format(config.mileageConfig.ratePerMile)}/mi.`;
    }
    if (namesList) {
      namesList.innerHTML = config.technicians.map((name) => `<option value="${escapeAttr(name)}"></option>`).join('');
    }

    if (installMount) {
      installMount.innerHTML = tasksByCategory(config.installationTasks).map(([category, tasks]) => `
        <div>
          <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2">${escapeHtml(category)}</h3>
          <div class="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
            ${tasks.map((task) => catalogRow(task.id, task.name, task.rate, 'task', 'each')).join('')}
          </div>
        </div>
      `).join('');
    }

    if (serviceMount) {
      serviceMount.innerHTML = `
        <div class="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
          ${config.mileageServiceItems.map((item) => catalogRow(item.id, item.name, item.rate, 'service', item.unit)).join('')}
        </div>
      `;
    }
  }

  function installTotal(): number {
    return config.installationTasks.reduce((sum, task) => sum + task.rate * (qty[task.id] || 0), 0);
  }

  function serviceTotal(): number {
    return config.mileageServiceItems.reduce((sum, item) => sum + item.rate * (serviceQty[item.id] || 0), 0);
  }

  function billableMiles(): number {
    return trips
      .filter((trip) => trip.qualifiesForPay)
      .reduce((sum, trip) => sum + (Number(trip.calculatedMiles) || 0), 0);
  }

  function mileagePay(): number {
    return billableMiles() * config.mileageConfig.ratePerMile;
  }

  function mileageTotal(): number {
    return mileagePay() + serviceTotal();
  }

  function grandTotal(): number {
    return installTotal() + mileageTotal();
  }

  function setQty(id: string, value: number, kind: 'task' | 'service'): void {
    const next = Math.max(0, Math.round(value * 10) / 10);
    if (kind === 'task') qty[id] = next;
    else serviceQty[id] = next;
    const input = document.querySelector<HTMLInputElement>(`[data-qty-kind="${kind}"][data-qty-id="${id}"]`);
    if (input) input.value = String(next);
    const line = document.querySelector(`[data-line-kind="${kind}"][data-line-id="${id}"]`);
    const rate = kind === 'task'
      ? config.installationTasks.find((task) => task.id === id)?.rate ?? 0
      : config.mileageServiceItems.find((item) => item.id === id)?.rate ?? 0;
    if (line) line.textContent = next > 0 ? money.format(rate * next) : '—';
    updateTotals();
  }

  function updateTotals(): void {
    const miles = billableMiles();
    const set = (id: string, value: string) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    set('total-install', money.format(installTotal()));
    set('total-mileage', money.format(mileageTotal()));
    set('total-grand', money.format(grandTotal()));
    set('billable-miles', miles.toFixed(1));
    set('mileage-pay', money.format(mileagePay()));
    const hidden = (name: string, value: string) => {
      const el = formEl!.querySelector<HTMLInputElement>(`input[name="${name}"]`);
      if (el) el.value = value;
    };
    hidden('installationTotal', installTotal().toFixed(2));
    hidden('mileageTotal', mileageTotal().toFixed(2));
    hidden('grandTotal', grandTotal().toFixed(2));
    hidden('billableMiles', miles.toFixed(1));
  }

  root.addEventListener('click', (event) => {
    const btn = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-step]');
    if (!btn || !root.contains(btn)) return;
    const id = btn.dataset.id;
    const kind = btn.dataset.kind as 'task' | 'service';
    if (!id || !kind) return;
    const current = kind === 'task' ? qty[id] || 0 : serviceQty[id] || 0;
    const delta = btn.dataset.step === 'inc' ? 1 : -1;
    setQty(id, current + delta, kind);
  });

  root.addEventListener('input', (event) => {
    const input = (event.target as HTMLElement).closest<HTMLInputElement>('[data-qty-id]');
    if (!input || !root.contains(input)) return;
    const kind = input.dataset.qtyKind as 'task' | 'service';
    const id = input.dataset.qtyId;
    if (!kind || !id) return;
    setQty(id, Number(input.value) || 0, kind);
  });

  function bindAutocomplete(input: HTMLInputElement, onPick: (label: string) => void): void {
    let box = input.parentElement?.querySelector<HTMLElement>('.suggest-box');
    if (!box) {
      box = document.createElement('ul');
      box.className = 'suggest-box absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-auto hidden';
      input.parentElement?.appendChild(box);
    }

    let timer: number | undefined;
    input.addEventListener('input', () => {
      const q = input.value.trim();
      onPick(input.value);
      window.clearTimeout(timer);
      if (q.length < 3) {
        box!.classList.add('hidden');
        return;
      }
      timer = window.setTimeout(async () => {
        try {
          const url = new URL('https://photon.komoot.io/api/');
          url.searchParams.set('q', q);
          url.searchParams.set('limit', '6');
          url.searchParams.set('lang', 'en');
          url.searchParams.set('lat', String(config.mileageConfig.biasLat));
          url.searchParams.set('lon', String(config.mileageConfig.biasLon));
          const res = await fetch(url.toString());
          const data = await res.json();
          const features: PhotonFeature[] = data.features || [];
          box!.innerHTML = '';
          features.forEach((feature) => {
            const label = formatPhotonAddress(feature);
            if (!label) return;
            const li = document.createElement('li');
            li.innerHTML = `<button type="button" class="w-full text-left px-3 py-2 text-sm hover:bg-sky-50">${label}</button>`;
            li.querySelector('button')?.addEventListener('click', () => {
              input.value = label;
              onPick(label);
              box!.classList.add('hidden');
            });
            box!.appendChild(li);
          });
          box!.classList.toggle('hidden', box!.childElementCount === 0);
        } catch {
          box!.classList.add('hidden');
        }
      }, 280);
    });

    document.addEventListener('click', (event) => {
      if (!input.parentElement?.contains(event.target as Node)) box!.classList.add('hidden');
    });
  }

  async function calculateTrip(trip: Trip): Promise<void> {
    trip.status = 'Calculating…';
    renderTrips();
    try {
      const [origin, dest] = await Promise.all([
        geocode(trip.homeAddress),
        geocode(trip.jobAddress),
      ]);
      if (!origin || !dest) {
        trip.status = 'Could not find one of the addresses. Enter miles manually.';
        renderTrips();
        return;
      }
      const route = await routeMiles(origin, dest);
      if (!route) {
        trip.status = 'Route lookup failed. Enter miles manually.';
        renderTrips();
        return;
      }
      const oneWay = route.miles;
      trip.calculatedMiles = trip.roundTrip ? Math.round(oneWay * 2 * 10) / 10 : oneWay;
      trip.drivingTimeMinutes = trip.roundTrip ? route.minutes * 2 : route.minutes;
      trip.qualifiesForPay = oneWay >= config.mileageConfig.qualifyMilesOneWay;
      trip.status = trip.qualifiesForPay
        ? `Driving distance · ${trip.qualifiesForPay ? 'qualifies' : ''}`
        : `Under ${config.mileageConfig.qualifyMilesOneWay} mi one-way — logged, not paid`;
      renderTrips();
    } catch {
      trip.status = 'Lookup failed. Enter miles manually.';
      renderTrips();
    }
  }

  async function geocode(address: string): Promise<{ lat: number; lon: number } | null> {
    const url = new URL('https://photon.komoot.io/api/');
    url.searchParams.set('q', address);
    url.searchParams.set('limit', '1');
    url.searchParams.set('lat', String(config.mileageConfig.biasLat));
    url.searchParams.set('lon', String(config.mileageConfig.biasLon));
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json();
    const coords = data.features?.[0]?.geometry?.coordinates;
    if (!coords) return null;
    return { lon: coords[0], lat: coords[1] };
  }

  async function routeMiles(
    origin: { lat: number; lon: number },
    dest: { lat: number; lon: number },
  ): Promise<{ miles: number; minutes: number } | null> {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${dest.lon},${dest.lat}?overview=false`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;
    return {
      miles: Math.round((route.distance / 1609.344) * 10) / 10,
      minutes: Math.round(route.duration / 60),
    };
  }

  function renderTrips(): void {
    if (!tripsMount) return;
    tripsMount.innerHTML = trips.map((trip, index) => `
      <article class="border border-slate-200 rounded-xl p-4 space-y-3 bg-white" data-trip="${trip.id}">
        <div class="flex items-center justify-between gap-3">
          <div class="text-sm font-semibold text-slate-800">Trip ${index + 1}</div>
          <button type="button" class="text-xs text-slate-500 hover:text-red-600" data-remove="${trip.id}">Remove</button>
        </div>
        <div class="grid sm:grid-cols-2 gap-3">
          <div class="relative">
            <label class="block text-sm font-medium mb-1.5 text-slate-700" for="home-${trip.id}">Home / shop address</label>
            <input id="home-${trip.id}" type="text" autocomplete="off" value="${escapeAttr(trip.homeAddress)}"
              class="w-full border border-slate-300 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-lg px-4 py-2.5 text-sm"
              placeholder="123 Main St, Rochester, NY" data-field="homeAddress" />
          </div>
          <div class="relative">
            <label class="block text-sm font-medium mb-1.5 text-slate-700" for="job-${trip.id}">Job address</label>
            <input id="job-${trip.id}" type="text" autocomplete="off" value="${escapeAttr(trip.jobAddress)}"
              class="w-full border border-slate-300 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-lg px-4 py-2.5 text-sm"
              placeholder="Customer address" data-field="jobAddress" />
          </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label class="block text-sm font-medium mb-1.5 text-slate-700" for="type-${trip.id}">Type</label>
            <select id="type-${trip.id}" data-field="tripType" class="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white">
              <option value="install" ${trip.tripType === 'install' ? 'selected' : ''}>Install</option>
              <option value="service" ${trip.tripType === 'service' ? 'selected' : ''}>Service</option>
            </select>
          </div>
          <label class="flex items-center gap-2 text-sm text-slate-700 pb-2.5">
            <input type="checkbox" data-field="roundTrip" ${trip.roundTrip ? 'checked' : ''} class="rounded border-slate-300" />
            Round trip
          </label>
          <div>
            <label class="block text-sm font-medium mb-1.5 text-slate-700" for="miles-${trip.id}">Miles</label>
            <input id="miles-${trip.id}" type="number" min="0" step="0.1" value="${trip.calculatedMiles || ''}"
              class="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm" data-field="calculatedMiles" />
          </div>
          <button type="button" data-calc="${trip.id}"
            class="border border-slate-300 hover:bg-slate-50 rounded-lg px-3 py-2.5 text-sm font-medium">
            Calculate
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-xs" data-trip-meta></div>
      </article>
    `).join('');

    function refreshTripQualification(trip: Trip): void {
      const oneWay = trip.roundTrip ? trip.calculatedMiles / 2 : trip.calculatedMiles;
      trip.qualifiesForPay = trip.calculatedMiles > 0 && oneWay >= config.mileageConfig.qualifyMilesOneWay;
    }

    function paintTripMeta(card: HTMLElement, trip: Trip): void {
      const meta = card.querySelector('[data-trip-meta]');
      if (!meta) return;
      const time = trip.drivingTimeMinutes ? formatDuration(trip.drivingTimeMinutes) : 'Drive time after calculate';
      const badge = trip.qualifiesForPay
        ? '<span class="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 font-medium">Billable</span>'
        : trip.calculatedMiles
          ? '<span class="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">Not billable</span>'
          : '';
      const status = trip.status ? `<span class="text-slate-500">${escapeHtml(trip.status)}</span>` : '';
      meta.innerHTML = `<span class="text-slate-500">${time}</span>${badge}${status}`;
    }

    tripsMount.querySelectorAll<HTMLElement>('[data-trip]').forEach((card) => {
      const trip = trips.find((item) => item.id === card.dataset.trip);
      if (!trip) return;
      paintTripMeta(card, trip);

      card.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-field]').forEach((field) => {
        const key = field.getAttribute('data-field') as keyof Trip;
        const apply = () => {
          if (key === 'roundTrip' && field instanceof HTMLInputElement) {
            trip.roundTrip = field.checked;
            refreshTripQualification(trip);
            paintTripMeta(card, trip);
            updateTotals();
          } else if (key === 'calculatedMiles') {
            trip.calculatedMiles = Number((field as HTMLInputElement).value) || 0;
            refreshTripQualification(trip);
            paintTripMeta(card, trip);
            updateTotals();
          } else if (key === 'tripType') {
            trip.tripType = (field as HTMLSelectElement).value as Trip['tripType'];
          } else if (key === 'homeAddress' || key === 'jobAddress') {
            trip[key] = (field as HTMLInputElement).value;
            if (key === 'homeAddress' && trip.homeAddress.trim()) {
              localStorage.setItem(HOME_KEY, trip.homeAddress.trim());
            }
          }
        };
        field.addEventListener('change', apply);
        field.addEventListener('input', apply);
      });

      const home = card.querySelector<HTMLInputElement>('[data-field="homeAddress"]');
      const job = card.querySelector<HTMLInputElement>('[data-field="jobAddress"]');
      if (home) bindAutocomplete(home, (label) => {
        trip.homeAddress = label;
        localStorage.setItem(HOME_KEY, label);
      });
      if (job) bindAutocomplete(job, (label) => { trip.jobAddress = label; });

      card.querySelector(`[data-calc="${trip.id}"]`)?.addEventListener('click', () => {
        void calculateTrip(trip);
      });
      card.querySelector(`[data-remove="${trip.id}"]`)?.addEventListener('click', () => {
        const idx = trips.findIndex((item) => item.id === trip.id);
        if (idx >= 0) trips.splice(idx, 1);
        if (trips.length === 0) trips.push(emptyTrip(localStorage.getItem(HOME_KEY) || ''));
        renderTrips();
        updateTotals();
      });
    });

    updateTotals();
  }

  addTripBtn?.addEventListener('click', () => {
    trips.push(emptyTrip(trips[0]?.homeAddress || localStorage.getItem(HOME_KEY) || ''));
    renderTrips();
  });

  function buildTimesheet(): string {
    const installLines = config.installationTasks
      .filter((task) => (qty[task.id] || 0) > 0)
      .map((task) => `  ${task.name}: ${qty[task.id]} × ${money.format(task.rate)} = ${money.format(task.rate * qty[task.id])}`);
    const serviceLines = config.mileageServiceItems
      .filter((item) => (serviceQty[item.id] || 0) > 0)
      .map((item) => `  ${item.name}: ${serviceQty[item.id]} × ${money.format(item.rate)} = ${money.format(item.rate * serviceQty[item.id])}`);
    const tripLines = trips
      .filter((trip) => trip.homeAddress || trip.jobAddress || trip.calculatedMiles)
      .map((trip, i) => {
        const flag = trip.qualifiesForPay ? 'billable' : 'not billable';
        return `  ${i + 1}. ${trip.tripType} · ${trip.roundTrip ? 'round trip' : 'one way'} · ${trip.calculatedMiles || 0} mi (${flag})\n     ${trip.homeAddress || '—'} → ${trip.jobAddress || '—'}`;
      });

    return [
      'Freedom Mobility NY — Weekly Pay Form',
      `Send to: ${config.recipient}`,
      '',
      `Technician: ${nameInput?.value.trim() || '—'}`,
      `Week ending: ${weekInput?.value || '—'}`,
      '',
      'INSTALLATION TASKS',
      installLines.length ? installLines.join('\n') : '  None',
      `Installation total: ${money.format(installTotal())}`,
      '',
      'TRIPS',
      tripLines.length ? tripLines.join('\n') : '  None',
      `Billable miles: ${billableMiles().toFixed(1)} × ${money.format(config.mileageConfig.ratePerMile)} = ${money.format(mileagePay())}`,
      '',
      'MILEAGE & SERVICE',
      serviceLines.length ? serviceLines.join('\n') : '  None',
      `Mileage / service total: ${money.format(mileageTotal())}`,
      '',
      'NOTES',
      notesInput?.value.trim() || '  None',
      '',
      `GRAND TOTAL: ${money.format(grandTotal())}`,
      config.ratesDraft ? '\n[DRAFT RATES — confirm before paying]' : '',
    ].join('\n');
  }

  function setStatus(message: string, kind: 'ok' | 'err' | 'info' = 'info'): void {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = kind === 'err'
      ? 'text-sm text-red-600'
      : kind === 'ok'
        ? 'text-sm text-emerald-700'
        : 'text-sm text-slate-600';
  }

  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(buildTimesheet());
      setStatus('Timesheet copied. You can paste it into an email.', 'ok');
    } catch {
      setStatus('Could not copy. Select and copy the summary after submit.', 'err');
    }
  });

  printBtn?.addEventListener('click', () => window.print());

  formEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = nameInput?.value.trim();
    const week = weekInput?.value;
    if (!name || !week) {
      setStatus('Technician name and week ending are required.', 'err');
      return;
    }
    if (grandTotal() <= 0 && !notesInput?.value.trim()) {
      setStatus('Add at least one task, trip, or a note before submitting.', 'err');
      return;
    }

    const timesheet = buildTimesheet();
    const subject = `Weekly Pay Form - ${name} - Week Ending ${week}`;
    const messageField = formEl.querySelector<HTMLInputElement>('input[name="message"]');
    const subjectField = formEl.querySelector<HTMLInputElement>('input[name="_subject"]');
    if (messageField) messageField.value = timesheet;
    if (subjectField) subjectField.value = subject;

    if (!config.formspreeEndpoint || config.formspreeEndpoint.includes('your-form-id')) {
      try {
        await navigator.clipboard.writeText(timesheet);
        setStatus(`Form email is not configured. Timesheet copied — paste it to ${config.recipient}.`, 'err');
      } catch {
        setStatus(`Form email is not configured. Copy the timesheet and send it to ${config.recipient}.`, 'err');
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting…';
    }
    setStatus('Sending timesheet…');

    try {
      const recaptchaToken = await getRecaptchaToken(config.recaptchaSiteKey);
      if (config.recaptchaSiteKey && !recaptchaToken) {
        throw new Error('reCAPTCHA validation failed. Refresh and try again.');
      }

      const res = await fetch(config.formspreeEndpoint, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayFormPayload({
          subject,
          name,
          week,
          timesheet,
          installationTotal: installTotal().toFixed(2),
          mileageTotal: mileageTotal().toFixed(2),
          grandTotal: grandTotal().toFixed(2),
          billableMiles: billableMiles().toFixed(1),
          recipient: config.recipient,
          recaptchaToken,
        })),
      });

      const payload = await res.json().catch(() => ({} as FormspreeErrorBody));
      if (!res.ok) {
        throw new Error(formatFormspreeError(payload, res.status));
      }
      window.location.href = '/tech/success';
    } catch (error) {
      console.error(error);
      const detail = error instanceof Error ? error.message : 'Send failed';
      try {
        await navigator.clipboard.writeText(timesheet);
        setStatus(`${detail} Timesheet copied — email it to ${config.recipient}.`, 'err');
      } catch {
        setStatus(`Send failed. Copy the timesheet and email ${config.recipient}.`, 'err');
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit timesheet';
      }
    }
  });

  resetQuantities();
  renderCatalog();
  renderTrips();
  updateTotals();
}

function catalogRow(id: string, name: string, rate: number, kind: 'task' | 'service', unit: string): string {
  return `
    <div class="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] gap-3 items-center px-4 py-3">
      <div>
        <div class="font-medium text-sm text-slate-800">${escapeHtml(name)}</div>
        <div class="text-xs text-slate-500">${money.format(rate)} ${escapeHtml(unit)}</div>
      </div>
      <div class="flex items-center gap-1.5">
        <button type="button" data-step="dec" data-kind="${kind}" data-id="${escapeAttr(id)}"
          class="h-9 w-9 rounded-lg border border-slate-300 text-lg leading-none hover:bg-slate-50" aria-label="Decrease ${escapeAttr(name)}">−</button>
        <input type="number" min="0" step="1" value="0"
          data-qty-kind="${kind}" data-qty-id="${escapeAttr(id)}"
          class="w-14 text-center border border-slate-300 rounded-lg py-1.5 text-sm"
          aria-label="${escapeAttr(name)} quantity" />
        <button type="button" data-step="inc" data-kind="${kind}" data-id="${escapeAttr(id)}"
          class="h-9 w-9 rounded-lg border border-slate-300 text-lg leading-none hover:bg-slate-50" aria-label="Increase ${escapeAttr(name)}">+</button>
      </div>
      <div class="hidden sm:block text-sm tabular-nums text-slate-700 w-20 text-right"
        data-line-kind="${kind}" data-line-id="${escapeAttr(id)}">—</div>
    </div>
  `;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Formspree's reCAPTCHA v3 docs require action `submit` (same as the contact form). */
export const FORMSPREE_RECAPTCHA_ACTION = 'submit';

export interface PayFormPayloadInput {
  subject: string;
  name: string;
  week: string;
  timesheet: string;
  installationTotal: string;
  mileageTotal: string;
  grandTotal: string;
  billableMiles: string;
  recipient: string;
  recaptchaToken: string;
}

export function buildPayFormPayload(input: PayFormPayloadInput): Record<string, string> {
  return {
    _subject: input.subject,
    subject: input.subject,
    email: input.recipient,
    name: input.name,
    technicianName: input.name,
    weekEnding: input.week,
    message: input.timesheet,
    installationTotal: input.installationTotal,
    mileageTotal: input.mileageTotal,
    grandTotal: input.grandTotal,
    billableMiles: input.billableMiles,
    source: 'Website - Tech Pay Form',
    intendedRecipient: input.recipient,
    'g-recaptcha-response': input.recaptchaToken,
  };
}

type FormspreeErrorBody = {
  error?: string;
  errors?: Array<{ message?: string; error?: string; field?: string }>;
};

export function formatFormspreeError(payload: FormspreeErrorBody, status: number): string {
  const parts: string[] = [];
  if (typeof payload.error === 'string' && payload.error.trim()) parts.push(payload.error.trim());
  if (Array.isArray(payload.errors)) {
    for (const item of payload.errors) {
      const message = item.message || item.error;
      if (message) parts.push(message);
    }
  }
  const raw = parts.join(' ') || `Formspree ${status}`;
  if (/recaptcha/i.test(raw)) {
    return `${raw} Submit from https://freedommobilityny.com (localhost often fails reCAPTCHA). Or Copy and email the timesheet.`;
  }
  return raw;
}

type Grecaptcha = {
  ready: (cb: () => void) => void;
  execute: (key: string, opts: { action: string }) => Promise<string>;
};

async function getRecaptchaToken(siteKey: string): Promise<string> {
  if (!siteKey) return '';

  const started = Date.now();
  while (!(window as unknown as { grecaptcha?: Grecaptcha }).grecaptcha && Date.now() - started < 5000) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const grecaptcha = (window as unknown as { grecaptcha?: Grecaptcha }).grecaptcha;
  if (!grecaptcha) {
    throw new Error(
      'reCAPTCHA did not load. Refresh, or submit from https://freedommobilityny.com if you are on localhost.',
    );
  }

  await new Promise<void>((resolve) => grecaptcha.ready(resolve));
  const token = await grecaptcha.execute(siteKey, { action: FORMSPREE_RECAPTCHA_ACTION });
  if (!token) {
    throw new Error(
      'reCAPTCHA failed. Formspree will not accept this form without it. Try the live site, or Copy and email the timesheet.',
    );
  }
  return token;
}
