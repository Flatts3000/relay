import { db } from './index.js';

/**
 * Either the pool-backed client or an open transaction.
 *
 * A function that writes a row belonging to work already in flight must accept
 * the caller's transaction. Using the outer `db` inside a transaction runs the
 * statement on a different pooled connection, which cannot see the uncommitted
 * rows - so a foreign key to one of them fails and the whole transaction rolls
 * back. That is what broke every onboarding accept flow (#52), and the same
 * shape was fixed for audit entries in #20.
 */
export type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
