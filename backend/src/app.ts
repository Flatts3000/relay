import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { requestId } from './middleware/request-id.js';
import { authRateLimiter, authLoginRateLimiter } from './middleware/rate-limit.js';
import { auditMiddleware } from './middleware/audit.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { groupsRouter } from './routes/groups.js';
import { verificationRouter } from './routes/verification.js';
import { requestsRouter } from './routes/requests.js';
import { reportsRouter } from './routes/reports.js';
import { mailboxRouter } from './routes/mailbox.js';
import { broadcastsRouter } from './routes/broadcasts.js';
import { directoryRouter } from './routes/directory.js';
import { invitesRouter } from './routes/invites.js';
import { helpRequestsRouter } from './routes/help-requests.js';
import { adminRouter } from './routes/admin.js';
import { onboardingRouter } from './routes/onboarding.js';

export const app = express();

// How many reverse proxy hops sit in front of this process, so req.ip is the
// real client rather than the proxy. Without it, req.ip was Caddy's container
// address for every request on earth and every limiter keyed on it shared one
// global bucket: a noisy client locked out everybody, and no attacker was ever
// individually limited.
//
// Configured, not hardcoded, and never `true`. Trusting a hop that is not there
// is the same bug in reverse - a client connecting directly can send their own
// X-Forwarded-For and pick their own bucket - and the root docker-compose.yml
// publishes this port directly with no proxy at all. Production sets
// TRUST_PROXY_HOPS=1 for Caddy; everything else defaults to 0.
app.set('trust proxy', config.trustProxyHops);

// NOTE: middleware registered directly on `app` below is NOT wrapped by
// asyncRouter, which only covers the route modules. Express 4 does not forward
// rejected promises from async middleware, so an async function registered here
// that rejects will send no response and take the process down. Keep app-level
// middleware synchronous; anything that needs to await belongs in a route
// module, or the stack needs mounting through asyncRouter(). See async-router.ts.

// Request ID for tracing (must be early in middleware chain)
app.use(requestId);

// Security middleware with strict CSP
// CRITICAL: No external scripts, fonts, or CDNs allowed for privacy
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for some CSS-in-JS
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    dnsPrefetchControl: { allow: false },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  })
);
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10kb' }));

// Request logging
app.use(requestLogger);

// ANONYMOUS ROUTES - NO rate limiting, NO logging, NO audit
// These routes have their own privacy-preserving rate limiting
app.use('/api/mailbox', mailboxRouter);
app.use('/api/broadcasts', broadcastsRouter);
app.use('/api/directory', directoryRouter);

// Rate limiting for authenticated routes (excludes anonymous routes above)
app.use(authRateLimiter);

// Audit middleware for authenticated routes
// CRITICAL: Applied AFTER mailbox routes to ensure no audit on anonymous routes
app.use(auditMiddleware);

// Health check (no auth required)
app.use('/api/health', healthRouter);

// Auth routes (with stricter rate limiting)
app.use('/api/auth', authLoginRateLimiter, authRouter);

// Authenticated routes
app.use('/api/groups', groupsRouter);
app.use('/api/verification', verificationRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/help-requests', helpRequestsRouter);
app.use('/api/invites', invitesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/onboarding', onboardingRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use(errorHandler);
