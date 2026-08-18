import { getDefaultPayRates, parsePayRates, type MileageServiceItem, type PayRatesBundle, type PayTask } from '../data/pay-rates';
import { clearLocalPayRates, loadPayRates, savePayRates, type RatesSource } from './pay-rates-store';

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function sourceLabel(source: RatesSource): string {
  if (source === 'api') return 'Using shared shop rates';
  if (source === 'local') return 'Using rates saved on this device';
  return 'Using built-in draft rates';
}

export function initAdminRates(): void {
  const root = document.getElementById('rates-app');
  if (!root) return;

  let rates = getDefaultPayRates();
  const status = document.getElementById('rates-status');

  const setStatus = (message: string, kind: 'ok' | 'err' | 'info' = 'info') => {
    if (!status) return;
    status.textContent = message;
    status.className = kind === 'err'
      ? 'text-sm text-red-600'
      : kind === 'ok'
        ? 'text-sm text-emerald-700'
        : 'text-sm text-slate-600';
  };

  function readForm(): PayRatesBundle {
    const recipient = (document.getElementById('rate-recipient') as HTMLInputElement)?.value.trim();
    const ratePerMile = Number((document.getElementById('rate-per-mile') as HTMLInputElement)?.value);
    const qualify = Number((document.getElementById('rate-qualify') as HTMLInputElement)?.value);
    const ratesDraft = !(document.getElementById('rate-confirmed') as HTMLInputElement)?.checked;
    const technicians = ((document.getElementById('rate-technicians') as HTMLTextAreaElement)?.value || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const installationTasks: PayTask[] = [...root.querySelectorAll<HTMLElement>('[data-task-row]')].map((row) => ({
      id: row.dataset.id || uid('task'),
      category: (row.querySelector('[data-field="category"]') as HTMLInputElement)?.value.trim() || 'Other',
      name: (row.querySelector('[data-field="name"]') as HTMLInputElement)?.value.trim() || 'Untitled',
      rate: Number((row.querySelector('[data-field="rate"]') as HTMLInputElement)?.value) || 0,
    }));

    const mileageServiceItems: MileageServiceItem[] = [...root.querySelectorAll<HTMLElement>('[data-service-row]')].map((row) => ({
      id: row.dataset.id || uid('svc'),
      name: (row.querySelector('[data-field="name"]') as HTMLInputElement)?.value.trim() || 'Untitled',
      rate: Number((row.querySelector('[data-field="rate"]') as HTMLInputElement)?.value) || 0,
      unit: ((row.querySelector('[data-field="unit"]') as HTMLSelectElement)?.value === 'hours' ? 'hours' : 'each'),
    }));

    return {
      ...rates,
      recipient: recipient || rates.recipient,
      ratesDraft,
      technicians,
      installationTasks,
      mileageServiceItems,
      mileageConfig: {
        ...rates.mileageConfig,
        ratePerMile: Number.isFinite(ratePerMile) ? ratePerMile : rates.mileageConfig.ratePerMile,
        qualifyMilesOneWay: Number.isFinite(qualify) ? qualify : rates.mileageConfig.qualifyMilesOneWay,
      },
    };
  }

  function taskRow(task: PayTask): string {
    return `
      <div class="grid grid-cols-1 sm:grid-cols-[7rem_1fr_6rem_auto] gap-2 items-center py-2 border-b border-slate-100 last:border-0" data-task-row data-id="${task.id}">
        <input data-field="category" value="${escapeAttr(task.category)}" class="border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Category" />
        <input data-field="name" value="${escapeAttr(task.name)}" class="border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Task name" />
        <input data-field="rate" type="number" min="0" step="0.01" value="${task.rate}" class="border border-slate-300 rounded-lg px-3 py-2 text-sm" aria-label="Rate" />
        <button type="button" data-remove-task class="text-xs text-slate-500 hover:text-red-600 px-2 py-2">Remove</button>
      </div>
    `;
  }

  function serviceRow(item: MileageServiceItem): string {
    return `
      <div class="grid grid-cols-1 sm:grid-cols-[1fr_6rem_6rem_auto] gap-2 items-center py-2 border-b border-slate-100 last:border-0" data-service-row data-id="${item.id}">
        <input data-field="name" value="${escapeAttr(item.name)}" class="border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Item name" />
        <input data-field="rate" type="number" min="0" step="0.01" value="${item.rate}" class="border border-slate-300 rounded-lg px-3 py-2 text-sm" aria-label="Rate" />
        <select data-field="unit" class="border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white">
          <option value="each" ${item.unit === 'each' ? 'selected' : ''}>each</option>
          <option value="hours" ${item.unit === 'hours' ? 'selected' : ''}>hours</option>
        </select>
        <button type="button" data-remove-service class="text-xs text-slate-500 hover:text-red-600 px-2 py-2">Remove</button>
      </div>
    `;
  }

  function render(): void {
    const recipient = document.getElementById('rate-recipient') as HTMLInputElement | null;
    const perMile = document.getElementById('rate-per-mile') as HTMLInputElement | null;
    const qualify = document.getElementById('rate-qualify') as HTMLInputElement | null;
    const confirmed = document.getElementById('rate-confirmed') as HTMLInputElement | null;
    const techs = document.getElementById('rate-technicians') as HTMLTextAreaElement | null;
    const taskMount = document.getElementById('task-rows');
    const serviceMount = document.getElementById('service-rows');

    if (recipient) recipient.value = rates.recipient;
    if (perMile) perMile.value = String(rates.mileageConfig.ratePerMile);
    if (qualify) qualify.value = String(rates.mileageConfig.qualifyMilesOneWay);
    if (confirmed) confirmed.checked = !rates.ratesDraft;
    if (techs) techs.value = rates.technicians.join('\n');
    if (taskMount) taskMount.innerHTML = rates.installationTasks.map(taskRow).join('');
    if (serviceMount) serviceMount.innerHTML = rates.mileageServiceItems.map(serviceRow).join('');
  }

  root.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-remove-task]')) {
      target.closest('[data-task-row]')?.remove();
    }
    if (target.closest('[data-remove-service]')) {
      target.closest('[data-service-row]')?.remove();
    }
  });

  document.getElementById('add-task')?.addEventListener('click', () => {
    document.getElementById('task-rows')?.insertAdjacentHTML('beforeend', taskRow({
      id: uid('task'),
      category: 'Other',
      name: '',
      rate: 0,
    }));
  });

  document.getElementById('add-service')?.addEventListener('click', () => {
    document.getElementById('service-rows')?.insertAdjacentHTML('beforeend', serviceRow({
      id: uid('svc'),
      name: '',
      rate: 0,
      unit: 'each',
    }));
  });

  document.getElementById('save-rates')?.addEventListener('click', async () => {
    const next = parsePayRates(readForm());
    if (!next) {
      setStatus('Could not save. Every task needs a name and a rate.', 'err');
      return;
    }
    rates = next;
    setStatus('Saving…');
    const result = await savePayRates(rates);
    setStatus(result.message, result.ok ? 'ok' : 'err');
  });

  document.getElementById('reset-rates')?.addEventListener('click', () => {
    if (!confirm('Reset to the built-in draft rates on this device?')) return;
    clearLocalPayRates();
    rates = getDefaultPayRates();
    render();
    setStatus('Reset to built-in draft rates on this device. Save to share.', 'info');
  });

  void (async () => {
    const loaded = await loadPayRates();
    rates = loaded.rates;
    render();
    setStatus(sourceLabel(loaded.source));
  })();
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
