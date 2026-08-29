import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { getMyGroup } from '../api/groups';
import { decodeKey, deriveGroupKeypair, matchesRegisteredKey } from '../utils/group-key';

type UnlockResult = { ok: true } | { ok: false; reason: 'no-key' | 'wrong-passphrase' | 'failed' };

interface GroupKeyContextValue {
  /** The group's broadcast secret key, or null while locked. */
  secretKey: Uint8Array | null;
  isUnlocked: boolean;
  isUnlocking: boolean;
  unlock: (passphrase: string) => Promise<UnlockResult>;
  lock: () => void;
}

const GroupKeyContext = createContext<GroupKeyContextValue | null>(null);

/**
 * Holds an unlocked group key for the lifetime of the tab, in memory only.
 *
 * Deliberately not sessionStorage or localStorage. Coordinators work from shared
 * and borrowed machines, and a private key sitting in web storage survives the
 * tab, is readable by anything that can run script on the origin, and is exactly
 * the artefact the threat model says must not exist at rest. Holding it in a
 * React value means it dies on reload, on tab close, and on log out, and it
 * still spares the coordinator from retyping a passphrase for every request in
 * the inbox.
 */
export function GroupKeyProvider({ children }: { children: ReactNode }) {
  const [secretKey, setSecretKey] = useState<Uint8Array | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const unlock = useCallback(async (passphrase: string): Promise<UnlockResult> => {
    setIsUnlocking(true);
    try {
      const { group } = await getMyGroup();

      if (!group.keySalt || !group.broadcastPublicKey) {
        return { ok: false, reason: 'no-key' };
      }

      const keypair = await deriveGroupKeypair(passphrase, decodeKey(group.keySalt));

      // Checked against the registered public key rather than discovered at
      // unwrap time. A wrong passphrase derives a perfectly valid keypair, so
      // without this the only available message would be "could not decrypt",
      // which is indistinguishable from a corrupt invite.
      if (!matchesRegisteredKey(keypair, group.broadcastPublicKey)) {
        return { ok: false, reason: 'wrong-passphrase' };
      }

      setSecretKey(keypair.secretKey);
      return { ok: true };
    } catch {
      return { ok: false, reason: 'failed' };
    } finally {
      setIsUnlocking(false);
    }
  }, []);

  const lock = useCallback(() => setSecretKey(null), []);

  const value = useMemo(
    () => ({ secretKey, isUnlocked: secretKey !== null, isUnlocking, unlock, lock }),
    [secretKey, isUnlocking, unlock, lock]
  );

  return <GroupKeyContext.Provider value={value}>{children}</GroupKeyContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGroupKey(): GroupKeyContextValue {
  const ctx = useContext(GroupKeyContext);
  if (!ctx) {
    throw new Error('useGroupKey must be used within a GroupKeyProvider');
  }
  return ctx;
}
