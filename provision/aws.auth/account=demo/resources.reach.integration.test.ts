import { GetRoleCommand, IAMClient } from '@aws-sdk/client-iam';
import {
  AssumeRoleCommand,
  GetCallerIdentityCommand,
  STSClient,
} from '@aws-sdk/client-sts';
import { UnexpectedCodePathError } from 'helpful-errors';
import { given, then, useBeforeAll } from 'test-fns';

import { castIntoDeclaredAwsIamRole } from '@src/domain.operations/iamRole/castIntoDeclaredAwsIamRole';

import { getOneCampReachIdentityFromEnv } from './resources.reach';

/**
 * .what = the demo role a grove assumes, as the shell supplies it
 * .why = 🔴 it carries TWO loads, and both matter:
 *   - it OPTS IN. jest builds its whole tree before any async work runs, so a
 *     gate that reads the LIVE caller identity cannot be expressed there
 *   - it carries the arn, so the demo account id stays out of a PUBLIC git
 *     history — the same disclosure rule `resources.reach.ts` states
 * .note = ⚠️ it opts in; it does not assert. `[t0]` checks the ambient badge IS
 *   the camp grove role, so this var set off a grove goes RED, never green
 */
const targetRoleArn = process.env.GROVE_REACH_TARGET_ROLE_ARN ?? null;

/**
 * .what = whether the shell supplied every value this walk needs
 * .why = read at COLLECTION time, so `getOneCampReachIdentityFromEnv` is never
 *   called there — it throws on an absent var, and a throw at collection aborts
 *   the whole suite in cicd rather than declines this one walk
 */
const hasLiveReachEnv =
  !!targetRoleArn &&
  !!process.env.GROVE_REACH_CAMP_ACCOUNT_ID &&
  !!process.env.GROVE_REACH_CAMP_ROLE_NAME;

/**
 * .what = the caller half's role arn, composed from the two atoms in `.env`
 * .note = lazy on purpose. `describe.skip` still evaluates its body, so a call
 *   at the top of the gated block would throw in cicd
 */
const getOneCampGroveRoleArn = (): string => {
  const identity = getOneCampReachIdentityFromEnv();
  return `arn:aws:iam::${identity.campAccountId}:role/${identity.campGroveRoleName}`;
};

/**
 * .what = the `aws` principal of a trust statement, always as an array
 * .why = the field is `string | string[]`, so every assert would otherwise carry
 *   the same two-arm normalize a reader must simulate. `[t6]` pins which arm the
 *   live api actually returns
 */
const getAllPrincipalArns = (input: {
  principal: unknown;
}): (string | undefined)[] => {
  const aws = (input.principal as { aws?: string | string[] } | undefined)?.aws;
  return Array.isArray(aws) ? aws : [aws];
};

/**
 * .what = walks the WHOLE reach against live aws — a grove box's own badge
 *   assumes the demo reach role, and the session then reads the role it was
 *   issued against
 *
 * .why = 🔴 this is the one check no declaration test can stand in for. the
 *   reach is a PAIR of grants in two orgs' accounts, and a green apply on
 *   either side proves naught about it — the collaborator's own invariant says a
 *   half-wired reach fails at RUNTIME, never at apply time. so the only proof
 *   is a real `sts:AssumeRole` across the account boundary
 *
 * .why = it is the repo's only external-contract check on this reach, and its
 *   only walk of the real journey. that journey IS `case=1` `[t0]`-`[t2]` of
 *   the vision, run rather than sketched
 *
 * .note = 🔴 it runs ONLY where the shell supplies the three `GROVE_REACH_*`
 *   vars, which in practice is a camp grove box with `.env` sourced. the
 *   ambient badge must be the camp grove role, since that is the one principal
 *   our trust policy names — off a grove there is no badge to assume with
 *
 * .note = raw sdk is correct here. `sts:AssumeRole` mutates no resource — it is
 *   an auth READ, the same grain as `getIamRole`, so
 *   `rule.forbid.imperative-drive-in-acceptance-tests` does not reach it. there
 *   is no declarative primitive for "assume a role" because there is no
 *   resource to declare
 */
