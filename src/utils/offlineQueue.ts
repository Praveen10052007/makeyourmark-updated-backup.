export interface OfflineQueueItem {
  id: string;
  type: 'sync-profile' | 'sync-note' | 'sync-roadmap' | 'queued-chat';
  payload: any;
  createdAt: string;
}

const QUEUE_KEY = 'mym_offline_sync_queue_v1';

export function getOfflineQueue(): OfflineQueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getOfflineQueueCount(): number {
  return getOfflineQueue().length;
}

export function enqueueOfflineAction(
  type: OfflineQueueItem['type'],
  payload: any
): OfflineQueueItem[] {
  const current = getOfflineQueue();
  const next: OfflineQueueItem[] = [
    ...current.slice(-49),
    {
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      payload,
      createdAt: new Date().toISOString(),
    },
  ];
  localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('mym-offline-queue-change'));
  return next;
}

export async function flushOfflineQueue(handlers: {
  onSyncProfile?: (p: any) => Promise<boolean | void>;
  onSyncNote?: (n: any) => Promise<boolean | void>;
  onSyncRoadmap?: (r: any) => Promise<boolean | void>;
}): Promise<{ processed: number; remaining: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0 || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return { processed: 0, remaining: queue.length };
  }

  const remaining: OfflineQueueItem[] = [];
  let processed = 0;

  for (const item of queue) {
    try {
      if (item.type === 'sync-profile' && handlers.onSyncProfile) {
        await handlers.onSyncProfile(item.payload);
        processed++;
      } else if (item.type === 'sync-note' && handlers.onSyncNote) {
        await handlers.onSyncNote(item.payload);
        processed++;
      } else if (item.type === 'sync-roadmap' && handlers.onSyncRoadmap) {
        await handlers.onSyncRoadmap(item.payload);
        processed++;
      } else {
        // Leave chat or unhandled item cleanly if still needed
        processed++;
      }
    } catch {
      remaining.push(item);
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  window.dispatchEvent(new CustomEvent('mym-offline-queue-change'));
  return { processed, remaining: remaining.length };
}

export interface OfflineVaultItem {
  id: string;
  department: string;
  title: string;
  summary: string;
  keyTakeaways: string[];
}

export const OFFLINE_STUDY_VAULT: OfflineVaultItem[] = [
  {
    id: 'vault-cse',
    department: 'CSE & IT',
    title: 'Offline Local Content — DSA & DBMS Quick Revision',
    summary: 'Pre-cached core patterns stored locally in your browser so you can revise even without internet.',
    keyTakeaways: [
      'Arrays & Two Pointers: Sort or shrink window linearly to cut O(n^2) loops to O(n).',
      'DBMS Normalization: 1NF (atomic cells), 2NF (no partial dependency), 3NF (no transitive dependency).',
      'REST Status Codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 503 Unavailable.',
    ],
  },
  {
    id: 'vault-ece',
    department: 'ECE, EEE & VLSI',
    title: 'Offline Local Content — Digital Logic & Embedded Essentials',
    summary: 'Pre-cached hardware and embedded formulas stored locally for offline revision.',
    keyTakeaways: [
      'Setup Time (Tsu): Minimum interval data must stay stable BEFORE the active clock edge.',
      'Hold Time (Th): Minimum interval data must stay stable AFTER the active clock edge.',
      'UART vs SPI vs I2C: UART (2 wires async), I2C (SDA/SCL addressed bus), SPI (MOSI/MISO/SCK/CS high speed).',
    ],
  },
  {
    id: 'vault-core',
    department: 'Mechanical, Civil, Chemical & Biotech',
    title: 'Offline Local Content — Core Engineering & Interview Frameworks',
    summary: 'Pre-cached engineering & HR STAR framework notes stored locally.',
    keyTakeaways: [
      'Thermodynamics 1st Law: dQ = dU + dW; 2nd Law governs entropy increase and Carnot efficiency ceiling.',
      'Civil Design Check: Always validate Dead + Live + Seismic load combinations and slenderness ratio.',
      'HR STAR Method: Situation (15%) -> Task (15%) -> Action YOU took (50%) -> Measurable Result (20%).',
    ],
  },
];
