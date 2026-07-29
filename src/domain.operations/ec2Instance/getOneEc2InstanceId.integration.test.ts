import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';

import { getOneEc2InstanceId } from './getOneEc2InstanceId';

/**
 * .what = integration coverage for the lean instance-id lookup against the REAL
 *         EC2 control plane (the communicator grain obligation per
 *         rule.require.test-coverage-by-grain)
 * .why = the mocked unit clamp (getOneEc2InstanceId.test.ts) proves the decode +
 *        degrade + collision logic in CI, but a communicator must ALSO be exercised
 *        against the real boundary to verify auth, connection, and the live
 *        DescribeInstances response shape. this file is that boundary test.
 * .note
 *   - gated out of CI via given.runIf(!process.env.CI) — the real EC2 read needs live
 *     creds the CI box lacks. runIf (not .skip) is the blessed gate per
 *     rule.forbid.skipped-tests; it runs locally with sourced creds.
 *   - read-only: it never creates an instance, so it incurs no charge and needs no
 *     both-ends cleanup. it reads the stable acceptance box + a definitely-absent exid.
 */
describe('getOneEc2InstanceId.integration', () => {
  const givenRealInfra = given.runIf(!process.env.CI);

  // the stable, persistent acceptance instance the ssh-key journey also references;
  // DescribeInstances returns it even when stopped, so the happy path is deterministic
  const instanceExidExtant = 'declastruct-acceptance-instance';

  givenRealInfra('a live box referenced by its unique exid', () => {
    const context = useBeforeAll(async () => await getSampleAwsApiContext());

    when('the id is looked up', () => {
      then(
        'it returns the live instance-id from the real control plane',
        async () => {
          const ref = await getOneEc2InstanceId(
            { by: { unique: { exid: instanceExidExtant } } },
            context,
          );
          expect(ref).not.toBeNull();
          expect(ref?.id).toMatch(/^i-[0-9a-f]+$/);
        },
      );
    });
  });

  givenRealInfra('an exid that matches no live box', () => {
    const context = useBeforeAll(async () => await getSampleAwsApiContext());

    when('the id is looked up', () => {
      then(
        'it degrades to null (real not-found response, never a throw)',
        async () => {
          const id = await getOneEc2InstanceId(
            { by: { unique: { exid: `absent-${genTestUuid()}` } } },
            context,
          );
          expect(id).toBeNull();
        },
      );
    });
  });
});
