import { Router } from 'express';
import { z } from 'zod';
import {
  findUserByEmail,
  createMagicLinkToken,
  verifyMagicLinkToken,
  invalidateSession,
} from '../services/auth.service.js';
import { authenticate } from '../middleware/auth.js';
import { logLogin, logLogout } from '../services/audit.service.js';

export const authRouter = Router();

const loginRequestSchema = z.object({
  email: z.string().email().max(255),
});

const verifyTokenSchema = z.object({
  token: z.string().length(64),
});

// Request magic link
authRouter.post('/login', async (req, res) => {
  try {
    const { email } = loginRequestSchema.parse(req.body);

    const user = await findUserByEmail(email);

    if (!user) {
      // Don't reveal if user exists or not
      res.json({
        message: 'If an account exists with this email, a login link has been sent.',
      });
      return;
    }

    const token = await createMagicLinkToken(user.id);

    // TODO: Send email with magic link
    // For now, log it in development
    if (process.env['NODE_ENV'] !== 'production') {
      console.log(`Magic link token for ${email}: ${token}`);
      console.log(`Login URL: http://localhost:3000/auth/verify?token=${token}`);
    }

    res.json({
      message: 'If an account exists with this email, a login link has been sent.',
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid email address' });
      return;
    }
    throw err;
  }
});

// Verify magic link token and create session
authRouter.post('/verify', async (req, res) => {
  try {
    const { token } = verifyTokenSchema.parse(req.body);

    const result = await verifyMagicLinkToken(token);

    if (!result.success) {
      res.status(401).json({ error: result.error });
      return;
    }

    // Log successful login
    await logLogin(result.user!.id, req);

    res.json({
      user: {
        id: result.user!.id,
        email: result.user!.email,
        role: result.user!.role,
      },
      sessionToken: result.sessionToken,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid token format' });
      return;
    }
    throw err;
  }
});

// Get current user
authRouter.get('/me', authenticate, (req, res) => {
  const user = req.user!;

  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      hubId: user.hubId,
      groupId: user.groupId,
    },
  });
});

// Logout
authRouter.post('/logout', authenticate, async (req, res) => {
  await logLogout(req.user!.id, req);
  await invalidateSession(req.sessionToken!);

  res.json({ message: 'Logged out successfully' });
});
