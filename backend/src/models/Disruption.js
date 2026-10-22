const { getPool, isDatabaseConnected } = require('../config/database');

const INITIAL_DISRUPTIONS = [
  {
    id: 'disp-001',
    caseNumber: 'DIS-2026-042',
    flightNumber: 'EK202',
    route: 'JFK -> DXB',
    incidentType: 'mechanical',
    severity: 'medium',
    impactedPassengers: 382,
    status: 'investigating',
    createdAtUtc: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    updatedAtUtc: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    reportedBy: 'Station Operations Duty Lead (JFK T4)',
    summary: 'Auxiliary Power Unit (APU) starter valve fault reported during pre-departure startup.',
    actionPlan: 'Aircraft pulled to stand A6B for line maintenance valve swap. Meal vouchers distributed. Estimated departure revised to +40 mins.',
    rebookingStatus: 'not_required',
  },
  {
    id: 'disp-002',
    caseNumber: 'DIS-2026-043',
    flightNumber: 'BA178',
    route: 'JFK -> LHR',
    incidentType: 'air_traffic_control',
    severity: 'low',
    impactedPassengers: 294,
    status: 'open',
    createdAtUtc: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    updatedAtUtc: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    reportedBy: 'Dispatch Operations Central',
    summary: 'North Atlantic Track (NAT) Shanwick Oceanic sector congestion spacing requirement.',
    actionPlan: 'Adjusted flight level from FL370 to FL350 to expedite oceanic clearance window.',
    rebookingStatus: 'not_required',
  },
  {
    id: 'disp-003',
    caseNumber: 'DIS-2026-040',
    flightNumber: 'QF12',
    route: 'LAX -> SYD',
    incidentType: 'weather',
    severity: 'critical',
    impactedPassengers: 236,
    status: 'open',
    createdAtUtc: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    updatedAtUtc: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    reportedBy: 'Pacific Network Duty Controller',
    summary: 'Severe convective storm cell cluster over Fiji route sector causing en-route rerouting & fuel margin review.',
    actionPlan: 'Technical fuel stop planned at Nadi (NAN) if headwind velocity exceeds 65 knots. Passenger support team alerted.',
    rebookingStatus: 'in_progress',
  },
];

let inMemoryDisruptions = [...INITIAL_DISRUPTIONS];

