import { z } from 'zod';

const configSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().default(4000),
  corsOrigin: z.string().default('http://localhost:3000'),
  frontendUrl: z.string().default('http://localhost:3000'),
  database: z.object({
    host: z.string().default('localhost'),
    port: z.coerce.number().default(5432),
    name: z.string().default('relay'),
    user: z.string().default('postgres'),
    password: z.string().default('postgres'),
  }),
  email: z.object({
    // Email provider: 'console' for dev, 'ses' for production
    provider: z.enum(['console', 'ses']).default('console'),
    // AWS SES configuration (only needed in production)
    sesRegion: z.string().default('us-east-1'),
    // From address for emails
    fromAddress: z.string().email().default('noreply@relayfunds.org'),
    fromName: z.string().default('Relay'),
  }),
});

const env = {
  nodeEnv: process.env['NODE_ENV'],
  port: process.env['PORT'],
  corsOrigin: process.env['CORS_ORIGIN'],
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
    sesRegion: process.env['AWS_SES_REGION'],
    fromAddress: process.env['EMAIL_FROM_ADDRESS'],
    fromName: process.env['EMAIL_FROM_NAME'],
  },
};

export const config = configSchema.parse(env);
