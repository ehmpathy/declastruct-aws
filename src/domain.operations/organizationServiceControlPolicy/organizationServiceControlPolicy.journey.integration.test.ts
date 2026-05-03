import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import { DeclaredAwsIamPolicyDocument } from '@src/domain.objects/DeclaredAwsIamPolicyDocument';
import { DeclaredAwsIamPolicyStatement } from '@src/domain.objects/DeclaredAwsIamPolicyStatement';
import { DeclaredAwsOrganizationServiceControlPolicy } from '@src/domain.objects/DeclaredAwsOrganizationServiceControlPolicy';
import { getOneOrganization } from '@src/domain.operations/organization/getOneOrganization';
import { getOrganizationRootId } from '@src/domain.operations/organization/getOrganizationRootId';
import { getAllOrganizationAccounts } from '@src/domain.operations/organizationAccount/getAllOrganizationAccounts';

import { delOrganizationServiceControlPolicyAttachment } from '../organizationServiceControlPolicyAttachment/delOrganizationServiceControlPolicyAttachment';
import { getOneOrganizationServiceControlPolicyAttachment } from '../organizationServiceControlPolicyAttachment/getOneOrganizationServiceControlPolicyAttachment';
import { setOrganizationServiceControlPolicyAttachment } from '../organizationServiceControlPolicyAttachment/setOrganizationServiceControlPolicyAttachment';
import { delOrganizationServiceControlPolicy } from './delOrganizationServiceControlPolicy';
import { getOneOrganizationServiceControlPolicy } from './getOneOrganizationServiceControlPolicy';
import { setOrganizationServiceControlPolicy } from './setOrganizationServiceControlPolicy';

/**
 * .what = journey test for SCP + attachment lifecycle
 * .why = validates full workflow against real AWS Organizations API
 * .note
 *   - requires org management account credentials
 *   - creates and deletes test resources
 *   - tests idempotency and error cases
 *
 * .skip = organizations api requires management account credentials
 *   - test profile (ehmpathy.demo) is a member account
 *   - ListRoots returns AccessDeniedException from member accounts
 *   - verify via yalc in consumer repo with management account access
 */
