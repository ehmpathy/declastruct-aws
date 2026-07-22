import { keyrack } from 'rhachet/keyrack';
import { genLogMethods, LogLevel } from 'sdk-logs';

// source aws credentials from keyrack
keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'lenient' });

import {
  DeclaredAwsSsmParameterPlain,
  DeclaredAwsSsmParameterSecure,
  getDeclastructAwsProvider,
} from '../../../../../dist/contract/sdks';

/**
 * .what = a wish that declares a NEW value for a write-only secret (a rotate) AND a changed
 *   value for a plaintext param, at names the acceptance test seeds beforehand with OLD values —
 *   so `declastruct plan` reports UPDATE for both and `declastruct apply` succeeds.
 * .why = proves the POSITIVE twin of the change/create-without-value guards at the acceptance
 *   grain (blackbox via the CLI contract): a supplied value rotates the secret end-to-end through
 *   the real contract — the headline security journey (rotate without a plaintext read) this
 *   vision sells — plus the plain value-compare UPDATE, so the CLI-grain positive-update path is
 *   snapped, not only its error twins.
 * .note = the secret is write-only: a present value ALWAYS plans as UPDATE (plan cannot compare a
 *   value it never reads). the plain param is value-compare: old != new -> UPDATE. the acceptance
 *   beforeAll seeds both names with OLD values so both exist -> both plan UPDATE (not CREATE).
 */
export const getProviders = async () => [
  await getDeclastructAwsProvider(
    {},
    { log: genLogMethods({ level: { minimum: LogLevel.WARN } }) },
  ),
];

export const getResources = async () => [
  DeclaredAwsSsmParameterSecure.as({
    name: '/declastruct-acceptance/secure/rotate',
    value: 'rotate-new-secret', // a NEW value -> rotate -> UPDATE -> apply writes it
    keyId: null,
    description: null,
    tags: null,
  }),
  DeclaredAwsSsmParameterPlain.as({
    name: '/declastruct-acceptance/plain/rotate',
    value: 'rotate-new-plain', // a changed value -> value-compare UPDATE
    description: null,
    tags: null,
  }),
];
