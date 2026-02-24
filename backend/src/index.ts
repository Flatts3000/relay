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
