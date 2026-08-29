// Load the root .env before anything reads process.env. This lives here
// rather than only in index.ts because every entry point that skips the
// server - the seed scripts, drizzle helpers, one-off tsx scripts - imports
// config directly, and without this they silently fall back to the schema
// defaults and connect to the wrong database.
import './env.js';
import { z } from 'zod';

const configSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().default(4000),
  corsOrigin: z.string().default('http://localhost:3000'),
  // Number of reverse proxy hops in front of this process, used for trust proxy.
  // Defaults to 0: trusting a hop that is not there lets a direct client forge
  // X-Forwarded-For and choose their own rate limit bucket. Production sets 1
  // for Caddy; the root docker-compose publishes the backend directly and must
  // stay at 0.
  trustProxyHops: z.coerce.number().int().min(0).default(0),
  // Requests per 15 minutes to /api/auth/login and to /verify, counted
  // separately, keyed on the client address. Configurable so the test suite can
  // exercise the login flow without tripping a production-shaped limit.
  //
  // The preprocess matters: z.coerce.number() turns '' into 0, which fails
  // positive() and throws at import time - so a blank value in .env.prod would
  // stop the backend booting and Compose would restart it in a loop. An empty
  // value should mean "unset".
  authLoginRateLimitMax: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : v),
    z.coerce.number().int().positive().default(10)
  ),
  // Requests per 15 minutes to every non-health API route, keyed on the client
  // address. Same preprocess rationale as the login limit above.
  //
  // 100 was too low to use the product with. AuthContext calls /api/auth/me on
  // every mount, so each navigation costs at least two requests, and the budget
  // is per address - which for this user base means per shelter, per library,
  // per mobile carrier NAT, as the login limiter's own comment notes. Paging
  // through the app during a UX review tripped it and locked the session out
  // mid-run. 600 still bounds abuse at 40 requests a minute sustained while
  // leaving room for several people working from one address.
  apiRateLimitMax: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : v),
    z.coerce.number().int().positive().default(600)
  ),
  // How many invites every broadcast is padded up to, with decoys.
  //
  // The row count for a broadcast is otherwise the number of groups that matched
  // its region and categories, readable by anyone holding the database - a dump,
  // a backup, an operator, a subpoena. In an area served by one group it names
  // the recipient.
  //
  // Padding is up to this floor and never truncates: dropping a real recipient
  // would mean a person's request silently not reaching a group that serves
  // them, which is far worse than the count leaking. Set to 0 to disable.
  padInvitesTo: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : v),
    z.coerce.number().int().min(0).default(8)
  ),
  // Broadcasts per hour from one address. Configurable for the same reason the
  // login limit is: the suite has to exercise this path more than five times to
  // test what padding does across several submissions, and a production-shaped
  // limit would make those tests assert 429s instead of behaviour.
  broadcastRateLimitMax: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : v),
    z.coerce.number().int().positive().default(5)
  ),
  frontendUrl: z.string().default('http://localhost:3000'),
  database: z.object({
    host: z.string().default('localhost'),
    port: z.coerce.number().default(5432),
    name: z.string().default('relay'),
    user: z.string().default('postgres'),
    password: z.string().default('postgres'),
  }),
  email: z.object({
    // Email provider: 'console' for dev, 'resend' for early prod, 'ses' for production
    provider: z.enum(['console', 'resend', 'ses']).default('console'),
    // Resend API key (only needed when provider is 'resend')
    resendApiKey: z.string().default(''),
    // AWS SES configuration (only needed when provider is 'ses')
    sesRegion: z.string().default('us-east-1'),
    // From address for emails
    fromAddress: z.string().email().default('noreply@relayfunds.org'),
    fromName: z.string().default('Relay'),
  }),
  // Comma-separated list of emails allowed to log in as staff_admin
  staffAdminEmails: z.string().default(''),
});

const env = {
  nodeEnv: process.env['NODE_ENV'],
  port: process.env['PORT'],
  corsOrigin: process.env['CORS_ORIGIN'],
  trustProxyHops: process.env['TRUST_PROXY_HOPS'],
  authLoginRateLimitMax: process.env['AUTH_LOGIN_RATE_LIMIT_MAX'],
  apiRateLimitMax: process.env['API_RATE_LIMIT_MAX'],
  padInvitesTo: process.env['PAD_INVITES_TO'],
  broadcastRateLimitMax: process.env['BROADCAST_RATE_LIMIT_MAX'],
  frontendUrl: process.env['FRONTEND_URL'],
  database: {
    host: process.env['DB_HOST'],
    port: process.env['DB_PORT'],
    name: process.env['DB_NAME'],
    user: process.env['DB_USER'],
    password: process.env['DB_PASSWORD'],
  },
  email: {
    provider: process.env['EMAIL_PROVIDER'],
    resendApiKey: process.env['RESEND_API_KEY'],
    sesRegion: process.env['AWS_SES_REGION'],
    fromAddress: process.env['EMAIL_FROM_ADDRESS'],
    fromName: process.env['EMAIL_FROM_NAME'],
  },
  staffAdminEmails: process.env['STAFF_ADMIN_EMAILS'],
};

export const config = configSchema.parse(env);
