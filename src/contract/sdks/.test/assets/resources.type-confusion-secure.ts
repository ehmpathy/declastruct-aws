import { keyrack } from 'rhachet/keyrack';
import { genLogMethods, LogLevel } from 'sdk-logs';

// source aws credentials from keyrack
keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'lenient' });

import {
  DeclaredAwsSsmParameterSecure,
  getDeclastructAwsProvider,
} from '../../../../../dist/contract/sdks';

/**
 * .what = a MINIMAL wish that declares a SECURE (SecureString) resource at a name the acceptance
 *   test seeds with a plaintext String — so `declastruct plan` (which reads via
 *   getOneSsmParameterSecure) must reach the type-confusion guard and fail loud.
 * .why = proves the user-faced type-confusion error path (a Secure declared at a String name
 *   would otherwise misroute a non-secret into the write-only flow) at the acceptance grain
 *   (blackbox via the CLI contract), per rule.forbid.friction-hazards. the guard fires at PLAN
 *   time, so the plan itself fails loud.
 * .note = the test seeds a String at this name; this wish never writes, so the seed is untouched
 *   and is cleaned up by the test's afterAll.
 */
export const getProviders = async () => [
  await getDeclastructAwsProvider(
    {},
    { log: genLogMethods({ level: { minimum: LogLevel.WARN } }) },
  ),
];

export const getResources = async () => [
  DeclaredAwsSsmParameterSecure.as({
    name: '/declastruct-acceptance/type-confusion/secure-at-plain',
    value: undefined,
    keyId: null,
    description: 'declastruct acceptance type-confusion secure',
    tags: null,
  }),
];
