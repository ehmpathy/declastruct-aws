import { given, then, when } from 'test-fns';

import { DeclaredAwsSsoAccountAssignment } from './DeclaredAwsSsoAccountAssignment';

describe('DeclaredAwsSsoAccountAssignment', () => {
  given('a valid account assignment', () => {
    when('instantiated with user principal and account target', () => {
      let assignment: DeclaredAwsSsoAccountAssignment;

      then('it should instantiate', () => {
        assignment = new DeclaredAwsSsoAccountAssignment({
          instance: {
            ownerAccount: { id: '123456789012' },
          },
          permissionSet: {
            instance: {
              ownerAccount: { id: '123456789012' },
            },
            name: 'DemoAccess',
          },
          principalType: 'USER',
          principal: {
            instance: { ownerAccount: { id: '123456789012' } },
            userName: 'demo',
          },
          targetType: 'AWS_ACCOUNT',
          target: { email: 'demo@example.com' },
        });
      });

      then('it should have the instance ref', () => {
        expect(assignment.instance).toEqual({
          ownerAccount: { id: '123456789012' },
        });
      });

      then('it should have the principalType', () => {
        expect(assignment.principalType).toBe('USER');
      });

      then('it should have the targetType', () => {
        expect(assignment.targetType).toBe('AWS_ACCOUNT');
      });
    });
  });

  given('a group principal', () => {
    when('instantiated with GROUP principalType', () => {
      let assignment: DeclaredAwsSsoAccountAssignment;

      then('it should accept GROUP as principalType', () => {
        assignment = new DeclaredAwsSsoAccountAssignment({
          instance: {
            ownerAccount: { id: '123456789012' },
          },
          permissionSet: {
            instance: { ownerAccount: { id: '123456789012' } },
            name: 'DemoAccess',
          },
          principalType: 'GROUP',
          principal: {
            instance: { ownerAccount: { id: '123456789012' } },
            userName: 'demo-group',
          },
          targetType: 'AWS_ACCOUNT',
          target: { email: 'group-demo@example.com' },
        });
        expect(assignment.principalType).toBe('GROUP');
      });
    });
  });

  given('target as ref to organization account', () => {
    when('instantiated with account ref by unique', () => {
      let assignment: DeclaredAwsSsoAccountAssignment;

      then('it should accept ref by unique as target', () => {
        assignment = new DeclaredAwsSsoAccountAssignment({
          instance: {
            ownerAccount: { id: '123456789012' },
          },
          permissionSet: {
            instance: {
              ownerAccount: { id: '123456789012' },
            },
            name: 'DemoAccess',
          },
          principalType: 'USER',
          principal: {
            instance: { ownerAccount: { id: '123456789012' } },
            userName: 'demo',
          },
          targetType: 'AWS_ACCOUNT',
          target: { email: 'target@example.com' },
        });
        expect(assignment.target).toEqual({
          email: 'target@example.com',
        });
      });
    });
  });

  given('the static keys', () => {
    then('unique includes all identifying fields', () => {
      expect(DeclaredAwsSsoAccountAssignment.unique).toEqual([
        'instance',
        'permissionSet',
        'principalType',
        'principal',
        'targetType',
        'target',
      ]);
    });

    then('metadata is empty', () => {
      expect(DeclaredAwsSsoAccountAssignment.metadata).toEqual([]);
    });
  });
});
