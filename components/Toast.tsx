import React from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const styles = {
    success: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    error: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
    info: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  };

  return (
    <div className={`fixed top-20 right-6 z-[70] px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl ${styles[type]}`}>
      <div className="flex items-start gap-3">
        <p className="text-sm max-w-xs">{message}</p>
        <button onClick={onClose} className="text-xs opacity-80 hover:opacity-100">✕</button>
      </div>
    </div>
  );
};
