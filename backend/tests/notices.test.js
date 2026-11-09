const { describe, it } = require('node:test');
const assert = require('node:assert');

const databasePath = require.resolve('../src/config/database');
require(databasePath);

let dbConnectedOverride = false;
let fakePool = null;
require.cache[databasePath].exports.isDatabaseConnected = () => dbConnectedOverride;
require.cache[databasePath].exports.getPool = () => fakePool;

const Notice = require('../src/models/Notice');

describe('AeroNexus Notices Model (MySQL persistence)', () => {
  it('returns the initial notices from the in-memory store when database is not connected', async () => {
    dbConnectedOverride = false;
    const notices = await Notice.find();

    assert.strictEqual(notices.length, 2);
    assert.strictEqual(notices[0].noticeNumber, 'AERO-NOTICE-2026-001');
    assert.strictEqual(notices[0].title, 'ATC Scheduling Advisory — JFK T2 Flow');
  });

  it('throws a database-unavailable error for permanent writes when database is not connected', async () => {
    dbConnectedOverride = false;

    await assert.rejects(() => Notice.create({ title: 'Storm Watch' }), /Database unavailable/);
    await assert.rejects(() => Notice.update('notice-001', { title: 'Storm Watch' }), /Database unavailable/);
    await assert.rejects(() => Notice.remove('notice-001'), /Database unavailable/);
  });

  it('creates a notice through the database when connected', async () => {
    dbConnectedOverride = true;
    fakePool = {
      execute: async () => [{ affectedRows: 1, insertId: 42 }, {}],
      query: async () => [[], []],
    };

    const created = await Notice.create({
      noticeNumber: 'AERO-NOTICE-2026-099',
      title: 'Storm Watch',
      category: 'weather',
      severity: 'high',
      status: 'published',
      summary: 'S',
      body: 'B',
      effectiveFromUtc: '2026-11-05T00:00:00.000Z',
      effectiveToUtc: null,
      publishedBy: 'Ops',
    });

    assert.strictEqual(created.id, '42');
    assert.strictEqual(created.noticeNumber, 'AERO-NOTICE-2026-099');
    assert.strictEqual(created.title, 'Storm Watch');
    assert.strictEqual(created.category, 'weather');
    assert.strictEqual(created.severity, 'high');
    assert.strictEqual(created.status, 'published');
  });

  it('lists notices through the database when connected', async () => {
    dbConnectedOverride = true;
    fakePool = {
      query: async () => [
        [
          {
            id: 7,
            notice_number: 'AERO-NOTICE-2026-099',
            title: 'Storm Watch',
            category: 'weather',
            severity: 'high',
            status: 'published',
            summary: 'S',
            body: 'B',
            effective_from_utc: null,
            effective_to_utc: null,
            created_at_utc: new Date().toISOString(),
            updated_at_utc: new Date().toISOString(),
            published_by: null,
          },
        ],
        [],
      ],
      execute: async () => [{ affectedRows: 0, insertId: 0 }, {}],
    };

    const notices = await Notice.find();
    assert.strictEqual(notices.length, 1);
    assert.strictEqual(notices[0].id, '7');
    assert.strictEqual(notices[0].noticeNumber, 'AERO-NOTICE-2026-099');
    assert.strictEqual(notices[0].title, 'Storm Watch');
  });

  it('finds a notice by id through the database when connected', async () => {
    dbConnectedOverride = true;
    fakePool = {
      query: async () => [
        [
          {
            id: 7,
            notice_number: 'AERO-NOTICE-2026-099',
            title: 'Storm Watch',
            category: 'weather',
            severity: 'high',
            status: 'published',
            summary: 'S',
            body: 'B',
            effective_from_utc: null,
            effective_to_utc: null,
            created_at_utc: new Date().toISOString(),
            updated_at_utc: new Date().toISOString(),
            published_by: null,
          },
        ],
        [],
      ],
      execute: async () => [{ affectedRows: 0, insertId: 0 }, {}],
    };

    const found = await Notice.findById('7');
    assert.strictEqual(found.noticeNumber, 'AERO-NOTICE-2026-099');
    assert.strictEqual(found.title, 'Storm Watch');
  });

  it('updates a notice through the database when connected', async () => {
    dbConnectedOverride = true;
    fakePool = {
      execute: async () => [{ affectedRows: 1, insertId: 0 }, {}],
      query: async () => [
        [
          {
            id: 7,
            notice_number: 'AERO-NOTICE-2026-099',
            title: 'Updated Storm Watch',
            category: 'weather',
            severity: 'high',
            status: 'published',
            summary: 'S',
            body: 'B',
            effective_from_utc: null,
            effective_to_utc: null,
            created_at_utc: new Date().toISOString(),
            updated_at_utc: new Date().toISOString(),
            published_by: null,
          },
        ],
        [],
      ],
    };

    const updated = await Notice.update('7', {
      title: 'Updated Storm Watch',
      category: 'weather',
      severity: 'high',
      status: 'published',
      summary: 'S',
      body: 'B',
      effectiveFromUtc: null,
      effectiveToUtc: null,
      publishedBy: null,
    });

    assert.strictEqual(updated.title, 'Updated Storm Watch');
  });

  it('removes a notice through the database when connected', async () => {
    dbConnectedOverride = true;
    fakePool = {
      execute: async () => [{ affectedRows: 1, insertId: 0 }, {}],
      query: async () => [[], []],
    };

    const removed = await Notice.remove('7');
    assert.strictEqual(removed, true);
  });
});
