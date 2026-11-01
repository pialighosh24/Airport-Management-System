// AeroNexus Admin Panel — shared UI primitives.

import React, { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './icons';

/* ---------- Button ---------- */
export function Button({
  variant = 'default',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'danger' | 'ghost' }) {
  const cls = ['btn', variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : '', className].filter(Boolean).join(' ');
  return <button className={cls} {...props} />;
}

/* ---------- Card ---------- */
export function Card({
  title,
  subtitle,
  actions,
  children,
  style,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div className="card" style={style}>
      {(title || actions) && (
        <div className="card-header">
          <div>
            {title && <div className="card-title">{title}</div>}
            {subtitle && <div className="card-subtitle">{subtitle}</div>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

/* ---------- Stat card ---------- */
export type StatTone = 'accent' | 'success' | 'warning' | 'danger' | 'info';

export function StatCard({
  label,
  value,
  foot,
  icon,
  tone = 'accent',
}: {
  label: string;
  value: string | number;
  foot?: string;
  tone?: StatTone;
  icon?: ReactNode;
}) {
  const toneColor = tone === 'success' ? '#34d399' : tone === 'warning' ? '#fbbf24' : tone === 'danger' ? '#f87171' : tone === 'info' ? '#60a5fa' : '#38bdf8';
  return (
    <div className="stat-card" style={{ borderTop: `2px solid ${toneColor}` }}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {icon ? <span className="stat-icon">{icon}</span> : null}
      </div>
      <div className="stat-value">{value}</div>
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  );
}

/* ---------- Badge ---------- */
export function Badge({ tone = 'neutral', children }: { tone?: string; children: ReactNode }) {
  return (
    <span className={`badge badge-${tone}`}>
      <Icon name="activity" size={10} color="currentColor" />
      {children}
    </span>
  );
}

/* ---------- Spinner ---------- */
export function Spinner({ label }: { label?: string }) {
  return (
    <div className="state-box">
      <div className="spinner" />
      {label ? <div className="title">{label}</div> : null}
    </div>
  );
}

/* ---------- Empty / error states ---------- */
export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="state-box">
      <Icon name="airplane" size={28} color="#5d7290" />
      <div className="title">{title}</div>
      {message ? <div className="message">{message}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-box">
      <Icon name="alert" size={28} color="#f87171" />
      <div className="title">Request failed</div>
      <div className="message">{message}</div>
      {onRetry ? (
        <button className="btn btn-sm" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}

/* ---------- Confirm dialog ---------- */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = true,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onCancel} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="modal-body">
          <p className="muted" style={{ fontSize: 13 }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={loading}>
            {loading ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Toasts ---------- */
interface ToastItem {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error';
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastItem['tone']) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, tone: ToastItem['tone'] = 'info') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast"
            style={t.tone === 'error' ? { borderLeftColor: '#f87171' } : t.tone === 'success' ? { borderLeftColor: '#34d399' } : undefined}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
