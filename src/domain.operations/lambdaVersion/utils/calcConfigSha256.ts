import { createHash } from 'crypto';

import type { DeclaredAwsLambda } from '../../../domain.objects/DeclaredAwsLambda';

/**
 * .what = the config fields used to compute the sha256 hash
 * .why = only config-relevant fields should affect the hash, not code or metadata
 */
export type DeclaredAwsLambdaConfigFields = Pick<
  DeclaredAwsLambda,
  'handler' | 'runtime' | 'memory' | 'timeout' | 'role' | 'envars'
>;

/**
 * .what = computes sha256 hash of lambda configuration
 * .why = aws does not expose config hash; we compute it for version identity
 *
 * .includes
 *   - Handler, Runtime, MemorySize, Timeout
 *   - Environment.Variables, Role
 *
 * .note
 *   - configSha256 is part of version unique key
 *   - deterministic ordering via sorted keys
 */
export const calcConfigSha256 = (input: {
  of: DeclaredAwsLambdaConfigFields;
}): string => {
  // build config state from locked attributes
  const configState = {
    handler: input.of.handler,
    runtime: input.of.runtime,
    memorySize: input.of.memory,
    timeout: input.of.timeout,
    role: input.of.role,
    envars: input.of.envars,
  };

  // recursively sort keys for deterministic hashing
  const sortedJson = JSON.stringify(configState, (_, value) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.keys(value)
          .sort()
          .reduce(
            (sorted, key) => {
              sorted[key] = value[key];
              return sorted;
            },
            {} as Record<string, unknown>,
          )
      : value,
  );

  // compute sha256 hash
  return createHash('sha256').update(sortedJson).digest('base64');
};
