import { sql } from 'drizzle-orm';
import { asyncRouter } from '../utils/async-router.js';
import { db } from '../db/index.js';

export const healthRouter = asyncRouter();

/**
 * Liveness. Deliberately checks nothing but the process being able to answer.
 *
 * This is what the container healthcheck in deploy/docker-compose.prod.yml
 * polls, so it must not depend on the database: a brief connection blip should
 * not cause the orchestrator to restart an otherwise healthy process, which
 * turns a short outage into a restart loop.
 *
 * Because it proves so little, never treat a 200 here as evidence the API
 * works. Use /api/health/ready for that.
 */
healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness. Answers the question liveness cannot: can this instance actually
 * serve a request that touches the database?
 *
 * Every route in this application except liveness needs the database, so an
 * instance that cannot reach it is not serving anything useful even though the
 * process is alive. This is the endpoint an uptime check or a deploy
 * verification step should watch.
 */
/** A readiness check that hangs is a readiness check that failed. */
const READINESS_TIMEOUT_MS = 2000;

healthRouter.get('/ready', async (_req, res) => {
  try {
    // connectionTimeoutMillis in db/index.ts bounds only acquiring a connection.
    // Once one is checked out, a server that accepts the socket but stops
    // answering - a partition with no RST, a Postgres stuck in recovery - would
    // leave this pending forever, never reaching the catch below, while holding
    // a pool connection. A monitor polling on an interval would then exhaust the
    // 20-connection pool and starve real traffic. Bound it explicitly.
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Readiness query exceeded ${READINESS_TIMEOUT_MS}ms`)),
        READINESS_TIMEOUT_MS
      );
    });

    try {
      await Promise.race([db.execute(sql`SELECT 1`), timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }

    res.json({
      status: 'ok',
      database: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    // Logged rather than returned. The reason can name the host, database and
    // user, and this endpoint is unauthenticated.
    console.error('Readiness check failed:', err);

    res.status(503).json({
      status: 'unavailable',
      database: 'unavailable',
      timestamp: new Date().toISOString(),
    });
  }
});
