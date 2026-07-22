import { keyrack } from 'rhachet/keyrack';
import { genLogMethods, LogLevel } from 'sdk-logs';

// source aws credentials from keyrack
keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'lenient' });

import {
  DeclaredAwsSsmParameterSecure,
  getDeclastructAwsProvider,
} from '../../../../../dist/contract/sdks';

/**
 * .what = a MINIMAL wish that declares ONE write-only secret with NO value, at a name the
 *   acceptance test keeps absent — so `declastruct apply` must reach the create-without-value
 *   guard and fail loud through the real CLI.
 * .why = proves the user-faced create-without-value error path at the acceptance grain
 *   (blackbox via the CLI contract), per rule.forbid.friction-hazards. the integration test
 *   asserts only the thrown type; this proves the actual user experience end to end: plan
 *   reports CREATE, apply fails loud with the guard message.
 * .note = the name carries no seed and is deleted by the test's beforeAll, so a create is
 *   always forced. no resource is ever created (apply fails), so no cleanup is owed.
 */
export const getProviders = async () => [
  await getDeclastructAwsProvider(
    {},
    { log: genLogMethods({ level: { minimum: LogLevel.WARN } }) },
  ),
];

export const getResources = async () => [
  DeclaredAwsSsmParameterSecure.as({
    name: '/declastruct-acceptance/secure/create-without-value-guard',
    value: undefined, // NO value — a create MUST fail loud
    keyId: null,
    description: 'declastruct acceptance create-without-value guard',
    tags: null,
  }),
];