function mapRowToDisruption(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    caseNumber: row.case_number,
    flightNumber: row.flight_number,
    route: row.route,
    incidentType: row.incident_type,
    severity: row.severity,
    impactedPassengers: parseInt(row.impacted_passengers, 10) || 0,
    status: row.status,
    reportedBy: row.reported_by,
    summary: row.summary,
    actionPlan: row.action_plan,
    rebookingStatus: row.rebooking_status,
    createdAtUtc: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAtUtc: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

class Disruption {
  static async find(filters = {}) {
    if (isDatabaseConnected()) {
      try {
        const pool = getPool();
        let sql = 'SELECT * FROM disruptions WHERE 1=1';
        const params = [];
        if (filters.status && filters.status !== 'all') {
          sql += ' AND status = ?';
          params.push(filters.status);
        }
        if (filters.severity && filters.severity !== 'all') {
          sql += ' AND severity = ?';
          params.push(filters.severity);
        }
        if (filters.flightNumber) {
          sql += ' AND flight_number = ?';
          params.push(filters.flightNumber.toUpperCase());
        }
        sql += ' ORDER BY id DESC';
        const [rows] = await pool.query(sql, params);
        if (rows.length > 0) return rows.map(mapRowToDisruption);
      } catch (err) {
        console.warn('⚠️ [Disruption.find] DB query failed, falling back to memory store:', err.message);
      }
    }

    let results = [...inMemoryDisruptions];
    if (filters.status && filters.status !== 'all') {
      results = results.filter((d) => d.status === filters.status);
    }
    if (filters.severity && filters.severity !== 'all') {
      results = results.filter((d) => d.severity === filters.severity);
    }
    if (filters.flightNumber) {
      results = results.filter((d) => d.flightNumber.toUpperCase() === filters.flightNumber.toUpperCase());
    }
    return results;
  }

  static async findById(id) {
    if (isDatabaseConnected()) {
      try {
        const pool = getPool();
        const [rows] = await pool.query('SELECT * FROM disruptions WHERE id = ? OR case_number = ? LIMIT 1', [id, id]);
        if (rows.length > 0) return mapRowToDisruption(rows[0]);
      } catch (err) {
        console.warn('⚠️ [Disruption.findById] DB query failed:', err.message);
      }
    }
    return inMemoryDisruptions.find((d) => String(d.id) === String(id) || d.caseNumber === id) || null;
  }

  static async create(data) {
    const caseNumber = data.caseNumber || `DIS-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    if (isDatabaseConnected()) {
      try {
        const pool = getPool();
        const [result] = await pool.execute(
          `INSERT INTO disruptions 
            (case_number, flight_number, route, incident_type, severity, impacted_passengers, status, reported_by, summary, action_plan, rebooking_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            caseNumber,
            data.flightNumber.toUpperCase().trim(),
            data.route || 'N/A',
            data.incidentType || 'other',
            data.severity || 'medium',
            parseInt(data.impactedPassengers, 10) || 0,
            data.status || 'open',
            data.reportedBy || 'Staff Operations',
            data.summary,
            data.actionPlan || 'Under review',
            data.rebookingStatus || 'not_required',
          ]
        );
        return {
          id: String(result.insertId),
          caseNumber,
          flightNumber: data.flightNumber.toUpperCase().trim(),
          route: data.route || 'N/A',
          incidentType: data.incidentType || 'other',
          severity: data.severity || 'medium',
          impactedPassengers: parseInt(data.impactedPassengers, 10) || 0,
          status: data.status || 'open',
          reportedBy: data.reportedBy || 'Staff Operations',
          summary: data.summary,
          actionPlan: data.actionPlan || 'Under review',
          rebookingStatus: data.rebookingStatus || 'not_required',
          createdAtUtc: now,
          updatedAtUtc: now,
        };
      } catch (err) {
        console.warn('⚠️ [Disruption.create] DB insert failed, using in-memory:', err.message);
      }
    }

    const newCase = {
      id: `disp-${Date.now().toString().slice(-4)}`,
      caseNumber,
      flightNumber: data.flightNumber.toUpperCase().trim(),
      route: data.route || 'N/A',
      incidentType: data.incidentType || 'other',
      severity: data.severity || 'medium',
      impactedPassengers: parseInt(data.impactedPassengers, 10) || 0,
      status: data.status || 'open',
      reportedBy: data.reportedBy || 'Staff Operations',
      summary: data.summary,
      actionPlan: data.actionPlan || 'Under review',
      rebookingStatus: data.rebookingStatus || 'not_required',
      createdAtUtc: now,
      updatedAtUtc: now,
    };
    inMemoryDisruptions.unshift(newCase);
    return newCase;
  }

  static async update(id, updates) {
    const now = new Date().toISOString();
    if (isDatabaseConnected()) {
      try {
        const pool = getPool();
        const setClauses = [];
        const params = [];
        if (updates.status) {
          setClauses.push('status = ?');
          params.push(updates.status);
        }
        if (updates.severity) {
          setClauses.push('severity = ?');
          params.push(updates.severity);
        }
        if (updates.actionPlan) {
          setClauses.push('action_plan = ?');
          params.push(updates.actionPlan);
        }
        if (updates.rebookingStatus) {
          setClauses.push('rebooking_status = ?');
          params.push(updates.rebookingStatus);
        }
        if (setClauses.length > 0) {
          params.push(id);
          await pool.execute(`UPDATE disruptions SET ${setClauses.join(', ')} WHERE id = ?`, params);
          return await this.findById(id);
        }
      } catch (err) {
        console.warn('⚠️ [Disruption.update] DB update failed:', err.message);
      }
    }

    const idx = inMemoryDisruptions.findIndex((d) => String(d.id) === String(id) || d.caseNumber === id);
    if (idx >= 0) {
      inMemoryDisruptions[idx] = {
        ...inMemoryDisruptions[idx],
        ...updates,
        updatedAtUtc: now,
      };
      return inMemoryDisruptions[idx];
    }
    return null;
  }
}

module.exports = Disruption;
