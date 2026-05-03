import { given, then, when } from 'test-fns';

import { DeclaredAwsOrganizationServiceControlPolicy } from './DeclaredAwsOrganizationServiceControlPolicy';

describe('DeclaredAwsOrganizationServiceControlPolicy', () => {
  given('a valid policy name and content', () => {
    when('instantiated', () => {
      let policy: DeclaredAwsOrganizationServiceControlPolicy;

      then('it should instantiate', () => {
        policy = new DeclaredAwsOrganizationServiceControlPolicy({
          name: 'deny-dangerous-actions',
          description: 'block exfiltration and audit tamper',
          content: {
            statements: [
              {
                sid: 'DenySnapshotShare',
                effect: 'Deny',
                action: 'rds:ModifyDBSnapshotAttribute',
                resource: '*',
              },
            ],
          },
          tags: null,
        });
      });

      then('it should have the name', () => {
        expect(policy).toMatchObject({ name: 'deny-dangerous-actions' });
      });

      then('it should have the description', () => {
        expect(policy.description).toBe('block exfiltration and audit tamper');
      });

      then('metadata is undefined by default', () => {
        expect(policy.id).toBeUndefined();
        expect(policy.arn).toBeUndefined();
      });
    });
  });

  given('all properties provided', () => {
    when('instantiated with metadata and tags', () => {
      let policy: DeclaredAwsOrganizationServiceControlPolicy;

      then('it should instantiate', () => {
        policy = new DeclaredAwsOrganizationServiceControlPolicy({
          id: 'p-12345678',
          arn: 'arn:aws:organizations::123456789012:policy/o-abc123/service_control_policy/p-12345678',
          name: 'deny-dangerous-actions',
          description: 'block exfiltration and audit tamper',
          content: {
            statements: [
              {
                sid: 'DenySnapshotShare',
                effect: 'Deny',
                action: [
                  'rds:ModifyDBSnapshotAttribute',
                  'rds:ModifyDBClusterSnapshotAttribute',
                  'ec2:ModifySnapshotAttribute',
                ],
                resource: '*',
              },
              {
                sid: 'DenyAuditTamper',
                effect: 'Deny',
                action: ['cloudtrail:DeleteTrail', 'cloudtrail:StopLogging'],
                resource: '*',
              },
            ],
          },
          tags: { environment: 'prod', managedBy: 'declastruct' },
        });
      });

      then('it should have all properties', () => {
        expect(policy).toMatchObject({
          id: 'p-12345678',
          arn: 'arn:aws:organizations::123456789012:policy/o-abc123/service_control_policy/p-12345678',
          name: 'deny-dangerous-actions',
          description: 'block exfiltration and audit tamper',
          tags: { environment: 'prod', managedBy: 'declastruct' },
        });
        expect(policy.content.statements).toHaveLength(2);
      });
    });
  });

  given('null optional fields', () => {
    when('instantiated with null description and tags', () => {
      let policy: DeclaredAwsOrganizationServiceControlPolicy;

      then('it should instantiate', () => {
        policy = new DeclaredAwsOrganizationServiceControlPolicy({
          name: 'allow-all',
          description: null,
          content: {
            statements: [
              {
                effect: 'Allow',
                action: '*',
                resource: '*',
              },
            ],
          },
          tags: null,
        });
      });

      then('description is null', () => {
        expect(policy.description).toBeNull();
      });

      then('tags is null', () => {
        expect(policy.tags).toBeNull();
      });
    });
  });

  given('the static keys', () => {
    then('primary is defined as id', () => {
      expect(DeclaredAwsOrganizationServiceControlPolicy.primary).toEqual([
        'id',
      ]);
    });

    then('unique is defined as name', () => {
      expect(DeclaredAwsOrganizationServiceControlPolicy.unique).toEqual([
        'name',
      ]);
    });

    then('metadata is defined as id and arn', () => {
      expect(DeclaredAwsOrganizationServiceControlPolicy.metadata).toEqual([
        'id',
        'arn',
      ]);
    });

    then('readonly is empty', () => {
      expect(DeclaredAwsOrganizationServiceControlPolicy.readonly).toEqual([]);
    });
  });
});
