import { useMutation } from '@apollo/client';
import { SaveSessionStateDocument } from '@/data/graphql/mutation/SessionState/mutation';
import { getAuthHeader } from '@/lib/utils/auth';

interface MigrationResult {
  success: boolean;
  migratedKeys: string[];
  errors: Array<{ key: string; error: string }>;
}

/**
 * Hook to migrate existing localStorage data to backend session state
 * Scans localStorage for keys matching the namespace pattern and syncs them to the backend
 * using Apollo Client for proper GraphQL communication
 */
export const useMigrateSessionState = () => {
  const [saveToBackend] = useMutation(SaveSessionStateDocument);

  const migrate = async (
    token: string,
    userId: string,
    namespace?: string,
    onProgress?: (current: number, total: number, key: string) => void,
  ): Promise<MigrationResult> => {
    const result: MigrationResult = {
      success: true,
      migratedKeys: [],
      errors: [],
    };

    const ns = namespace || 'ntlango:sessionstate';

    try {
      const keysToMigrate: Array<{ stateKey: string; value: any }> = [];

      for (let i = 0; i < localStorage.length; i++) {
        const fullKey = localStorage.key(i);
        if (!fullKey) continue;

        const pattern = new RegExp(`^${ns}:${userId}:(.+)$`);
        const match = fullKey.match(pattern);

        if (match) {
          const stateKey = match[1];
          const rawValue = localStorage.getItem(fullKey);

          if (rawValue) {
            try {
              const parsed = JSON.parse(rawValue);
              if (!parsed.expiresAt || parsed.expiresAt > Date.now()) {
                keysToMigrate.push({ stateKey, value: parsed.value });
              }
            } catch (error) {
              console.warn(`Failed to parse ${fullKey}`, error);
            }
          }
        }
      }

      for (let i = 0; i < keysToMigrate.length; i++) {
        const { stateKey, value } = keysToMigrate[i];
        onProgress?.(i + 1, keysToMigrate.length, stateKey);

        try {
          await saveToBackend({
            variables: {
              input: { key: stateKey, value, version: 1 },
            },
            context: { headers: getAuthHeader(token) },
          });
          result.migratedKeys.push(stateKey);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push({ key: stateKey, error: errorMessage });
          result.success = false;
        }
      }

      return result;
    } catch (error) {
      console.error('Migration failed', error);
      result.success = false;
      return result;
    }
  };

  return { migrate };
};
