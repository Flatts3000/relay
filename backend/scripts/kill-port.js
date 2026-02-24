/**
 * Kill any process occupying the backend port before starting dev server.
 * Prevents EADDRINUSE on Windows where Ctrl+C doesn't always clean up child processes.
 */
import { execSync } from 'node:child_process';
import { createServer } from 'node:net';

const PORT = process.env.PORT || 4000;

const server = createServer();

server.once('listening', () => {
  // Port is free, nothing to do
  server.close();
});

server.once('error', (err) => {
  if (err.code !== 'EADDRINUSE') return;

  console.log(`[predev] Port ${PORT} is in use, killing stale process...`);

  try {
    const output = execSync('netstat -ano', { encoding: 'utf8' });
    const regex = new RegExp(`TCP\\s+\\S+:${PORT}\\s+\\S+\\s+LISTENING\\s+(\\d+)`);
    const match = output.match(regex);

    if (match) {
      const pid = Number(match[1]);
      process.kill(pid, 'SIGTERM');
      console.log(`[predev] Killed PID ${pid}`);
    }
  } catch {
    // Process may have already exited
  }
});

server.listen(PORT);
