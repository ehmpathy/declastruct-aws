import { given, then } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import { DeclaredAwsIamRolePolicy } from '../../domain.objects/DeclaredAwsIamRolePolicy';
import { getIamRolePolicy } from './getIamRolePolicy';
import { setIamRolePolicy } from './setIamRolePolicy';

describe('setIamRolePolicy', () => {
  const context = getSampleAwsApiContext();

  const testRoleName = 'declastruct-test-role';
  const testPolicyName = 'declastruct-test-policy';

  const policyDesired: DeclaredAwsIamRolePolicy = {
    name: testPolicyName,
    role: { name: testRoleName },
    statements: [
      {
        sid: 'AllowCloudWatchLogs',
        effect: 'Allow',
        action: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resource: 'arn:aws:logs:*:*:*',
      },
    ],
  };

  given('a role policy to create', () => {
    then('we should be able to finsert a policy', async () => {
      const policyAfter = await setIamRolePolicy(
        { finsert: policyDesired },
        context,
      );

      expect(policyAfter.name).toBe(testPolicyName);
      expect(policyAfter.role.name).toBe(testRoleName);
      // note: finsert returns existing policy if present, which may have more statements from previous upserts
      expect(policyAfter.statements.length).toBeGreaterThanOrEqual(1);
      console.log(policyAfter);
    });

    then('we should be able to get the policy we created', async () => {
      const policy = await getIamRolePolicy(
        {
          by: {
            unique: { role: { name: testRoleName }, name: testPolicyName },
          },
        },
        context,
      );

      expect(policy).not.toBeNull();
      expect(policy?.name).toBe(testPolicyName);
    });

    then('finsert should be idempotent', async () => {
      const policyAgain = await setIamRolePolicy(
        { finsert: policyDesired },
        context,
      );

      expect(policyAgain.name).toBe(testPolicyName);
    });

    then(
      'we should be able to upsert the policy with updated statements',
      async () => {
        const policyUpdated = await setIamRolePolicy(
          {
            upsert: {
              ...policyDesired,
              statements: [
                ...policyDesired.statements,
                {
                  sid: 'AllowS3Read',
                  effect: 'Allow',
                  action: 's3:GetObject',
                  resource: 'arn:aws:s3:::*/*',
                },
              ],
            },
          },
          context,
        );

        expect(policyUpdated.name).toBe(testPolicyName);
        expect(policyUpdated.statements).toHaveLength(2);
        console.log(policyUpdated);
      },
    );
  });
});
