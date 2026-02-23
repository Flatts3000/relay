import { eq, and, isNotNull, isNull, ilike, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { groups } from '../db/schema/groups.js';

export interface DirectoryEntry {
  id: string;
  name: string;
  serviceArea: string;
  broadcastCategories: string[] | null;
  publicKey: string; // base64
  broadcastServiceArea: string | null;
}

/**
 * Get directory entries for groups that can receive broadcasts.
 * Only returns verified groups with a public key set.
 * Optionally filtered by region and/or categories.
 *
 * CRITICAL: This is a public, anonymous endpoint. No auth required.
 */
export async function getDirectoryEntries(
  region?: string,
  categories?: string[]
): Promise<DirectoryEntry[]> {
  const conditions = [
    eq(groups.verificationStatus, 'verified'),
    isNotNull(groups.publicKey),
    isNull(groups.deletedAt),
  ];

  if (region) {
    conditions.push(eq(groups.broadcastServiceArea, region));
  }

  const results = await db
    .select({
      id: groups.id,
      name: groups.name,
      serviceArea: groups.serviceArea,
      broadcastCategories: groups.broadcastCategories,
      publicKey: groups.publicKey,
      broadcastServiceArea: groups.broadcastServiceArea,
    })
    .from(groups)
    .where(and(...conditions));

  // Filter by categories in application layer (array overlap)
  let filtered = results;
  if (categories && categories.length > 0) {
    filtered = results.filter((entry) => {
      if (!entry.broadcastCategories) return false;
      return entry.broadcastCategories.some((cat) => categories.includes(cat));
    });
  }

  return filtered.map((entry) => ({
    id: entry.id,
    name: entry.name,
    serviceArea: entry.serviceArea,
    broadcastCategories: entry.broadcastCategories,
    publicKey: entry.publicKey ? entry.publicKey.toString('base64') : '',
    broadcastServiceArea: entry.broadcastServiceArea,
  }));
}

/**
 * Public directory entry — visible to anyone without authentication.
 * Shows only what groups opt to make public.
 */
export interface PublicDirectoryEntry {
  id: string;
  name: string;
  serviceArea: string;
  aidCategories: string[];
  contactEmail: string;
}

/**
 * Get public directory entries for verified groups.
 * No publicKey requirement (unlike broadcast directory).
 * Searchable by name/serviceArea, filterable by aidCategory.
 *
 * CRITICAL: Public, anonymous endpoint. No auth, no cookies, no tracking.
 */
export async function getPublicDirectoryEntries(
  search?: string,
  category?: string
): Promise<PublicDirectoryEntry[]> {
  const conditions = [eq(groups.verificationStatus, 'verified'), isNull(groups.deletedAt)];

  if (search) {
    conditions.push(
      sql`(${ilike(groups.name, `%${search}%`)} OR ${ilike(groups.serviceArea, `%${search}%`)})`
    );
  }

  if (category) {
    conditions.push(sql`${category} = ANY(${groups.aidCategories})`);
  }

  const results = await db
    .select({
      id: groups.id,
      name: groups.name,
      serviceArea: groups.serviceArea,
      aidCategories: groups.aidCategories,
      contactEmail: groups.contactEmail,
    })
    .from(groups)
    .where(and(...conditions))
    .orderBy(groups.name);

  return results.map((entry) => ({
    id: entry.id,
    name: entry.name,
    serviceArea: entry.serviceArea,
    aidCategories: entry.aidCategories,
    contactEmail: entry.contactEmail,
  }));
}
