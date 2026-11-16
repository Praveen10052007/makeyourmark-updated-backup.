import React from 'react';
import { Compass, AlertTriangle } from 'lucide-react';
import { ViewMode } from '../../types';

interface Props {
  onNavigate: (view: ViewMode) => void;
}

export const NotFoundView: React.FC<Props> = ({ onNavigate }) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-8 text-center space-y-5 shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/30">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest">
            Error 404
          </span>
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white">Route Not Found</h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            The requested module or screen does not exist or has been relocated.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => onNavigate('home')}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 py-3 text-sm font-semibold text-white shadow-lg hover:from-orange-500 hover:to-amber-500 transition active:scale-95"
          >
            <Compass className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
