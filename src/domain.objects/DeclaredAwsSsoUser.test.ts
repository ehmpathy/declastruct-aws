import { given, then, when } from 'test-fns';

import { DeclaredAwsSsoUser } from './DeclaredAwsSsoUser';

describe('DeclaredAwsSsoUser', () => {
  given('a valid sso user', () => {
    when('instantiated with minimal properties', () => {
      let user: DeclaredAwsSsoUser;

      then('it should instantiate', () => {
        user = new DeclaredAwsSsoUser({
          instance: { ownerAccount: { id: '123456789012' } },
          userName: 'demo-agent',
          displayName: 'Demo Agent',
          email: 'demo@example.com',
        });
      });

      then('it should have the userName', () => {
        expect(user.userName).toBe('demo-agent');
      });

      then('it should have the instance ref', () => {
        expect(user.instance).toEqual({ ownerAccount: { id: '123456789012' } });
      });

      then('metadata is undefined by default', () => {
        expect(user.id).toBeUndefined();
      });

      then('optional fields are undefined by default', () => {
        expect(user.givenName).toBeUndefined();
        expect(user.familyName).toBeUndefined();
      });
    });
  });

  given('all properties provided', () => {
    when('instantiated with metadata and optional fields', () => {
      let user: DeclaredAwsSsoUser;

      then('it should instantiate', () => {
        user = new DeclaredAwsSsoUser({
          id: '12345678-1234-1234-1234-123456789012',
          instance: { ownerAccount: { id: '123456789012' } },
          userName: 'admin',
          displayName: 'Admin User',
          givenName: 'Admin',
          familyName: 'User',
          email: 'admin@example.com',
        });
      });

      then('it should have all properties', () => {
        expect(user).toMatchObject({
          id: '12345678-1234-1234-1234-123456789012',
          userName: 'admin',
          displayName: 'Admin User',
          givenName: 'Admin',
          familyName: 'User',
          email: 'admin@example.com',
        });
        expect(user.instance).toEqual({ ownerAccount: { id: '123456789012' } });
      });
    });
  });

  given('the static keys', () => {
    then('primary is defined as id', () => {
      expect(DeclaredAwsSsoUser.primary).toEqual(['id']);
    });

    then('unique is defined as instance + userName', () => {
      expect(DeclaredAwsSsoUser.unique).toEqual(['instance', 'userName']);
    });

    then('metadata is defined as id', () => {
      expect(DeclaredAwsSsoUser.metadata).toEqual(['id']);
    });
  });
});
