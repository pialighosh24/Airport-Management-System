const { describe, it } = require('node:test');
const assert = require('node:assert');

const Notice = require('../src/models/Notice');
const noticeController = require('../src/controllers/noticeController');

function createRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

const sampleNotice = {
  id: '7',
  noticeNumber: 'AERO-NOTICE-2026-099',
  title: 'Storm Watch',
  category: 'weather',
  severity: 'high',
  status: 'published',
  summary: 'S',
  body: 'B',
  effectiveFromUtc: null,
  effectiveToUtc: null,
  createdAtUtc: '2026-11-05T00:00:00.000Z',
  updatedAtUtc: '2026-11-05T00:00:00.000Z',
  publishedBy: 'Ops',
};

describe('AeroNexus Notices Controller (Phase 5C)', () => {
  describe('GET /api/admin/notices', () => {
    it('returns 200 with success, count and data', async () => {
      Notice.find = async () => [sampleNotice];

      const res = createRes();
      await noticeController.getAdminNotices({}, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.count, 1);
      assert.strictEqual(res.body.data.length, 1);
      assert.strictEqual(res.body.data[0].noticeNumber, 'AERO-NOTICE-2026-099');
    });
  });

  describe('POST /api/admin/notices', () => {
    it('creates a valid notice and returns 201', async () => {
      Notice.create = async () => ({ ...sampleNotice, id: '42', noticeNumber: 'AERO-NOTICE-2026-099', title: 'Storm Watch' });

      const res = createRes();
      await noticeController.createAdminNotice(
        {
          body: {
            title: 'Storm Watch',
            category: 'weather',
            severity: 'high',
            status: 'published',
            summary: 'S',
            body: 'B',
            effectiveFromUtc: '2026-11-05T00:00:00.000Z',
            effectiveToUtc: null,
            publishedBy: 'Ops',
          },
        },
        res
      );

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.message, 'Flight operations notice created.');
    });

    it('returns 400 when the title is missing', async () => {
      const res = createRes();
      await noticeController.createAdminNotice({ body: { title: '' } }, res);

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'ValidationError');
      assert.strictEqual(res.body.message, 'Notice title is required.');
    });

    it('returns 400 for an invalid category', async () => {
      const res = createRes();
      await noticeController.createAdminNotice({ body: { title: 'T', category: 'bogus' } }, res);

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.error, 'ValidationError');
      assert.ok(res.body.message.includes('Invalid notice category'));
    });

    it('returns 400 for an invalid severity', async () => {
      const res = createRes();
      await noticeController.createAdminNotice({ body: { title: 'T', severity: 'bogus' } }, res);

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.error, 'ValidationError');
      assert.ok(res.body.message.includes('Invalid notice severity'));
    });

    it('returns 400 for an invalid status', async () => {
      const res = createRes();
      await noticeController.createAdminNotice({ body: { title: 'T', status: 'bogus' } }, res);

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.error, 'ValidationError');
      assert.ok(res.body.message.includes('Invalid notice status'));
    });

    it('returns 400 for an invalid effective date range', async () => {
      const res = createRes();
      await noticeController.createAdminNotice(
        { body: { title: 'T', effectiveFromUtc: '2026-11-10T00:00:00.000Z', effectiveToUtc: '2026-11-05T00:00:00.000Z' } },
        res
      );

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.error, 'ValidationError');
      assert.ok(res.body.message.includes('effective window is invalid'));
    });

    it('returns 409 for a duplicate notice number', async () => {
      Notice.create = async () => {
        const err = new Error('Duplicate entry for unique key');
        err.code = 'ER_DUP_ENTRY';
        throw err;
      };

      const res = createRes();
      await noticeController.createAdminNotice({ body: { title: 'T' } }, res);

      assert.strictEqual(res.statusCode, 409);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'ConflictError');
      assert.ok(res.body.message.includes('already exists'));
    });

    it('returns 503 when notice persistence is unavailable', async () => {
      Notice.create = async () => {
        throw new Error('Database unavailable');
      };

      const res = createRes();
      await noticeController.createAdminNotice({ body: { title: 'T' } }, res);

      assert.strictEqual(res.statusCode, 503);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'ServiceUnavailable');
    });

    it('returns 500 on unexpected create failure', async () => {
      Notice.create = async () => {
        throw new Error('Unexpected failure');
      };

      const res = createRes();
      await noticeController.createAdminNotice({ body: { title: 'T' } }, res);

      assert.strictEqual(res.statusCode, 500);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'ServerError');
    });
  });

  describe('PUT /api/admin/notices/:id', () => {
    it('updates a valid notice and returns 200', async () => {
      Notice.findById = async () => sampleNotice;
      Notice.update = async () => ({ ...sampleNotice, title: 'Updated Storm Watch' });

      const res = createRes();
      await noticeController.updateAdminNotice(
        { params: { id: '7' }, body: { title: 'Updated Storm Watch', status: 'published' } },
        res
      );

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.message, 'Flight operations notice updated.');
      assert.strictEqual(res.body.data.title, 'Updated Storm Watch');
    });

    it('returns 404 when the notice is not found', async () => {
      Notice.findById = async () => null;

      const res = createRes();
      await noticeController.updateAdminNotice({ params: { id: 'missing' }, body: { title: 'Updated' } }, res);

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'NotFoundError');
    });

    it('returns 400 for an invalid status', async () => {
      Notice.findById = async () => sampleNotice;

      const res = createRes();
      await noticeController.updateAdminNotice({ params: { id: '7' }, body: { title: 'Updated', status: 'bogus' } }, res);

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.error, 'ValidationError');
      assert.ok(res.body.message.includes('Invalid notice status'));
    });

    it('returns 503 when notice persistence is unavailable during update', async () => {
      Notice.findById = async () => sampleNotice;
      Notice.update = async () => {
        throw new Error('Database unavailable');
      };

      const res = createRes();
      await noticeController.updateAdminNotice({ params: { id: '7' }, body: { title: 'Updated' } }, res);

      assert.strictEqual(res.statusCode, 503);
      assert.strictEqual(res.body.error, 'ServiceUnavailable');
    });

    it('returns 500 on unexpected update failure', async () => {
      Notice.findById = async () => sampleNotice;
      Notice.update = async () => {
        throw new Error('Unexpected failure');
      };

      const res = createRes();
      await noticeController.updateAdminNotice({ params: { id: '7' }, body: { title: 'Updated' } }, res);

      assert.strictEqual(res.statusCode, 500);
      assert.strictEqual(res.body.error, 'ServerError');
    });
  });

  describe('DELETE /api/admin/notices/:id', () => {
    it('deletes a notice and returns 200', async () => {
      Notice.remove = async () => true;

      const res = createRes();
      await noticeController.deleteAdminNotice({ params: { id: '7' } }, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.message, 'Flight operations notice deleted.');
    });

    it('returns 404 when the notice is not found', async () => {
      Notice.remove = async () => false;

      const res = createRes();
      await noticeController.deleteAdminNotice({ params: { id: 'missing' } }, res);

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'NotFoundError');
    });

    it('returns 503 when notice persistence is unavailable during delete', async () => {
      Notice.remove = async () => {
        throw new Error('Database unavailable');
      };

      const res = createRes();
      await noticeController.deleteAdminNotice({ params: { id: '7' } }, res);

      assert.strictEqual(res.statusCode, 503);
      assert.strictEqual(res.body.error, 'ServiceUnavailable');
    });

    it('returns 500 on unexpected delete failure', async () => {
      Notice.remove = async () => {
        throw new Error('Unexpected failure');
      };

      const res = createRes();
      await noticeController.deleteAdminNotice({ params: { id: '7' } }, res);

      assert.strictEqual(res.statusCode, 500);
      assert.strictEqual(res.body.error, 'ServerError');
    });
  });
});
