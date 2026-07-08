import { given, then, when } from 'test-fns';

import { DeclaredAwsIamPolicyCondition } from './DeclaredAwsIamPolicyCondition';
import { DeclaredAwsIamPolicyStatement } from './DeclaredAwsIamPolicyStatement';
import { DeclaredAwsIamPrincipal } from './DeclaredAwsIamPrincipal';
import { DeclaredAwsIamPrincipalScope } from './DeclaredAwsIamPrincipalScope';
import { DeclaredAwsIamStatementScope } from './DeclaredAwsIamStatementScope';

/**
 * .what = proves nested hydration of every declaration variant the Scope contract supports
 * .why = the whole point of the `bare | Scope` design (and the two upstream domain-objects
 *   fixes it rests on) is that `new DeclaredAwsIamPolicyStatement({...})` hydrates each
 *   variant into the right shape: a bare scalar/array stays bare, a `{ include, exclude }`
 *   hydrates to a Scope instance, and a bare principal object disambiguates from a principal
 *   Scope structurally. these assertions guard that hydration across all edge cases.
 */
describe('DeclaredAwsIamPolicyStatement', () => {
  // resource — single-option nest of DeclaredAwsIamStatementScope
  given('[case1] resource as a bare scalar', () => {
    when('[t0] instantiated', () => {
      const statement = new DeclaredAwsIamPolicyStatement({
        effect: 'Allow',
        action: 's3:GetObject',
        resource: '*',
      });

      then('resource stays a bare string (not wrapped in a Scope)', () => {
        expect(statement.resource).toEqual('*');
        expect(statement.resource).not.toBeInstanceOf(
          DeclaredAwsIamStatementScope,
        );
      });
    });
  });

  given('[case2] resource as a bare array', () => {
    when('[t0] instantiated', () => {
      const statement = new DeclaredAwsIamPolicyStatement({
        effect: 'Allow',
        action: 's3:GetObject',
        resource: ['arn:aws:s3:::a/*', 'arn:aws:s3:::b/*'],
      });

      then(
        'resource stays a bare array of strings (elements un-hydrated)',
        () => {
          expect(Array.isArray(statement.resource)).toBe(true);
          expect(statement.resource).toEqual([
            'arn:aws:s3:::a/*',
            'arn:aws:s3:::b/*',
          ]);
          (statement.resource as string[]).forEach((each) =>
            expect(typeof each).toEqual('string'),
          );
        },
      );
    });
  });

  given('[case3] resource as an include Scope', () => {
    when('[t0] instantiated', () => {
      const statement = new DeclaredAwsIamPolicyStatement({
        effect: 'Allow',
        action: 's3:GetObject',
        resource: { include: 'arn:aws:s3:::bucket/*' },
      });

      then('resource hydrates to a DeclaredAwsIamStatementScope', () => {
        expect(statement.resource).toBeInstanceOf(DeclaredAwsIamStatementScope);
        expect(statement.resource).toMatchObject({
          include: 'arn:aws:s3:::bucket/*',
        });
      });
    });
  });

  given('[case4] resource as an exclude Scope (array value)', () => {
    when('[t0] instantiated', () => {
      const statement = new DeclaredAwsIamPolicyStatement({
        effect: 'Deny',
        action: 'ssm:GetParameter*',
        resource: {
          exclude: ['arn:aws:ssm:*:*:parameter/cicd/scope=plan/*'],
        },
      });

      then(
        'resource hydrates to a Scope with the bare array exclude preserved',
        () => {
          expect(statement.resource).toBeInstanceOf(
            DeclaredAwsIamStatementScope,
          );
          expect(statement.resource).toMatchObject({
            exclude: ['arn:aws:ssm:*:*:parameter/cicd/scope=plan/*'],
          });
        },
      );
    });
  });

  // action — same single-option nest, but required
  given('[case5] action as a bare array', () => {
    when('[t0] instantiated', () => {
      const statement = new DeclaredAwsIamPolicyStatement({
        effect: 'Allow',
        action: ['s3:GetObject', 's3:PutObject'],
        resource: '*',
      });

      then('action stays a bare array (not wrapped in a Scope)', () => {
        expect(Array.isArray(statement.action)).toBe(true);
        expect(statement.action).toEqual(['s3:GetObject', 's3:PutObject']);
        expect(statement.action).not.toBeInstanceOf(
          DeclaredAwsIamStatementScope,
        );
      });
    });
  });

  given('[case6] action as an exclude Scope', () => {
    when('[t0] instantiated', () => {
      const statement = new DeclaredAwsIamPolicyStatement({
        effect: 'Deny',
        action: { exclude: 's3:DeleteObject' },
        resource: '*',
      });

      then('action hydrates to a DeclaredAwsIamStatementScope', () => {
        expect(statement.action).toBeInstanceOf(DeclaredAwsIamStatementScope);
        expect(statement.action).toMatchObject({ exclude: 's3:DeleteObject' });
      });
    });
  });

  // principal — multi-option nest of [DeclaredAwsIamPrincipal, DeclaredAwsIamPrincipalScope]
  given('[case7] principal as a bare "*"', () => {
    when('[t0] instantiated', () => {
      const statement = new DeclaredAwsIamPolicyStatement({
        effect: 'Allow',
        principal: '*',
        action: 'sts:AssumeRole',
        resource: '*',
      });

      then('principal stays a bare string (not wrapped)', () => {
        expect(statement.principal).toEqual('*');
        expect(statement.principal).not.toBeInstanceOf(DeclaredAwsIamPrincipal);
        expect(statement.principal).not.toBeInstanceOf(
          DeclaredAwsIamPrincipalScope,
        );
      });
    });
  });

  given('[case8] principal as a bare principal object (service)', () => {
    when('[t0] instantiated', () => {
      const statement = new DeclaredAwsIamPolicyStatement({
        effect: 'Allow',
        principal: { service: 'lambda.amazonaws.com' },
        action: 'sts:AssumeRole',
        resource: '*',
      });

      then(
        'principal disambiguates to a DeclaredAwsIamPrincipal (not a Scope)',
        () => {
          expect(statement.principal).toBeInstanceOf(DeclaredAwsIamPrincipal);
          expect(statement.principal).not.toBeInstanceOf(
            DeclaredAwsIamPrincipalScope,
          );
          expect(statement.principal).toMatchObject({
            service: 'lambda.amazonaws.com',
          });
        },
      );
    });
  });

  given('[case9] principal as a bare principal object (aws array)', () => {
    when('[t0] instantiated', () => {
      const statement = new DeclaredAwsIamPolicyStatement({
        effect: 'Allow',
        principal: {
          aws: ['arn:aws:iam::111:root', 'arn:aws:iam::222:root'],
        },
        action: 'sts:AssumeRole',
        resource: '*',
      });

      then(
        'principal disambiguates to a DeclaredAwsIamPrincipal with array aws',
        () => {
          expect(statement.principal).toBeInstanceOf(DeclaredAwsIamPrincipal);
          expect(statement.principal).toMatchObject({
            aws: ['arn:aws:iam::111:root', 'arn:aws:iam::222:root'],
          });
        },
      );
    });
  });

  given('[case10] principal as an include Scope', () => {
    when('[t0] instantiated', () => {
      const statement = new DeclaredAwsIamPolicyStatement({
        effect: 'Allow',
        principal: { include: { service: 'lambda.amazonaws.com' } },
        action: 'sts:AssumeRole',
        resource: '*',
      });

      then('principal disambiguates to a Scope with a nested principal', () => {
        expect(statement.principal).toBeInstanceOf(
          DeclaredAwsIamPrincipalScope,
        );
        expect(statement.principal).not.toBeInstanceOf(DeclaredAwsIamPrincipal);
      });

      then('the nested include hydrates to a DeclaredAwsIamPrincipal', () => {
        const scope = statement.principal as DeclaredAwsIamPrincipalScope;
        expect(scope.include).toBeInstanceOf(DeclaredAwsIamPrincipal);
        expect(scope.include).toMatchObject({
          service: 'lambda.amazonaws.com',
        });
      });
    });
  });

  given('[case11] principal as an exclude Scope', () => {
    when('[t0] instantiated', () => {
      const statement = new DeclaredAwsIamPolicyStatement({
        effect: 'Deny',
        principal: { exclude: { aws: 'arn:aws:iam::123:root' } },
        action: 's3:*',
        resource: '*',
      });

      then('principal disambiguates to a Scope', () => {
        expect(statement.principal).toBeInstanceOf(
          DeclaredAwsIamPrincipalScope,
        );
      });

      then('the nested exclude hydrates to a DeclaredAwsIamPrincipal', () => {
        const scope = statement.principal as DeclaredAwsIamPrincipalScope;
        expect(scope.exclude).toBeInstanceOf(DeclaredAwsIamPrincipal);
        expect(scope.exclude).toMatchObject({ aws: 'arn:aws:iam::123:root' });
      });
    });
  });

  // condition — the extant nested field, still hydrates
  given('[case12] a statement with a condition', () => {
    when('[t0] instantiated', () => {
      const statement = new DeclaredAwsIamPolicyStatement({
        effect: 'Allow',
        action: 's3:GetObject',
        resource: '*',
        condition: { StringEquals: { 'aws:PrincipalTag/team': 'cicd' } },
      });

      then('condition hydrates to a DeclaredAwsIamPolicyCondition', () => {
        expect(statement.condition).toBeInstanceOf(
          DeclaredAwsIamPolicyCondition,
        );
        expect(statement.condition).toMatchObject({
          StringEquals: { 'aws:PrincipalTag/team': 'cicd' },
        });
      });
    });
  });

  // combined — exclusion on every element at once, all hydrate independently
  given(
    '[case13] a statement that excludes on resource, action, and principal',
    () => {
      when('[t0] instantiated', () => {
        const statement = new DeclaredAwsIamPolicyStatement({
          sid: 'DenyAllButKeep',
          effect: 'Deny',
          principal: { exclude: { service: 'lambda.amazonaws.com' } },
          action: { exclude: ['s3:DeleteObject', 's3:DeleteBucket'] },
          resource: { exclude: 'arn:aws:s3:::keepme/*' },
        });

        then('each element hydrates to its own Scope variant', () => {
          expect(statement.resource).toBeInstanceOf(
            DeclaredAwsIamStatementScope,
          );
          expect(statement.action).toBeInstanceOf(DeclaredAwsIamStatementScope);
          expect(statement.principal).toBeInstanceOf(
            DeclaredAwsIamPrincipalScope,
          );
        });

        then('scalar fields carry through unchanged', () => {
          expect(statement.sid).toEqual('DenyAllButKeep');
          expect(statement.effect).toEqual('Deny');
        });
      });
    },
  );
});
