import { Router, json } from 'express';
import { z } from 'zod';
import { broadcastCreationRateLimiter } from '../middleware/rate-limit.js';
import { createBroadcast } from '../services/broadcast.service.js';

export const broadcastsRouter = Router();

const BROADCAST_CATEGORIES = [
  'food',
  'shelter_housing',
  'transportation',
  'medical',
  'safety_escort',
  'childcare',
  'legal',
  'supplies',
  'other',
] as const;

const createBroadcastSchema = z.object({
  ciphertextPayload: z.string().min(1, 'Ciphertext is required'),
  nonce: z.string().min(1, 'Nonce is required'),
  region: z.string().min(1, 'Region is required').max(255),
  categories: z.array(z.enum(BROADCAST_CATEGORIES)).min(1, 'At least one category is required'),
  invites: z
    .array(
      z.object({
        groupId: z.string().uuid('Invalid group ID'),
        wrappedKey: z.string().min(1, 'Wrapped key is required'),
      })
    )
    .min(1, 'At least one invite is required'),
  // Bot protection
  honeypot: z.string().optional(),
  elapsed: z.number().optional(),
});

/**
 * POST /api/broadcasts
 * Create an anonymous encrypted broadcast.
 *
 * CRITICAL: No authentication, no cookies, no IP logging, no audit.
 * Body limit overridden to 64kb (encrypted payload can be larger than default 10kb).
 */
broadcastsRouter.post(
  '/',
  json({ limit: '64kb' }),
  broadcastCreationRateLimiter,
  async (req, res) => {
    const parsed = createBroadcastSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.issues.map((i) => i.message),
      });
      return;
    }

    // Bot protection: reject if honeypot is filled
    if (parsed.data.honeypot) {
      // Silently accept but don't process (looks like success to bots)
      res.status(201).json({ broadcastId: '00000000' });
      return;
    }

    // Bot protection: reject if form was submitted too fast
    if (parsed.data.elapsed !== undefined && parsed.data.elapsed < 2000) {
      res.status(201).json({ broadcastId: '00000000' });
      return;
    }

    const result = await createBroadcast({
      ciphertextPayload: parsed.data.ciphertextPayload,
      nonce: parsed.data.nonce,
      region: parsed.data.region,
      categories: [...parsed.data.categories],
      invites: parsed.data.invites,
    });

    res.status(201).json(result);
  }
);
