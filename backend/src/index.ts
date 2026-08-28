import './env.js';
import { app } from './app.js';
import { config } from './config.js';
import { startInviteCleanup, stopInviteCleanup } from './services/invite-cleanup.service.js';

// Async route rejections are forwarded to the error handler by asyncRouter, so
// reaching here means something outside the request path failed - a background
// job, or a handler registered without asyncRouter. Log it loudly rather than
// letting Node terminate the process with no explanation, which is how an
// outage becomes undiagnosable after the fact.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

const server = app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);

  // Start periodic invite cleanup (10-min auto-delete, 7-day TTL expiry)
  startInviteCleanup();
});

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
