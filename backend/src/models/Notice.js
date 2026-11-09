/**
 * AeroNexus — Flight Operations Notices Model
 *
 * MySQL-backed notice store backing the Flight Operations Notices module of the
 * Admin Panel (create / edit / publish / deactivate).
 *
 * Reads fall back to the in-memory seed store when the database is not connected,
 * while permanent writes (create / update / delete) require an active database
 * connection and fail safely otherwise — they never persist into memory.
 */

const { getPool, isDatabaseConnected } = require('../config/database');

const INITIAL_NOTICES = [
  {
    id: 'notice-001',
    noticeNumber: 'AERO-NOTICE-2026-001',
    title: 'ATC Scheduling Advisory — JFK T2 Flow',
    category: 'operational',
    severity: 'info',
    status: 'published',
    summary: 'Upcoming runway construction window alters arrival sequencing for inbound widebodies.',
    body: 'A runway maintenance window is scheduled for next week. Expect spacing adjustments for inbound heavy aircraft.',
    effectiveFromUtc: new Date(Date.now() + 86400000).toISOString(),
    effectiveToUtc: new Date(Date.now() + 15 * 86400000).toISOString(),
    createdAtUtc: new Date(Date.now() - 86400000).toISOString(),
    updatedAtUtc: new Date(Date.now() - 3600000).toISOString(),
    publishedBy: 'Duty Operations Center',
  },
  {
    id: 'notice-002',
    noticeNumber: 'AERO-NOTICE-2026-002',
    title: 'Medical Diversion Protocol Update',
    category: 'medical',
    severity: 'high',
    status: 'published',
    summary: 'Expanded medical diversion coordination for transatlantic routes.',
    body: 'Medical diversion partners updated for LHR/ICAO corridors; standby medical escorts assigned.',
    effectiveFromUtc: new Date(Date.now() - 86400000).toISOString(),
    effectiveToUtc: new Date(Date.now() + 30 * 86400000).toISOString(),
    createdAtUtc: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAtUtc: new Date(Date.now() - 7200000).toISOString(),
    publishedBy: 'Medical Operations',
  },
];

let inMemoryNotices = [...INITIAL_NOTICES];

function mapRowToNotice(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    noticeNumber: row.notice_number,
    title: row.title,
    category: row.category,
    severity: row.severity,
    status: row.status,
    summary: row.summary,
    body: row.body,
    effectiveFromUtc: row.effective_from_utc ? new Date(row.effective_from_utc).toISOString() : null,
    effectiveToUtc: row.effective_to_utc ? new Date(row.effective_to_utc).toISOString() : null,
    createdAtUtc: row.created_at_utc ? new Date(row.created_at_utc).toISOString() : new Date().toISOString(),
    updatedAtUtc: row.updated_at_utc ? new Date(row.updated_at_utc).toISOString() : new Date().toISOString(),
    publishedBy: row.published_by || null,
  };
}

function toUtcDateString(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

class Notice {
  static async find() {
    if (isDatabaseConnected()) {
      const pool = getPool();
      const [rows] = await pool.query('SELECT * FROM notices ORDER BY created_at_utc DESC');
      return rows.map(mapRowToNotice);
    }

    return [...inMemoryNotices].sort(
      (a, b) => new Date(b?.createdAtUtc || 0).getTime() - new Date(a?.createdAtUtc || 0).getTime()
    );
  }

  static async findById(id) {
    if (isDatabaseConnected()) {
      const pool = getPool();
      const [rows] = await pool.query('SELECT * FROM notices WHERE id = ? OR notice_number = ? LIMIT 1', [String(id), String(id)]);
      if (rows.length > 0) return mapRowToNotice(rows[0]);
    }

    const noticeId = String(id);
    return inMemoryNotices.find((n) => n.id === noticeId || n.noticeNumber === noticeId) || null;
  }

  static async create(data) {
    if (!isDatabaseConnected()) {
      throw new Error('Database unavailable');
    }

    const now = new Date().toISOString();
    const noticeNumber = data.noticeNumber || `AERO-NOTICE-${Date.now()}`;
    const [result] = await getPool().execute(
      `INSERT INTO notices (notice_number, title, category, severity, status, summary, body, effective_from_utc, effective_to_utc, published_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        noticeNumber,
        data.title,
        data.category || 'operational',
        data.severity || 'info',
        data.status || 'draft',
        data.summary || '',
        data.body || '',
        toUtcDateString(data.effectiveFromUtc),
        toUtcDateString(data.effectiveToUtc),
        data.publishedBy || null,
      ]
    );

    return {
      id: String(result.insertId),
      noticeNumber,
      title: data.title,
      category: data.category || 'operational',
      severity: data.severity || 'info',
      status: data.status || 'draft',
      summary: data.summary || '',
      body: data.body || '',
      effectiveFromUtc: toUtcDateString(data.effectiveFromUtc),
      effectiveToUtc: toUtcDateString(data.effectiveToUtc),
      createdAtUtc: now,
      updatedAtUtc: now,
      publishedBy: data.publishedBy || null,
    };
  }

  static async update(id, updates) {
    if (!isDatabaseConnected()) {
      throw new Error('Database unavailable');
    }

    const now = new Date().toISOString();
    const [result] = await getPool().execute(
      `UPDATE notices SET title = ?, category = ?, severity = ?, status = ?, summary = ?, body = ?, effective_from_utc = ?, effective_to_utc = ?, published_by = ?, updated_at_utc = ? WHERE id = ?`,
      [
        updates.title,
        updates.category,
        updates.severity,
        updates.status,
        updates.summary,
        updates.body,
        toUtcDateString(updates.effectiveFromUtc),
        toUtcDateString(updates.effectiveToUtc),
        updates.publishedBy || null,
        now,
        String(id),
      ]
    );

    if (!result || result.affectedRows === 0) {
      return null;
    }

    const [rows] = await getPool().query('SELECT * FROM notices WHERE id = ? OR notice_number = ? LIMIT 1', [String(id), String(id)]);
    return mapRowToNotice(rows[0]);
  }

  static async remove(id) {
    if (!isDatabaseConnected()) {
      throw new Error('Database unavailable');
    }

    const [result] = await getPool().execute('DELETE FROM notices WHERE id = ?', [String(id)]);
    return Boolean(result && result.affectedRows > 0);
  }
}

module.exports = Notice;