describe('resources.reach — the live reach', () => {
  const region = process.env.AWS_REGION ?? 'us-east-1';

  given.runIf(hasLiveReachEnv)(
    'a camp grove badge, and a target arn from the shell',
    () => {
      const caller = useBeforeAll(async () => {
        const sts = new STSClient({ region });
        return sts.send(new GetCallerIdentityCommand({}));
      });

      then('[t0] the ambient identity is the camp grove role', () => {
        // ⚠️ this is what keeps the opt-in var honest. the var states an
        //   intent; this states the fact, so the var set off a grove fails
        //   loud here rather than reports a false green further down
        const { campGroveRoleName } = getOneCampReachIdentityFromEnv();
        expect(caller?.Arn).toContain(`:assumed-role/${campGroveRoleName}/`);
      });

      given('the badge assumes the demo reach role', () => {
        const session = useBeforeAll(async () => {
          const identity = await caller;

          const sts = new STSClient({ region });
          return sts.send(
            new AssumeRoleCommand({
              RoleArn:
                targetRoleArn ??
                UnexpectedCodePathError.throw(
                  'GROVE_REACH_TARGET_ROLE_ARN is absent inside the gate that requires it',
                ),
              // .note = the instance id as session name, so cloudtrail can tell
              //   one grove box from another without a correlation hop
              RoleSessionName: identity?.Arn?.split('/').pop() ?? 'grove',
            }),
          );
        });

        then(
          '[t1] 🔴 the assume SUCCEEDS — both halves of the reach are live',
          () => {
            // this single assertion is the whole reach. it fails with
            // AccessDenied if EITHER half is absent: ours (the trust policy) or
            // theirs (the caller-side sts:AssumeRole grant in the grove role)
            expect(session?.Credentials?.AccessKeyId).toBeDefined();
            expect(session?.Credentials?.SecretAccessKey).toBeDefined();
            expect(session?.Credentials?.SessionToken).toBeDefined();
          },
        );

        then('[t2] the session principal is the demo reach role', () => {
          const targetRoleName = targetRoleArn?.split('/').pop();
          expect(session?.AssumedRoleUser?.Arn).toContain(
            `:assumed-role/${targetRoleName}/`,
          );
        });

        then('[t3] the session expires within the hour', () => {
          // `MaxSessionDuration` is the aws default of 1h and this repo declares
          // no field to raise it. the vision cites that bound four times, so it
          // is asserted rather than assumed
          const expiration = session?.Credentials?.Expiration;
          expect(expiration).toBeDefined();
          const secondsLeft =
            (new Date(expiration ?? 0).getTime() - Date.now()) / 1000;
          expect(secondsLeft).toBeGreaterThan(0);
          expect(secondsLeft).toBeLessThanOrEqual(3600);
        });

        given('the session reads the role it was issued against', () => {
          const role = useBeforeAll(async () => {
            const credentials =
              (await session)?.Credentials ??
              UnexpectedCodePathError.throw(
                'the assume returned no credentials, so there is no session to read with',
              );
            const iam = new IAMClient({
              region,
              credentials: {
                accessKeyId: credentials.AccessKeyId ?? '',
                secretAccessKey: credentials.SecretAccessKey ?? '',
                sessionToken: credentials.SessionToken ?? '',
              },
            });
            const response = await iam.send(
              new GetRoleCommand({
                RoleName: targetRoleArn?.split('/').pop() ?? '',
              }),
            );
            return castIntoDeclaredAwsIamRole(
              response.Role ??
                UnexpectedCodePathError.throw(
                  'GetRole returned no role for the arn the session was issued against',
                ),
            );
          });

          then('[t4] its trust policy holds EXACTLY one statement', () => {
            // the wish's acceptance row: the trust policy names the camp grove
            // role "and ONLY it". a second statement is a second party with a
            // reach into demo, and that is the shape this forbids
            expect(role?.policies).toHaveLength(1);
          });

          then('[t5] that statement allows sts:AssumeRole', () => {
            const action = role?.policies?.[0]?.action;
            const actions = Array.isArray(action) ? action : [action];
            expect(role?.policies?.[0]?.effect).toEqual('Allow');
            expect(actions).toEqual(['sts:AssumeRole']);
          });

          then(
            '[t6] its principal is the camp grove role our source declares',
            () => {
              // ⚠️ this asserts against the DECLARED identity, never against
              //   the caller that happened to assume. the two agree only when
              //   the applied trust policy is the one this repo declares, which
              //   is the bind worth a pin
              expect(
                getAllPrincipalArns({
                  principal: role?.policies?.[0]?.principal,
                }),
              ).toEqual([getOneCampGroveRoleArn()]);
            },
          );

          then(
            '[t7] 🔴 the `aws:` principal round-trips as a SCALAR, not an array',
            () => {
              // vision open question 8. we declare a scalar string; if aws hands
              // back an array, `castIntoDeclaredAwsIamPrincipal`'s passthrough
              // preserves it, the plan reads UPDATE forever, and `case=6`'s
              // all-KEEP claim is false.
              //
              // ⚠️ a failure here is a find in `src/`, never in this wish — it
              //   would reach every declared `aws:` trust policy this library
              //   serves, every consumer's alike
              const principal = role?.policies?.[0]?.principal as {
                aws?: string | string[];
              };
              expect(Array.isArray(principal?.aws)).toEqual(false);
              expect(typeof principal?.aws).toEqual('string');
            },
          );

          then('[t8] it carries the grove-reach ownership tags', () => {
            expect(role?.tags).toMatchObject({
              managedBy: 'declastruct',
              purpose: 'grove-reach',
            });
          });
        });
      });
    },
  );
});
