import React, { useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface Props {
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: React.FC<Props> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-2 rounded-xl font-medium shadow-md transition active:scale-95 ${
          variant === 'full'
            ? 'w-full justify-center bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm text-white hover:from-indigo-500 hover:to-violet-500'
            : 'bg-indigo-600/90 hover:bg-indigo-600 text-white px-3 py-1.5 text-xs'
        }`}
        title="Install MakeYourMark to home screen"
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-950/40 font-medium text-indigo-300 hover:bg-indigo-900/50 transition ${
            variant === 'full' ? 'w-full justify-center px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs'
          }`}
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>Add to iOS Home</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-semibold text-white">Install on iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400 font-bold text-xs">
                    1
                  </div>
                  <p>
                    Tap the <strong className="text-white">Share</strong> button{' '}
                    <Share className="inline w-4 h-4 mx-1 text-indigo-400" /> in the Safari toolbar.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400 font-bold text-xs">
                    2
                  </div>
                  <p>
                    Scroll down and select <strong className="text-white">Add to Home Screen</strong>{' '}
                    <PlusSquare className="inline w-4 h-4 mx-1 text-indigo-400" />.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-sm font-semibold text-white transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
