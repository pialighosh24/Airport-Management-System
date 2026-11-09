const { describe, it } = require('node:test');
const assert = require('node:assert');

const databasePath = require.resolve('../src/config/database');
require(databasePath);

let dbConnectedOverride = true;
let fakePool = null;
let closeDBMock = 0;
require.cache[databasePath].exports.isDatabaseConnected = () => dbConnectedOverride;
require.cache[databasePath].exports.getPool = () => fakePool;
require.cache[databasePath].exports.closeDB = async () => {
  closeDBMock += 1;
};

const { seedNotices } = require('../src/scripts/seedNotices');

const EXPECTED_NOTICES = [
  {
    noticeNumber: 'AERO-NOTICE-2026-001',
    title: 'ATC Scheduling Advisory — JFK T2 Flow',
    category: 'operational',
    severity: 'info',
    status: 'published',
  },
  {
    noticeNumber: 'AERO-NOTICE-2026-002',
    title: 'Medical Diversion Protocol Update',
    category: 'medical',
    severity: 'high',
    status: 'published',
  },
];

function buildNoticeRow(notice, id) {
  return {
    id,
    notice_number: notice.noticeNumber,
    title: notice.title,
    category: notice.category,
    severity: notice.severity,
    status: notice.status,
    summary: 'S',
    body: 'B',
    effective_from_utc: null,
    effective_to_utc: null,
    created_at_utc: new Date().toISOString(),
    updated_at_utc: new Date().toISOString(),
    published_by: 'Ops',
  };
}

describe('AeroNexus Notices Seed Script (Phase 5F-M)', () => {
  it('seeds both original notices and verifies persistence when connected', async () => {
    dbConnectedOverride = true;
    closeDBMock = 0;
    fakePool = {
      query: async (sql, params) => {
        const text = String(sql);
        if (text.includes('SELECT * FROM notices')) {
          const noticeNumber = params && params[0];
          const notice = EXPECTED_NOTICES.find((n) => n.noticeNumber === noticeNumber) || EXPECTED_NOTICES[0];
          const row = buildNoticeRow(notice, 1);
          return [[row], []];
        }
        return [[], []];
      },
      execute: async () => [{ affectedRows: 1, insertId: 42 }, {}],
    };

    const result = await seedNotices();
    assert.strictEqual(result.inserted, 2);
    assert.strictEqual(result.skipped, 0);
    assert.strictEqual(result.verified, true);
    assert.strictEqual(closeDBMock, 1);
  });

  it('skips existing notices and verifies them when connected', async () => {
    dbConnectedOverride = true;
    closeDBMock = 0;
    fakePool = {
      query: async (sql, params) => {
        const text = String(sql);
        if (text.includes('SELECT * FROM notices')) {
          const noticeNumber = params && params[0];
          const notice = EXPECTED_NOTICES.find((n) => n.noticeNumber === noticeNumber) || EXPECTED_NOTICES[0];
          const row = buildNoticeRow(notice, 1);
          return [[row], []];
        }
        if (text.includes('SELECT notice_number FROM notices')) {
          const noticeNumber = params && params[0];
          const existing = EXPECTED_NOTICES.some((n) => n.noticeNumber === noticeNumber) ? [{ notice_number: noticeNumber }] : [];
          return [existing, []];
        }
        return [[], []];
      },
      execute: async () => [{ affectedRows: 0, insertId: 0 }, {}],
    };

    const result = await seedNotices();
    assert.strictEqual(result.inserted, 0);
    assert.strictEqual(result.skipped, 2);
    assert.strictEqual(result.verified, true);
  });

  it('fails when one notice is missing after insertion', async () => {
    dbConnectedOverride = true;
    closeDBMock = 0;
    let readBackCalls = 0;
    fakePool = {
      query: async (sql, params) => {
        const text = String(sql);
        if (text.includes('SELECT * FROM notices')) {
          readBackCalls += 1;
          const noticeNumber = params && params[0];
          const notice = EXPECTED_NOTICES.find((n) => n.noticeNumber === noticeNumber) || EXPECTED_NOTICES[0];
          const row = readBackCalls === 2 ? null : buildNoticeRow(notice, 1);
          return [[row], []];
        }
        return [[], []];
      },
      execute: async () => [{ affectedRows: 1, insertId: 42 }, {}],
    };

    await assert.rejects(() => seedNotices(), /Notices persistence verification failed/);
    assert.strictEqual(closeDBMock, 1);
  });

  it('fails when persisted notice data mismatches', async () => {
    dbConnectedOverride = true;
    closeDBMock = 0;
    fakePool = {
      query: async (sql, params) => {
        const text = String(sql);
        if (text.includes('SELECT * FROM notices')) {
          const noticeNumber = params && params[0];
          const notice = EXPECTED_NOTICES.find((n) => n.noticeNumber === noticeNumber) || EXPECTED_NOTICES[0];
          const row = buildNoticeRow(notice, 1);
          if (notice.noticeNumber === EXPECTED_NOTICES[0].noticeNumber) {
            row.title = 'Tampered Title';
          }
          return [[row], []];
        }
        return [[], []];
      },
      execute: async () => [{ affectedRows: 1, insertId: 42 }, {}],
    };

    await assert.rejects(() => seedNotices(), /Notices persistence verification failed/);
    assert.strictEqual(closeDBMock, 1);
  });

  it('fails with a database-unavailable error when the database is unavailable', async () => {
    dbConnectedOverride = false;
    closeDBMock = 0;
    fakePool = null;

    await assert.rejects(() => seedNotices(), /Database unavailable/);
    assert.strictEqual(closeDBMock, 1);
  });

  it('does not log successful completion when the command fails', async (t) => {
    dbConnectedOverride = true;
    closeDBMock = 0;
    const logCalls = [];
    const logMock = t.mock.method(console, 'log', (...args) => {
      logCalls.push(args);
    });

    // Failure path: read-back verification fails, so the command must not log success.
    fakePool = {
      query: async (sql) => {
        const text = String(sql);
        if (text.includes('SELECT * FROM notices')) {
          throw new Error('READ_BACK_FAILED');
        }
        return [[], []];
      },
      execute: async () => [{ affectedRows: 1, insertId: 42 }, {}],
    };

    await assert.rejects(() => seedNotices(), /READ_BACK_FAILED/);
    assert.strictEqual(logCalls.length, 0);
  });

  it('fails safely and cleans up the database connection when the insert fails', async () => {
    dbConnectedOverride = true;
    closeDBMock = 0;
    fakePool = {
      query: async () => [[], []],
      execute: async () => {
        throw new Error('INSERT failed');
      },
    };

    await assert.rejects(() => seedNotices(), /INSERT failed/);
    assert.strictEqual(closeDBMock, 1);
  });

  it('fails safely when the read-back verification select fails', async () => {
    dbConnectedOverride = true;
    closeDBMock = 0;
    fakePool = {
      query: async (sql) => {
        const text = String(sql);
        if (text.includes('SELECT * FROM notices')) {
          throw new Error('READ_BACK_FAILED');
        }
        return [[], []];
      },
      execute: async () => [{ affectedRows: 1, insertId: 42 }, {}],
    };

    await assert.rejects(() => seedNotices(), /READ_BACK_FAILED/);
    assert.strictEqual(closeDBMock, 1);
  });
});
