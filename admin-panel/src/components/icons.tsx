// AeroNexus Admin Panel — minimal inline SVG icon set (no external icon dependency).

import React from 'react';

export type IconName =
  | 'dashboard'
  | 'flights'
  | 'disruptions'
  | 'notices'
  | 'users'
  | 'monitoring'
  | 'audit'
  | 'settings'
  | 'logout'
  | 'close'
  | 'check'
  | 'alert'
  | 'airplane'
  | 'search'
  | 'refresh'
  | 'shield'
  | 'activity'
  | 'plus';

const PATHS: Record<IconName, React.ReactNode> = {
  dashboard: <path d="M3 13h8V3H3zM11 13h8V3h-8zM3 13v8h8V13zM11 13v8h8V13z" />,
  flights: <path d="M21 15v-6a2 2 0 0 0-2-2h-4l-2-2v6l2 2h5a2 2 0 0 0 2-2zm-7-5a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />,
  disruptions: <path d="M12 2 2 7l10 5 10-5-10-5z" />,
  notices: <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />,
  users: <path d="M16 11c1.66 0 5-2.34 5-5.5S17.66 4 16 4s-5 2.34-5 5.5S14.34 11 16 11z" />,
  monitoring: <path d="M3 12h4l2-8 4 16 2-8h4l-2-8-2 8-2-8-2 8z" />,
  audit: <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />,
  settings: <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.65l-1.92-3.32a.5.5 0 0 0-.63-.22l-2.39.96a7.02 7.02 0 0 0-1.63-1.08l-.43-2.29a.5.5 0 0 0-.48-.42h-3.84a.5.5 0 0 0-.48.42l-.43 2.29a7.02 7.02 0 0 0-1.63 1.08l-2.39-.96a.5.5 0 0 0-.63.22L2.74 8.87a.5.5 0 0 0 .12.65l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.06.94l-2.03 1.58a.5.5 0 0 0-.12.65l1.92 3.32c.12.22.37.29.59.22l2.39-.96a7.02 7.02 0 0 0 1.63 1.08l.43 2.29a.5.5 0 0 0 .48.42h3.84a.5.5 0 0 0 .48-.42l.43-2.29a7.02 7.02 0 0 0 1.63-1.08l2.39.96c.22.07.47 0 .59-.22l1.92-3.32a.5.5 0 0 0-.12-.65l-2.01-1.58z" />,
  logout: <path d="M10 8v8l-5-4 5-4zm11-4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />,
  close: <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />,
  check: <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />,
  alert: <path d="M12 2 1 21h22L12 2zm1 11h-4v4h-2v-4H7v-4h2v-4h2v4h4v4z" />,
  airplane: <path d="M21 15v-6a2 2 0 0 0-2-2h-4l-2-2v6l2 2h5a2 2 0 0 0 2-2zm-7-5a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />,
  search: <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z" />,
  refresh: <path d="M17.65 6.35A8.02 8.02 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14 1.26 3.65 3.05z" />,
  shield: <path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />,
  activity: <path d="M3 13h4l3-8 4 16 3-8h4l-2-8-2 8-2-8-2 8z" />,
  plus: <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />,
};

export function Icon({ name, size = 18, color = 'currentColor' }: { name: IconName; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name]}
    </svg>
  );
}
