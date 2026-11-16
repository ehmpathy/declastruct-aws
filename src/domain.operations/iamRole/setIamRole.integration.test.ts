import { given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import type { DeclaredAwsIamRole } from '@src/domain.objects/DeclaredAwsIamRole';

import { getIamRole } from './getIamRole';
import { setIamRole } from './setIamRole';

describe('setIamRole', () => {
  const context = useBeforeAll(() => getSampleAwsApiContext());

  const testRoleName = 'declastruct-test-role';

  const roleDesired: Omit<DeclaredAwsIamRole, 'arn'> = {
    name: testRoleName,
    path: '/',
    description: 'Test role for declastruct integration tests',
    policies: [
      {
        effect: 'Allow',
        principal: { service: 'lambda.amazonaws.com' },
        action: 'sts:AssumeRole',
        // note: no resource field - assume role policies must not have Resource
      },
    ],
    tags: { environment: 'test', managedBy: 'declastruct' },
  };

  given('[case1] a role to create', () => {
    then('we should be able to findsert a role', async () => {
      const roleAfter = await setIamRole({ findsert: roleDesired }, context);

      expect(roleAfter.name).toBe(testRoleName);
      expect(roleAfter.arn).toContain('arn:aws:iam::');
      expect(roleAfter.arn).toContain(`:role/${testRoleName}`);
      console.log(roleAfter);
    });

    then('we should be able to get the role we created', async () => {
      const role = await getIamRole(
        { by: { unique: { name: testRoleName } } },
        context,
      );

      expect(role).not.toBeNull();
      expect(role?.name).toBe(testRoleName);
    });

    then('findsert should be idempotent', async () => {
      const roleAgain = await setIamRole({ findsert: roleDesired }, context);

      expect(roleAgain.name).toBe(testRoleName);
    });

    then('we should be able to upsert the role with updated tags', async () => {
      const roleUpdated = await setIamRole(
        {
          upsert: {
            ...roleDesired,
            tags: {
              environment: 'test',
              managedBy: 'declastruct',
              updated: 'true',
            },
          },
        },
        context,
      );

      expect(roleUpdated.name).toBe(testRoleName);
      console.log(roleUpdated);
    });
  });

  given('[case2] a trust that admits roles anywhere sessions', () => {
    // the trust shape `ehmpathy-demo-for-grove` declares. the planner compares
    // shape and order, so a re-plan reads KEEP only if iam echoes the action
    // array in declared order; this reads a live one back before any apply
    // leans on it
    const multiActionRoleName = 'declastruct-test-role-multi-action-trust';
    const actionDeclared = [
      'sts:AssumeRole',
      'sts:TagSession',
      'sts:SetSourceIdentity',
    ];

    when('[t0] the role is upserted and read back', () => {
      const scene = useBeforeAll(async () => {
        await setIamRole(
          {
            upsert: {
              name: multiActionRoleName,
              path: '/',
              description: 'Test role: a trust with a multi-action array',
              policies: [
                {
                  effect: 'Allow',
                  principal: {
                    aws: `arn:aws:iam::${context.aws.credentials.account}:root`,
                  },
                  action: actionDeclared,
                },
              ],
              tags: { environment: 'test', managedBy: 'declastruct' },
            },
          },
          context,
        );
        const role = await getIamRole(
          { by: { unique: { name: multiActionRoleName } } },
          context,
        );
        return { role };
      });

      then('iam echoes the three actions back in declared order', () => {
        expect(scene.role?.policies).toHaveLength(1);
        expect(scene.role?.policies[0]?.action).toEqual(actionDeclared);
      });
    });
  });
});
