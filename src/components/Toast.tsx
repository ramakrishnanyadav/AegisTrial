import React, { useEffect } from 'react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
  type?: 'success' | 'info' | 'alert';
}

export const Toast: React.FC<ToastProps> = ({ message, onClose, type = 'success' }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3200);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      id="action-toast-container"
      className="fixed bottom-20 inset-x-gutter z-50 flex justify-center pointer-events-none transition-all duration-300"
    >
      <div
        id="action-toast-card"
        className="bg-inverse-surface text-inverse-on-surface rounded-lg px-space-md py-space-sm shadow-xl flex items-center justify-between gap-space-sm pointer-events-auto max-w-sm w-full animate-bounce-short"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`material-symbols-outlined text-[18px] shrink-0 ${
              type === 'alert' ? 'text-error-container' : 'text-secondary-fixed'
            }`}
          >
            {type === 'alert' ? 'warning' : 'check_circle'}
          </span>
          <span className="font-body-sm text-body-sm text-inverse-on-surface truncate">
            {message}
          </span>
        </div>
        <button
          id="toast-dismiss-btn"
          type="button"
          onClick={onClose}
          className="font-label-mono-sm text-label-mono-sm text-inverse-on-surface/60 hover:text-inverse-on-surface px-1 shrink-0"
        >
          OK
        </button>
      </div>
    </div>
  );
};
