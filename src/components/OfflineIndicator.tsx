import React, { useEffect, useState } from 'react';
import { WifiOff, CloudUpload, BookOpen, X } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getOfflineQueueCount, OFFLINE_STUDY_VAULT } from '../utils/offlineQueue';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [queueCount, setQueueCount] = useState<number>(() => getOfflineQueueCount());
  const [showVault, setShowVault] = useState(false);

  useEffect(() => {
    const refresh = () => setQueueCount(getOfflineQueueCount());
    window.addEventListener('mym-offline-queue-change', refresh);
    return () => window.removeEventListener('mym-offline-queue-change', refresh);
  }, []);

  if (isOnline && queueCount === 0 && !showVault) return null;

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-20 sm:bottom-6 left-4 z-50 flex flex-wrap items-center gap-2 rounded-2xl bg-amber-600/95 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-white shadow-xl border border-amber-400/30"
      >
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>
              Offline Mode — Local drafts active{queueCount > 0 ? ` (${queueCount} queued for sync)` : ''}
            </span>
          </>
        ) : (
          <>
            <CloudUpload className="w-4 h-4 shrink-0" />
            <span>Syncing {queueCount} offline changes...</span>
          </>
        )}

        <button
          type="button"
          onClick={() => setShowVault(true)}
          className="ml-1 inline-flex items-center gap-1 rounded-lg bg-white/20 hover:bg-white/30 px-2 py-0.5 text-[11px] font-bold transition"
        >
          <BookOpen className="w-3 h-3" />
          Offline Vault
        </button>
      </div>

      {showVault && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/65 backdrop-blur-md p-4">
          <div className="w-full max-w-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Offline Local Content — Quick Study Vault
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Clearly labeled browser-stored revision notes (not live AI responses). Your saved notes &amp; resume drafts remain editable offline.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowVault(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {OFFLINE_STUDY_VAULT.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-amber-400">
                      {item.department} • Offline Local Content
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">{item.title}</h4>
                  <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300 list-disc pl-4">
                    {item.keyTakeaways.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
