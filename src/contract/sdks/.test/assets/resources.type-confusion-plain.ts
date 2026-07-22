import { keyrack } from 'rhachet/keyrack';
import { genLogMethods, LogLevel } from 'sdk-logs';

// source aws credentials from keyrack
keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'lenient' });

import {
  DeclaredAwsSsmParameterPlain,
  getDeclastructAwsProvider,
} from '../../../../../dist/contract/sdks';

/**
 * .what = a MINIMAL wish that declares a PLAIN (String) resource at a name the acceptance test
 *   seeds with a SecureString — so `declastruct plan` (which reads via getOneSsmParameterPlain)
 *   must reach the type-confusion guard and fail loud.
 * .why = proves the user-faced type-confusion error path (a Plain declared at a SecureString name
 *   would otherwise read the ciphertext as a value and let a later write DOWNGRADE the secret to
 *   plaintext) at the acceptance grain (blackbox via the CLI contract), per
 *   rule.forbid.friction-hazards. the guard fires at PLAN time, so the plan itself fails loud.
 * .note = the test seeds a SecureString at this name; this wish never writes, so the seed is
 *   untouched and is cleaned up by the test's afterAll.
 */
export const getProviders = async () => [
  await getDeclastructAwsProvider(
    {},
    { log: genLogMethods({ level: { minimum: LogLevel.WARN } }) },
  ),
];

export const getResources = async () => [
  DeclaredAwsSsmParameterPlain.as({
    name: '/declastruct-acceptance/type-confusion/plain-at-secure',
    value: 'info',
    description: 'declastruct acceptance type-confusion plain',
    tags: null,
  }),
];
