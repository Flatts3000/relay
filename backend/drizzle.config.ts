// Load the root .env first. Without it drizzle-kit read nothing but its own
// fallbacks and quietly pointed at localhost:5432/relay, so `npm run
// db:migrate` either failed to authenticate or, worse, migrated whatever
// unrelated database happened to be listening there.
import './src/env.js';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env['DB_HOST'] ?? 'localhost',
    port: Number(process.env['DB_PORT'] ?? 5432),
    user: process.env['DB_USER'] ?? 'postgres',
    password: process.env['DB_PASSWORD'] ?? 'postgres',
    database: process.env['DB_NAME'] ?? 'relay',
    ssl: process.env['DB_SSL'] === 'true',
  },
  verbose: true,
  strict: true,
});
