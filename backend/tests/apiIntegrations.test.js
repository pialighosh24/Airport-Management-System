const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { getFlightOffers } = require('../src/services/amadeusService');
const { getFlightStatus } = require('../src/services/flightAwareService');
const { listTasks, createTask, updateTask, GROUND_TASK_STATUSES } = require('../src/services/groundOperationsService');

describe('AeroNexus API Integrations (new services)', () => {
  describe('Amadeus Flight Offers Service', () => {
    it('should reject flight offer search when credentials are not configured', async () => {
      await assert.rejects(
        () => getFlightOffers({ origin: 'DEL', destination: 'BOM', departureDate: '2026-10-28' }),
        (err) => err.name === 'AmadeusNotConfiguredError'
      );
    });

    it('should surface typed configuration errors before request validation when unconfigured', async () => {
      // With credentials unconfigured the service fails fast with a typed error,
      // which the controller maps to a clean 503 for the client.
      await assert.rejects(
        () => getFlightOffers({ origin: 'INVALID', destination: 'BOM', departureDate: '2026-10-28' }),
        (err) => err.name === 'AmadeusNotConfiguredError'
      );
    });
  });

  describe('FlightAware AeroAPI Service', () => {
    it('should reject flight status lookup when credentials are not configured', async () => {
      await assert.rejects(
        () => getFlightStatus('AI101'),
        (err) => err.name === 'FlightAwareNotConfiguredError'
      );
    });

    it('should reject flight status lookup without a flight identifier', async () => {
      await assert.rejects(
        () => getFlightStatus(''),
        (err) => err.name === 'ValidationError'
      );
    });
  });

  describe('Ground Operations Engine', () => {
    it('should create a task with a valid lifecycle status', async () => {
      const result = await createTask({
        flightNumber: 'AI101',
        type: 'turnaround',
        status: 'in_progress',
        assignedTo: 'ops_team_alpha',
        notes: 'Test task from integration suite',
      });
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.status, 'in_progress');
      assert.ok(result.data.taskNumber);
      assert.ok(result.data.updatedAtUtc >= result.data.createdAtUtc);
    });

    it('should list tasks and update status through the lifecycle', async () => {
      const list = await listTasks({ flightNumber: 'AI101' });
      assert.strictEqual(list.success, true);

      const taskId = list.data[0].id;
      const updated = await updateTask(taskId, { status: 'completed' });
      assert.strictEqual(updated.data.status, 'completed');
      assert.ok(updated.data.updatedAtUtc >= updated.data.createdAtUtc);
    });

    it('should reject invalid task status values', async () => {
      const list = await listTasks({ flightNumber: 'AI101' });
      const taskId = list.data[0].id;
      let caught = null;
      try {
        await updateTask(taskId, { status: 'not_a_status' });
      } catch (err) {
        caught = err;
      }
      assert.ok(caught, 'Expected updateTask to reject for invalid status');
      assert.strictEqual(caught.name, 'ValidationError');
    });

    it('should expose the supported ground task statuses', () => {
      assert.deepStrictEqual(GROUND_TASK_STATUSES, ['pending', 'in_progress', 'completed']);
    });
  });
});
