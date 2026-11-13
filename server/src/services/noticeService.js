/**
 * Notice Service
 *
 * Manages Flight Operations Notices persistence and CRUD.
 */

const fs = require('fs');
const path = require('path');

const NOTICES_FILE = path.resolve(__dirname, '../data/notices.json');

const DEFAULT_NOTICES = [
  {
    id: 'notice-1',
    category: 'DATA QUALITY',
    title: 'Aircraft Data Freshness',
    message: 'Aircraft position data may be delayed, incomplete, or unavailable. Check the last-updated time and data status before interpreting aircraft positions.',
    priority: 'normal',
    active: true,
    createdAt: '2026-10-26T00:00:00.000Z',
    updatedAt: '2026-10-26T00:00:00.000Z',
  },
  {
    id: 'notice-2',
    category: 'TRACKING INFO',
    title: 'Aircraft Visibility',
    message: 'Aircraft visibility depends on data availability, coverage, and provider limitations. Not all aircraft may appear on the radar.',
    priority: 'normal',
    active: true,
    createdAt: '2026-10-26T00:00:00.000Z',
    updatedAt: '2026-10-26T00:00:00.000Z',
  },
  {
    id: 'notice-3',
    category: 'AIRPORT INFO',
    title: 'Airport Data Information',
    message: 'Airport information depends on the configured data source. Verify important details with the relevant airport or official source.',
    priority: 'normal',
    active: true,
    createdAt: '2026-10-26T00:00:00.000Z',
    updatedAt: '2026-10-26T00:00:00.000Z',
  },
  {
    id: 'notice-4',
    category: 'WEATHER INFO',
    title: 'Weather Information',
    message: 'Weather information is for general awareness only. Consult official aviation weather reports for operational decisions.',
    priority: 'normal',
    active: true,
    createdAt: '2026-10-26T00:00:00.000Z',
    updatedAt: '2026-10-26T00:00:00.000Z',
  },
];

function readNotices() {
  try {
    if (!fs.existsSync(NOTICES_FILE)) {
      writeNotices(DEFAULT_NOTICES);
      return DEFAULT_NOTICES;
    }
    const raw = fs.readFileSync(NOTICES_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_NOTICES;
  } catch {
    return DEFAULT_NOTICES;
  }
}

function writeNotices(notices) {
  try {
    const dir = path.dirname(NOTICES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(NOTICES_FILE, JSON.stringify(notices, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to write notices.json:', err.message);
    return false;
  }
}

function getAllNotices(activeOnly = false) {
  const notices = readNotices();
  if (activeOnly) {
    return notices.filter((n) => n.active !== false);
  }
  return notices;
}

function getNoticeById(id) {
  const notices = readNotices();
  return notices.find((n) => n.id === id) || null;
}

function createNotice({ category, title, message, priority = 'normal', active = true }) {
  if (!title || !message) {
    throw new Error('Title and message are required.');
  }

  const notices = readNotices();
  const id = `notice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newNotice = {
    id,
    category: (category || 'OPERATIONS').toUpperCase().trim(),
    title: title.trim(),
    message: message.trim(),
    priority: ['high', 'urgent', 'normal'].includes(priority) ? priority : 'normal',
    active: Boolean(active),
    createdAt: now,
    updatedAt: now,
  };

  notices.push(newNotice);
  writeNotices(notices);
  return newNotice;
}

function updateNotice(id, updates) {
  const notices = readNotices();
  const idx = notices.findIndex((n) => n.id === id);
  if (idx === -1) return null;

  const current = notices[idx];
  const updated = {
    ...current,
    ...(updates.category ? { category: updates.category.toUpperCase().trim() } : {}),
    ...(updates.title ? { title: updates.title.trim() } : {}),
    ...(updates.message ? { message: updates.message.trim() } : {}),
    ...(updates.priority ? { priority: updates.priority } : {}),
    ...(typeof updates.active === 'boolean' ? { active: updates.active } : {}),
    updatedAt: new Date().toISOString(),
  };

  notices[idx] = updated;
  writeNotices(notices);
  return updated;
}

function deleteNotice(id) {
  const notices = readNotices();
  const filtered = notices.filter((n) => n.id !== id);
  if (filtered.length === notices.length) return false;

  writeNotices(filtered);
  return true;
}

module.exports = {
  getAllNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice,
  DEFAULT_NOTICES,
};

