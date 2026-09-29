import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';

/**
 * Regression tests for the HTTP contract bugs found by browser testing.
 * The real controllers are invoked with a stubbed req/res, so neither a
 * database nor a listening server is required.
 */

/**
 * Minimal Express double.
 *
 * `asyncHandler` deliberately does not return its promise, so `invoke` cannot
 * simply await the handler — it waits for the response to actually be sent.
 */
function stubResponse() {
  let settle;
  const sent = new Promise((resolve, reject) => {
    settle = { resolve, reject };
  });

  const res = {
    statusCode: 200,
    body: undefined,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.body = payload;
      settle.resolve(payload);
      return res;
    },
  };

  return { res, sent, settle };
}

/** Drive one controller to completion and return what it sent. */
async function invoke(handler, req) {
  const { res, sent, settle } = stubResponse();

  const timeout = setTimeout(
    () => settle.reject(new Error('controller never sent a response')),
    5000,
  );

  handler(req, res, (err) => {
    clearTimeout(timeout);
    if (err) settle.reject(err);
    else settle.reject(new Error('handler called next() without a response'));
  });

  try {
    return await sent;
  } finally {
    clearTimeout(timeout);
  }
}

const getController = async (path) => (await import(path)).default;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET and POST /calculator/emi', () => {
  const loadHandler = async () => {
    const controller = await getController('../src/controllers/calculatorController.js');
    return controller.calculateEmiHandler;
  };

  it('reads inputs from the query string on GET', async () => {
    const body = await invoke(await loadHandler(), {
      method: 'GET',
      query: { principal: '500000', annualRate: '12', tenureYears: '3' },
      body: {},
    });

    expect(body.success).toBe(true);
    expect(body.data.emi).toBeCloseTo(16607.15, 2);
    expect(body.data.schedule).toHaveLength(36);
  });

  it('reads inputs from the JSON body on POST', async () => {
    // Regression: the handler read only `req.query`, so every POST silently
    // computed an EMI of 0 for a 0-amount "loan".
    const body = await invoke(await loadHandler(), {
      method: 'POST',
      query: {},
      body: { principal: 500000, annualRate: 12, tenureYears: 3 },
    });

    expect(body.success).toBe(true);
    expect(body.data.emi).toBeCloseTo(16607.15, 2);
    expect(body.data.schedule).toHaveLength(36);
  });

  it('agrees between the two verbs', async () => {
    const viaGet = await invoke(await loadHandler(), {
      method: 'GET',
      query: { principal: '750000', annualRate: '9.25', tenureYears: '20' },
      body: {},
    });
    const viaPost = await invoke(await loadHandler(), {
      method: 'POST',
      query: {},
      body: { principal: 750000, annualRate: 9.25, tenureYears: 20 },
    });

    expect(viaPost.data.emi).toBe(viaGet.data.emi);
    expect(viaPost.data.totalInterest).toBe(viaGet.data.totalInterest);
  });
});

/**
 * `statsModel.summary()` fans out to eight models through CommonJS `require`,
 * which Vite's ESM interop does not let a test replace reliably. These are
 * therefore integration tests against the project's MySQL database, asserting
 * the shape and the internal consistency of the aggregate rather than fixed
 * numbers. They skip cleanly when the database is not running.
 */
describe('GET /admin/stats (integration)', () => {
  let databaseAvailable = false;

  beforeAll(async () => {
    try {
      const db = (await import('../src/config/db.js')).default;
      await db.selectOne('SELECT 1 AS ok');
      databaseAvailable = true;
    } catch {
      databaseAvailable = false;
    }
  });

  /** Skip at run time: `beforeAll` has not run when the suite is collected. */
  const requiresDatabase = (ctx) => {
    if (databaseAvailable) return false;
    console.warn('  (skipped: MySQL is not reachable)');
    ctx.skip();
    return true;
  };

  it('returns a complete, internally consistent aggregate', async (ctx) => {
    if (requiresDatabase(ctx)) return;
    const { getStats } = await getController('../src/controllers/adminController.js');
    const body = await invoke(getStats, { query: {}, user: { id: 1, role: 'admin' } });

    expect(body.success).toBe(true);
    const stats = body.data;

    // Regression: a 500 here used to break every admin dashboard load.
    [
      'totalUsers',
      'activeUsers',
      'totalConversations',
      'totalMessages',
      'totalKnowledgeItems',
      'questionsToday',
    ].forEach((key) => {
      expect(typeof stats[key], key).toBe('number');
      expect(stats[key], key).toBeGreaterThanOrEqual(0);
    });

    // Every grouped AI-source row must survive the fold, for both engines.
    expect(stats.aiUsage).toHaveProperty('openai');
    expect(stats.aiUsage).toHaveProperty('offline_knowledge');
    expect(typeof stats.aiUsage.openai).toBe('number');
    expect(typeof stats.aiUsage.offline_knowledge).toBe('number');

    // The five knowledge categories are all present and add up to the total.
    const breakdown = stats.knowledgeBreakdown;
    ['loanTypes', 'terms', 'documents', 'eligibility', 'faqs'].forEach((key) => {
      expect(typeof breakdown[key], key).toBe('number');
    });
    const summed = Object.values(breakdown).reduce((total, value) => total + value, 0);
    expect(stats.totalKnowledgeItems).toBe(summed);

    // The AI block reads the exported service, not the module object.
    expect(typeof stats.ai.configured).toBe('boolean');
    expect(typeof stats.ai.model).toBe('string');
  });

  it('never queries a grouped statement through selectOne', async (ctx) => {
    if (requiresDatabase(ctx)) return;
    /*
     * Structural regression guard: the grouped `GROUP BY source` statement was
     * issued with `selectOne`, so `.forEach` ran on a single row.
     */
    const db = (await import('../src/config/db.js')).default;
    const originalSelectOne = db.selectOne;
    const offenders = [];

    db.selectOne = (sql, ...rest) => {
      if (/GROUP BY/i.test(sql)) offenders.push(sql);
      return originalSelectOne.call(db, sql, ...rest);
    };

    try {
      const { statsModel } = await import('../src/models/statsModel.js');
      await statsModel.summary();
    } finally {
      db.selectOne = originalSelectOne;
    }

    expect(offenders).toHaveLength(0);
  });
});
