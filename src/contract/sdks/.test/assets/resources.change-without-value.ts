import { keyrack } from 'rhachet/keyrack';
import { genLogMethods, LogLevel } from 'sdk-logs';

// source aws credentials from keyrack
keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'lenient' });

import {
  DeclaredAwsSsmParameterSecure,
  getDeclastructAwsProvider,
} from '../../../../../dist/contract/sdks';

/**
 * .what = a MINIMAL wish that declares ONE write-only secret with NO value but a CHANGED
 *   description, at a name the acceptance test seeds beforehand with a DIFFERENT description —
 *   so `declastruct apply` must reach the keyId/description-change guard and fail loud.
 * .why = proves the second user-faced error path (a keyId/description change needs a value
 *   write, because aws re-encrypts a SecureString only on a value write) at the acceptance
 *   grain (blackbox via the CLI contract), per rule.forbid.friction-hazards.
 * .note = the acceptance beforeAll seeds this name with description 'original' + a value; this
 *   wish then declares description 'changed' + value undefined -> plan UPDATE -> apply fails
 *   loud. no value is ever written by this wish, so the seeded secret is untouched.
 */
export const getProviders = async () => [
  await getDeclastructAwsProvider(
    {},
    { log: genLogMethods({ level: { minimum: LogLevel.WARN } }) },
  ),
];

export const getResources = async () => [
  DeclaredAwsSsmParameterSecure.as({
    name: '/declastruct-acceptance/secure/change-without-value-guard',
    value: undefined, // NO value — a keyId/description change MUST fail loud
    keyId: null,
    description: 'changed description', // differs from the seeded 'original description'
    tags: null,
  }),
];
