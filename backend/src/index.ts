import './env.js';
import { app } from './app.js';
import { config } from './config.js';
import { startInviteCleanup, stopInviteCleanup } from './services/invite-cleanup.service.js';

const server = app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);

  // Start periodic invite cleanup (10-min auto-delete, 7-day TTL expiry)
  startInviteCleanup();
});

/**
 * Log a fatal condition, then terminate.
 *
 * Terminating matters. Registering a listener on 'uncaughtException' replaces
 * Node's default of printing the error and exiting, so a listener that only
 * logs leaves the process alive in the undefined state Node warns about: a
 * throw unwound out of a transaction, a half-written response, a torn-down
 * pool. Since /api/health does not check any dependency, a supervisor would
 * keep routing traffic to that task forever. The point of these handlers is to
 * add a diagnosable trace to the crash, not to suppress it.
 */
function fatal(label: string, reason: unknown): void {
  console.error(`FATAL ${label}:`, reason);

  stopInviteCleanup();

  // Give in-flight responses a moment, but never hang: a process wedged during
  // shutdown is the same unrestarted-task problem in a different costume.
  const forced = setTimeout(() => process.exit(1), 5000);
  forced.unref();

  server.close(() => {
    clearTimeout(forced);
    process.exit(1);
  });
}

// Route rejections are forwarded to the error handler by asyncRouter, so
// anything reaching these came from outside the request path - a background job,
// or middleware registered directly on the app.
process.on('unhandledRejection', (reason) => fatal('unhandled promise rejection', reason));
process.on('uncaughtException', (err) => fatal('uncaught exception', err));

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  stopInviteCleanup();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  stopInviteCleanup();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Windows: tsx watch sends SIGHUP on restart, and exit when console closes
process.on('SIGHUP', () => {
  stopInviteCleanup();
  server.close(() => process.exit(0));
});

process.on('exit', () => {
  stopInviteCleanup();
});
