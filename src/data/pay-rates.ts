/**
 * Technician piece rates for the weekly pay form at /tech/pay.
 *
 * The original Replit app kept these in pay-form.tsx, which was not exported.
 * Update this file and redeploy whenever rates change.
 *
 * RATES_DRAFT is the built-in default. Admin → Pay rates can still turn the
 * draft warning back on for this browser. Ops confirmed the catalog 2026-08-27.
 */
export const RATES_DRAFT = false;

export const PAY_FORM_RECIPIENT = 'freedommobilityllc@outlook.com';

/** Old inboxes that must not be reused from saved admin rates / localStorage. */
const RETIRED_PAY_RECIPIENTS = new Set([
  'brian.parmele@freedommobilityva.com',
  'freedommobilityvllc@outlook.com',
]);

function resolveRecipient(value: unknown): string {
  if (typeof value !== 'string' || !value.includes('@')) return PAY_FORM_RECIPIENT;
  const email = value.trim();
  if (RETIRED_PAY_RECIPIENTS.has(email.toLowerCase())) return PAY_FORM_RECIPIENT;
  return email;
}

export interface PayTask {
  id: string;
  category: string;
  name: string;
  rate: number;
}

export interface MileageServiceItem {
  id: string;
  name: string;
  rate: number;
  unit: 'each' | 'hours';
}

/** Add names here to populate the technician dropdown. */
export const technicians: string[] = [];

export const installationTasks: PayTask[] = [
  { id: 'sl-straight', category: 'Stairlifts', name: 'Straight stairlift — standard install', rate: 175 },
  { id: 'sl-outdoor', category: 'Stairlifts', name: 'Outdoor straight stairlift install', rate: 225 },
  { id: 'sl-curved', category: 'Stairlifts', name: 'Curved stairlift install', rate: 350 },
  { id: 'sl-swivel', category: 'Stairlifts', name: 'Power swivel seat add-on', rate: 40 },
  { id: 'sl-fold-rail', category: 'Stairlifts', name: 'Power folding rail add-on', rate: 50 },
  { id: 'sl-hinge', category: 'Stairlifts', name: 'Manual / auto hinge rail', rate: 40 },
  { id: 'sl-removal', category: 'Stairlifts', name: 'Stairlift removal', rate: 85 },
  { id: 'sl-reinstall', category: 'Stairlifts', name: 'Stairlift transfer / reinstall', rate: 150 },
  { id: 'ramp-job', category: 'Ramps', name: 'Modular ramp install (per job)', rate: 150 },
  { id: 'ramp-section', category: 'Ramps', name: 'Additional ramp section', rate: 35 },
  { id: 'ramp-platform', category: 'Ramps', name: 'Ramp platform / turn', rate: 45 },
  { id: 'ramp-threshold', category: 'Ramps', name: 'Threshold ramp install', rate: 40 },
  { id: 'ramp-removal', category: 'Ramps', name: 'Ramp removal', rate: 75 },
  { id: 'vpl-indoor', category: 'Vertical Platform Lifts', name: 'Indoor VPL install', rate: 450 },
  { id: 'vpl-outdoor', category: 'Vertical Platform Lifts', name: 'Outdoor VPL install', rate: 525 },
  { id: 'vpl-multistop', category: 'Vertical Platform Lifts', name: 'Multi-stop VPL add-on', rate: 125 },
];

export const mileageServiceItems: MileageServiceItem[] = [
  { id: 'service-call', name: 'Service / repair call', rate: 65, unit: 'each' },
  { id: 'warranty', name: 'Warranty service call', rate: 45, unit: 'each' },
  { id: 'after-hours', name: 'After-hours / weekend call', rate: 85, unit: 'each' },
  { id: 'battery', name: 'Battery replacement', rate: 25, unit: 'each' },
  { id: 'demo', name: 'Customer training / demo (no install)', rate: 40, unit: 'each' },
];

export interface MileageConfig {
  ratePerMile: number;
  qualifyMilesOneWay: number;
  /** Photon / OSRM bias toward Rochester, NY */
  biasLat: number;
  biasLon: number;
}

export const mileageConfig: MileageConfig = {
  ratePerMile: 0.67,
  qualifyMilesOneWay: 30,
  biasLat: 43.1566,
  biasLon: -77.6088,
};

export interface PayRatesBundle {
  version: 1 | 2;
  ratesDraft: boolean;
  recipient: string;
  technicians: string[];
  installationTasks: PayTask[];
  mileageServiceItems: MileageServiceItem[];
  mileageConfig: MileageConfig;
}

export function getDefaultPayRates(): PayRatesBundle {
  return {
    version: 2,
    ratesDraft: RATES_DRAFT,
    recipient: PAY_FORM_RECIPIENT,
    technicians: [...technicians],
    installationTasks: installationTasks.map((task) => ({ ...task })),
    mileageServiceItems: mileageServiceItems.map((item) => ({ ...item })),
    mileageConfig: { ...mileageConfig },
  };
}

export function parsePayRates(input: unknown): PayRatesBundle | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Partial<PayRatesBundle>;
  if (!Array.isArray(raw.installationTasks) || !Array.isArray(raw.mileageServiceItems)) return null;
  if (!raw.mileageConfig || typeof raw.mileageConfig !== 'object') return null;
  const miles = raw.mileageConfig;
  if (typeof miles.ratePerMile !== 'number' || typeof miles.qualifyMilesOneWay !== 'number') return null;

  const tasks = raw.installationTasks.filter(isTask);
  const services = raw.mileageServiceItems.filter(isService);
  if (tasks.length === 0) return null;

  const storedVersion = raw.version === 2 ? 2 : 1;
  // v1 saves always had ratesDraft: true (checkbox default). Treat them as
  // confirmed now that the built-in catalog is confirmed.
  const ratesDraft = storedVersion === 1 ? RATES_DRAFT : Boolean(raw.ratesDraft);

  return {
    version: 2,
    ratesDraft,
    recipient: resolveRecipient(raw.recipient),
    technicians: Array.isArray(raw.technicians)
      ? raw.technicians.filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
      : [],
    installationTasks: tasks,
    mileageServiceItems: services,
    mileageConfig: {
      ratePerMile: miles.ratePerMile,
      qualifyMilesOneWay: miles.qualifyMilesOneWay,
      biasLat: typeof miles.biasLat === 'number' ? miles.biasLat : mileageConfig.biasLat,
      biasLon: typeof miles.biasLon === 'number' ? miles.biasLon : mileageConfig.biasLon,
    },
  };
}

function isTask(value: unknown): value is PayTask {
  if (!value || typeof value !== 'object') return false;
  const task = value as Partial<PayTask>;
  return Boolean(task.id && task.name && task.category && typeof task.rate === 'number');
}

function isService(value: unknown): value is MileageServiceItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<MileageServiceItem>;
  return Boolean(item.id && item.name && typeof item.rate === 'number' && (item.unit === 'each' || item.unit === 'hours'));
}

export function tasksByCategory(tasks: PayTask[] = installationTasks): [string, PayTask[]][] {
  const groups = new Map<string, PayTask[]>();
  for (const task of tasks) {
    const list = groups.get(task.category) ?? [];
    list.push(task);
    groups.set(task.category, list);
  }
  return [...groups.entries()];
}
