import { z } from 'zod';

const configSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().default(4000),
  corsOrigin: z.string().default('http://localhost:3000'),
  database: z.object({
    host: z.string().default('localhost'),
    port: z.coerce.number().default(5432),
    name: z.string().default('relay'),
    user: z.string().default('postgres'),
    password: z.string().default('postgres'),
  }),
});

const env = {
  nodeEnv: process.env['NODE_ENV'],
  port: process.env['PORT'],
  corsOrigin: process.env['CORS_ORIGIN'],
  database: {
    host: process.env['DB_HOST'],
    port: process.env['DB_PORT'],
    name: process.env['DB_NAME'],
    user: process.env['DB_USER'],
    password: process.env['DB_PASSWORD'],
  },
};

export const config = configSchema.parse(env);
