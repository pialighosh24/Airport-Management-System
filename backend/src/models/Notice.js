/**
 * AeroNexus — Flight Operations Notices Model
 *
 * In-memory notice store backing the Flight Operations Notices module of the
 * Admin Panel (create / edit / publish / deactivate).
 */

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

function mapNotice(notice) {
  if (!notice) return null;
  return { ...notice };
}

class Notice {
  static async find() {
    return [...inMemoryNotices].sort(
      (a, b) => new Date(b?.createdAtUtc || 0).getTime() - new Date(a?.createdAtUtc || 0).getTime()
    );
  }

  static async findById(id) {
    const noticeId = String(id);
    return inMemoryNotices.find((n) => n.id === noticeId) || null;
  }

  static async create(data) {
    const notice = {
      id: `notice-${Date.now()}`,
      noticeNumber: data.noticeNumber || `AERO-NOTICE-${Date.now()}`,
      title: data.title,
      category: data.category || 'operational',
      severity: data.severity || 'info',
      status: data.status || 'draft',
      summary: data.summary || '',
      body: data.body || '',
      effectiveFromUtc: data.effectiveFromUtc || null,
      effectiveToUtc: data.effectiveToUtc || null,
      createdAtUtc: new Date().toISOString(),
      updatedAtUtc: new Date().toISOString(),
      publishedBy: data.publishedBy || 'Admin',
    };
    inMemoryNotices.unshift(notice);
    return notice;
  }

  static async update(id, updates) {
    const noticeId = String(id);
    const index = inMemoryNotices.findIndex((n) => n.id === noticeId);
    if (index === -1) return null;

    const current = inMemoryNotices[index];
    const next = {
      ...current,
      ...updates,
      id: current.id,
      noticeNumber: updates.noticeNumber || current.noticeNumber,
      updatedAtUtc: new Date().toISOString(),
    };
    inMemoryNotices[index] = next;
    return next;
  }

  static async remove(id) {
    const noticeId = String(id);
    const before = inMemoryNotices.length;
    inMemoryNotices = inMemoryNotices.filter((n) => n.id !== noticeId);
    return inMemoryNotices.length !== before;
  }
}

module.exports = Notice;