describe.skip('organizationServiceControlPolicy.journey', () => {
  // generate unique name for this test run
  const testName = `declastruct-test-${genTestUuid().slice(0, 8)}`;

  // test SCP with a harmless deny statement
  const testPolicy = DeclaredAwsOrganizationServiceControlPolicy.as({
    name: testName,
    description: 'declastruct journey test policy',
    content: new DeclaredAwsIamPolicyDocument({
      statements: [
        new DeclaredAwsIamPolicyStatement({
          sid: 'DenyTestAction',
          effect: 'Deny',
          action: ['iam:CreateServiceLinkedRole'],
          resource:
            'arn:aws:iam::*:role/aws-service-role/nonexistent-service.test.amazonaws.com/*',
        }),
      ],
    }),
    tags: { managedBy: 'declastruct', purpose: 'test' },
  });

  // single useBeforeAll that does all dependent setup and returns all state
  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();

    // get the organization for root attachment tests
    const org = await getOneOrganization({ by: { auth: true } }, context);
    if (!org) throw new Error('no organization found');

    // get the org root id for attachment tests
    const orgRootId = await getOrganizationRootId(
      { by: { auth: true } },
      context,
    );
    if (!orgRootId) throw new Error('no organization root found');

    // get a target account for attachment tests
    const { accounts } = await getAllOrganizationAccounts(
      { by: { auth: true }, page: { limit: 5 } },
      context,
    );
    const targetAccount = accounts[0];
    if (!targetAccount) throw new Error('no accounts found in organization');

    // create the test policy
    const createdPolicy = await setOrganizationServiceControlPolicy(
      { findsert: testPolicy },
      context,
    );

    return { context, org, orgRootId, targetAccount, createdPolicy };
  });

  // cleanup after all tests
  afterAll(async () => {
    // only run cleanup if scene was set up successfully
    try {
      const { context } = scene;

      // attempt cleanup in case test failed partway
      const policy = await getOneOrganizationServiceControlPolicy(
        { by: { unique: { name: testName } } },
        context,
      );
      if (!policy) return; // no policy to cleanup

      // detach from org root first
      const orgRootId = await getOrganizationRootId(
        { by: { auth: true } },
        context,
      );
      const org = await getOneOrganization({ by: { auth: true } }, context);
      if (org) {
        await delOrganizationServiceControlPolicyAttachment(
          {
            by: {
              unique: {
                policy: { name: testName },
                target: { id: org.id },
              },
            },
          },
          context,
        ).catch((error) => {
          if (
            error instanceof Error &&
            error.name === 'PolicyNotAttachedException'
          )
            return;
          throw error;
        });
      }

      // detach from all accounts
      const { accounts } = await getAllOrganizationAccounts(
        { by: { auth: true } },
        context,
      );
      for (const account of accounts) {
        // ignore PolicyNotAttachedException — idempotent detach
        await delOrganizationServiceControlPolicyAttachment(
          {
            by: {
              unique: {
                policy: { name: testName },
                target: { id: account.id },
              },
            },
          },
          context,
        ).catch((error) => {
          if (
            error instanceof Error &&
            error.name === 'PolicyNotAttachedException'
          )
            return;
          throw error;
        });
      }
      // delete the policy
      await delOrganizationServiceControlPolicy(
        { by: { unique: { name: testName } } },
        context,
      );
    } catch {
      // scene may not have been initialized if setup failed
    }
  });

  given('[case1] SCP journey', () => {
    when('[t1] findsert SCP', () => {
      then('SCP is created with id and arn', async () => {
        const { createdPolicy } = scene;
        expect(createdPolicy.id).toMatch(/^p-[a-z0-9]+$/);
        expect(createdPolicy.arn).toContain(':policy/service_control_policy/');
        expect(createdPolicy.name).toBe(testName);
      });
    });

    when('[t2] attach to account', () => {
      then('attachment is created', async () => {
        const { context, targetAccount } = scene;
        const attachment = await setOrganizationServiceControlPolicyAttachment(
          {
            findsert: {
              policy: { name: testName },
              target: { id: targetAccount.id },
            },
          },
          context,
        );
        expect(attachment.policy.name).toBe(testName);
        expect((attachment.target as { id: string }).id).toBe(targetAccount.id);
      });
    });

    when('[t3] findsert SCP again', () => {
      then('returns same policy (idempotent)', async () => {
        const { context, createdPolicy } = scene;
        const policy = await setOrganizationServiceControlPolicy(
          { findsert: testPolicy },
          context,
        );
        expect(policy.id).toBe(createdPolicy.id);
      });
    });

    when('[t4] getOne by unique', () => {
      then('returns the SCP', async () => {
        const { context, createdPolicy } = scene;
        const policy = await getOneOrganizationServiceControlPolicy(
          { by: { unique: { name: testName } } },
          context,
        );
        expect(policy).not.toBeNull();
        expect(policy?.id).toBe(createdPolicy.id);
        expect(policy?.name).toBe(testName);
      });
    });

    when('[t5] getOne by primary', () => {
      then('returns the same SCP', async () => {
        const { context, createdPolicy } = scene;
        const policy = await getOneOrganizationServiceControlPolicy(
          { by: { primary: { id: createdPolicy.id } } },
          context,
        );
        expect(policy).not.toBeNull();
        expect(policy?.id).toBe(createdPolicy.id);
        expect(policy?.name).toBe(testName);
      });
    });

    when('[t6] getOne attachment', () => {
      then('returns the attachment', async () => {
        const { context, targetAccount } = scene;
        const attachment =
          await getOneOrganizationServiceControlPolicyAttachment(
            {
              by: {
                unique: {
                  policy: { name: testName },
                  target: { id: targetAccount.id },
                },
              },
            },
            context,
          );
        expect(attachment).not.toBeNull();
        expect(attachment?.policy.name).toBe(testName);
      });
    });

    when('[t6.5] attach to org root', () => {
      then('attachment is created for org root', async () => {
        const { context, org } = scene;
        const attachment = await setOrganizationServiceControlPolicyAttachment(
          {
            findsert: {
              policy: { name: testName },
              target: { id: org.id },
            },
          },
          context,
        );
        expect(attachment.policy.name).toBe(testName);
        expect((attachment.target as { id: string }).id).toBe(org.id);
      });
    });

    when('[t6.6] detach from org root', () => {
      then('attachment is removed from org root', async () => {
        const { context, org } = scene;
        const result = await delOrganizationServiceControlPolicyAttachment(
          {
            by: {
              unique: {
                policy: { name: testName },
                target: { id: org.id },
              },
            },
          },
          context,
        );
        expect(result).toEqual({ deleted: true });
      });
    });

    when('[t7] detach from account', () => {
      then('attachment is removed', async () => {
        const { context, targetAccount } = scene;
        const result = await delOrganizationServiceControlPolicyAttachment(
          {
            by: {
              unique: {
                policy: { name: testName },
                target: { id: targetAccount.id },
              },
            },
          },
          context,
        );
        expect(result).toEqual({ deleted: true });

        // verify attachment is gone
        const attachment =
          await getOneOrganizationServiceControlPolicyAttachment(
            {
              by: {
                unique: {
                  policy: { name: testName },
                  target: { id: targetAccount.id },
                },
              },
            },
            context,
          );
        expect(attachment).toBeNull();
      });
    });

    when('[t8] delete SCP', () => {
      then('SCP is removed', async () => {
        const { context } = scene;
        const result = await delOrganizationServiceControlPolicy(
          { by: { unique: { name: testName } } },
          context,
        );
        expect(result).toEqual({ deleted: true });
      });
    });

    when('[t9] getOne after delete', () => {
      then('returns null', async () => {
        const { context } = scene;
        const policy = await getOneOrganizationServiceControlPolicy(
          { by: { unique: { name: testName } } },
          context,
        );
        expect(policy).toBeNull();
      });
    });
  });
});
