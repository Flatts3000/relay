import dotenv from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load root .env — cwd is backend/ in monorepo workspace, so resolve up
dotenv.config({ path: resolve(__dirname, '../../.env') });
