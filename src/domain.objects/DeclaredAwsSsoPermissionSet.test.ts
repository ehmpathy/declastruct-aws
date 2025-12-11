import { given, then, when } from 'test-fns';

import { DeclaredAwsIamPolicyBundle } from './DeclaredAwsIamPolicyBundle';
import { DeclaredAwsIamPolicyDocument } from './DeclaredAwsIamPolicyDocument';
import { DeclaredAwsSsoPermissionSet } from './DeclaredAwsSsoPermissionSet';

describe('DeclaredAwsSsoPermissionSet', () => {
  given('a valid permission set', () => {
    when('instantiated with minimal properties', () => {
      let permissionSet: DeclaredAwsSsoPermissionSet;

      then('it should instantiate', () => {
        permissionSet = new DeclaredAwsSsoPermissionSet({
          instance: {
            ownerAccount: { id: '123456789012' },
          },
          name: 'AdministratorAccess',
          description: null,
          policy: new DeclaredAwsIamPolicyBundle({
            managed: ['arn:aws:iam::aws:policy/AdministratorAccess'],
            inline: new DeclaredAwsIamPolicyDocument({ statements: [] }),
          }),
          tags: null,
        });
      });

      then('it should have the name', () => {
        expect(permissionSet.name).toBe('AdministratorAccess');
      });

      then('it should have the instance ref', () => {
        expect(permissionSet.instance).toEqual({
          ownerAccount: { id: '123456789012' },
        });
      });

      then('metadata is undefined by default', () => {
        expect(permissionSet.arn).toBeUndefined();
      });
    });
  });

  given('all properties provided', () => {
    when('instantiated with metadata and optional fields', () => {
      let permissionSet: DeclaredAwsSsoPermissionSet;

      then('it should instantiate', () => {
        permissionSet = new DeclaredAwsSsoPermissionSet({
          arn: 'arn:aws:sso:::permissionSet/ssoins-1234567890abcdef/ps-abcdef1234567890',
          instance: {
            ownerAccount: { id: '123456789012' },
          },
          name: 'DemoAccess',
          description: 'Demo access for agents',
          sessionDuration: 'PT4H',
          policy: new DeclaredAwsIamPolicyBundle({
            managed: ['arn:aws:iam::aws:policy/ReadOnlyAccess'],
            inline: new DeclaredAwsIamPolicyDocument({ statements: [] }),
          }),
          tags: { purpose: 'demo' },
        });
      });

      then('it should have all properties', () => {
        expect(permissionSet).toMatchObject({
          arn: 'arn:aws:sso:::permissionSet/ssoins-1234567890abcdef/ps-abcdef1234567890',
          name: 'DemoAccess',
          description: 'Demo access for agents',
          sessionDuration: 'PT4H',
        });
        expect(permissionSet.tags).toEqual({ purpose: 'demo' });
      });
    });
  });

  given('the static keys', () => {
    then('primary is defined as arn', () => {
      expect(DeclaredAwsSsoPermissionSet.primary).toEqual(['arn']);
    });

    then('unique is defined as instance + name', () => {
      expect(DeclaredAwsSsoPermissionSet.unique).toEqual(['instance', 'name']);
    });

    then('metadata is defined as arn', () => {
      expect(DeclaredAwsSsoPermissionSet.metadata).toEqual(['arn']);
    });

    then('nested includes policy, tags, and instance', () => {
      expect(DeclaredAwsSsoPermissionSet.nested).toHaveProperty('policy');
      expect(DeclaredAwsSsoPermissionSet.nested).toHaveProperty('tags');
      expect(DeclaredAwsSsoPermissionSet.nested).toHaveProperty('instance');
    });
  });
});
