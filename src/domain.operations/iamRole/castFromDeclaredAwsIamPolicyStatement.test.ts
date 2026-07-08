import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { DeclaredAwsIamPolicyStatement } from '@src/domain.objects/DeclaredAwsIamPolicyStatement';

import { castFromDeclaredAwsIamPolicyStatement } from './castFromDeclaredAwsIamPolicyStatement';
import { castIntoDeclaredAwsIamPolicyStatement } from './castIntoDeclaredAwsIamPolicyStatement';

/**
 * .what = the on-the-wire json shape (undefined keys dropped)
 * .why = asserts what iam actually receives, not the in-memory object
 */
const toWireJson = (
  statement: DeclaredAwsIamPolicyStatement,
): Record<string, unknown> =>
  JSON.parse(JSON.stringify(castFromDeclaredAwsIamPolicyStatement(statement)));

describe('castFromDeclaredAwsIamPolicyStatement', () => {
  given('[case1] a positive resource match (bare shorthand)', () => {
    const statement = DeclaredAwsIamPolicyStatement.as({
      effect: 'Allow',
      action: 's3:GetObject',
      resource: 'arn:aws:s3:::bucket/*',
    });

    when('[t0] cast to sdk json', () => {
      then('it emits Resource, no NotResource', () => {
        const wire = toWireJson(statement);
        expect(wire.Resource).toEqual('arn:aws:s3:::bucket/*');
        expect(wire).not.toHaveProperty('NotResource');
        expect(wire).toMatchSnapshot();
      });
    });
  });

  given('[case2] a resource exclusion `{ exclude }`', () => {
    const statement = DeclaredAwsIamPolicyStatement.as({
      sid: 'DenyNonPlanSsmParameters',
      effect: 'Deny',
      action: 'ssm:GetParameter*',
      resource: {
        exclude:
          'arn:aws:ssm:*:*:parameter/*/svc-*/database/role/cicd/scope=plan/*',
      },
    });

    when('[t0] cast to sdk json', () => {
      then('it emits NotResource and no Resource', () => {
        const wire = toWireJson(statement);
        expect(wire.NotResource).toEqual(
          'arn:aws:ssm:*:*:parameter/*/svc-*/database/role/cicd/scope=plan/*',
        );
        expect(wire).not.toHaveProperty('Resource');
        expect(wire).toMatchSnapshot();
      });

      then('it preserves Sid, Effect, and Action', () => {
        const wire = toWireJson(statement);
        expect(wire.Sid).toEqual('DenyNonPlanSsmParameters');
        expect(wire.Effect).toEqual('Deny');
        expect(wire.Action).toEqual('ssm:GetParameter*');
      });
    });
  });

  given('[case3] an action exclusion `{ exclude }`', () => {
    const statement = DeclaredAwsIamPolicyStatement.as({
      effect: 'Deny',
      action: { exclude: 's3:DeleteObject' },
      resource: '*',
    });

    when('[t0] cast to sdk json', () => {
      then('it emits NotAction and no Action', () => {
        const wire = toWireJson(statement);
        expect(wire.NotAction).toEqual('s3:DeleteObject');
        expect(wire).not.toHaveProperty('Action');
        expect(wire).toMatchSnapshot();
      });
    });
  });

  given('[case4] a principal exclusion `{ exclude }`', () => {
    const statement = DeclaredAwsIamPolicyStatement.as({
      effect: 'Deny',
      principal: { exclude: { aws: 'arn:aws:iam::123456789012:root' } },
      action: 's3:GetObject',
      resource: '*',
    });

    when('[t0] cast to sdk json', () => {
      then('it emits NotPrincipal and no Principal', () => {
        const wire = toWireJson(statement);
        expect(wire.NotPrincipal).toEqual({
          AWS: 'arn:aws:iam::123456789012:root',
        });
        expect(wire).not.toHaveProperty('Principal');
        expect(wire).toMatchSnapshot();
      });
    });
  });

  given('[case5] the explicit `{ include }` form (same as bare)', () => {
    when('[t0] a resource `{ include }` is cast', () => {
      then('it emits Resource, no NotResource', () => {
        const statement = DeclaredAwsIamPolicyStatement.as({
          effect: 'Allow',
          action: { include: ['s3:GetObject', 's3:PutObject'] },
          resource: { include: '*' },
        });
        const wire = toWireJson(statement);
        expect(wire.Resource).toEqual('*');
        expect(wire.Action).toEqual(['s3:GetObject', 's3:PutObject']);
        expect(wire).not.toHaveProperty('NotResource');
        expect(wire).not.toHaveProperty('NotAction');
        expect(wire).toMatchSnapshot();
      });
    });

    when('[t1] a principal `{ include }` is cast', () => {
      then('it emits Principal, no NotPrincipal', () => {
        const statement = DeclaredAwsIamPolicyStatement.as({
          effect: 'Allow',
          principal: { include: { service: 'lambda.amazonaws.com' } },
          action: 'sts:AssumeRole',
        });
        const wire = toWireJson(statement);
        expect(wire.Principal).toEqual({ Service: 'lambda.amazonaws.com' });
        expect(wire).not.toHaveProperty('NotPrincipal');
        expect(wire).toMatchSnapshot();
      });
    });
  });

  given('[case6] a bare principal shorthand `{ service }`', () => {
    const statement = DeclaredAwsIamPolicyStatement.as({
      effect: 'Allow',
      principal: { service: 'lambda.amazonaws.com' },
      action: 'sts:AssumeRole',
    });

    when('[t0] cast to sdk json', () => {
      then('it emits Principal (bare = include)', () => {
        const wire = toWireJson(statement);
        expect(wire.Principal).toEqual({ Service: 'lambda.amazonaws.com' });
        expect(wire).not.toHaveProperty('NotPrincipal');
        expect(wire).toMatchSnapshot();
      });
    });
  });

  given('[case7] an empty exclusion', () => {
    when('[t0] resource `{ exclude: [] }` is cast', () => {
      then('it fails fast with a helpful message', async () => {
        const statement = DeclaredAwsIamPolicyStatement.as({
          effect: 'Deny',
          action: 's3:GetObject',
          resource: { exclude: [] },
        });
        const error = await getError(() =>
          castFromDeclaredAwsIamPolicyStatement(statement),
        );
        expect(error.message).toContain('empty { exclude } exclusion');
        expect(error.message).toContain('resource');
        expect(error.message).toMatchSnapshot();
      });
    });

    when('[t1] action `{ exclude: "" }` is cast', () => {
      then('it fails fast', async () => {
        const statement = DeclaredAwsIamPolicyStatement.as({
          effect: 'Deny',
          action: { exclude: '' },
          resource: '*',
        });
        const error = await getError(() =>
          castFromDeclaredAwsIamPolicyStatement(statement),
        );
        expect(error.message).toContain('empty { exclude } exclusion');
        expect(error.message).toContain('action');
        expect(error.message).toMatchSnapshot();
      });
    });

    when('[t2] principal `{ exclude: {} }` (empty principal) is cast', () => {
      then('it fails fast', async () => {
        const statement = DeclaredAwsIamPolicyStatement.as({
          effect: 'Deny',
          principal: { exclude: {} as never },
          action: 's3:GetObject',
          resource: '*',
        });
        const error = await getError(() =>
          castFromDeclaredAwsIamPolicyStatement(statement),
        );
        expect(error.message).toContain('empty { exclude } exclusion');
        expect(error.message).toContain('principal');
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('[case8] a scope that sets both `include` and `exclude`', () => {
    when('[t0] a resource sets both', () => {
      then(
        'it fails fast (AWS forbids both Resource and NotResource)',
        async () => {
          const statement = DeclaredAwsIamPolicyStatement.as({
            effect: 'Deny',
            action: 's3:GetObject',
            resource: {
              include: 'arn:aws:s3:::a/*',
              exclude: 'arn:aws:s3:::b/*',
            },
          });
          const error = await getError(() =>
            castFromDeclaredAwsIamPolicyStatement(statement),
          );
          expect(error.message).toContain('sets both "include" and "exclude"');
          expect(error.message).toContain('resource');
          expect(error.message).toMatchSnapshot();
        },
      );
    });

    when('[t1] a principal sets both', () => {
      then(
        'it fails fast (AWS forbids both Principal and NotPrincipal)',
        async () => {
          const statement = DeclaredAwsIamPolicyStatement.as({
            effect: 'Deny',
            principal: {
              include: { service: 'lambda.amazonaws.com' },
              exclude: { aws: 'arn:aws:iam::123456789012:root' },
            },
            action: 's3:GetObject',
            resource: '*',
          });
          const error = await getError(() =>
            castFromDeclaredAwsIamPolicyStatement(statement),
          );
          expect(error.message).toContain('sets both "include" and "exclude"');
          expect(error.message).toContain('principal');
          expect(error.message).toMatchSnapshot();
        },
      );
    });

    when('[t2] an action sets both', () => {
      then(
        'it fails fast (AWS forbids both Action and NotAction)',
        async () => {
          const statement = DeclaredAwsIamPolicyStatement.as({
            effect: 'Deny',
            action: {
              include: 's3:GetObject',
              exclude: 's3:DeleteObject',
            },
            resource: '*',
          });
          const error = await getError(() =>
            castFromDeclaredAwsIamPolicyStatement(statement),
          );
          expect(error.message).toContain('sets both "include" and "exclude"');
          expect(error.message).toContain('action');
          expect(error.message).toMatchSnapshot();
        },
      );
    });
  });

  given('[case9] a statement with `{ exclude }` on each element', () => {
    const statement = DeclaredAwsIamPolicyStatement.as({
      effect: 'Deny',
      principal: { exclude: { service: 'lambda.amazonaws.com' } },
      action: { exclude: ['s3:DeleteObject', 's3:DeleteBucket'] },
      resource: { exclude: 'arn:aws:s3:::keepme/*' },
    });

    when('[t0] round-trip: cast to sdk then back to domain', () => {
      then('the domain statement is preserved exactly', () => {
        const wire = castFromDeclaredAwsIamPolicyStatement(statement);
        const back = castIntoDeclaredAwsIamPolicyStatement(wire);
        expect(back.resource).toEqual({ exclude: 'arn:aws:s3:::keepme/*' });
        expect(back.action).toEqual({
          exclude: ['s3:DeleteObject', 's3:DeleteBucket'],
        });
        expect(back.principal).toEqual({
          exclude: { service: 'lambda.amazonaws.com' },
        });
        expect({ wire, back }).toMatchSnapshot();
      });
    });
  });

  given(
    '[case10] a raw sdk statement with a nonsensical NotPrincipal of "*"',
    () => {
      when('[t0] read back into domain', () => {
        then('the sdk-object read cast fails fast', async () => {
          const error = await getError(() =>
            castIntoDeclaredAwsIamPolicyStatement({
              Effect: 'Deny',
              NotPrincipal: '*',
              Action: 's3:GetObject',
              Resource: '*',
            }),
          );
          expect(error.message).toContain(
            'NotPrincipal must exclude a concrete',
          );
          expect(error.message).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case11] a malformed raw sdk statement with both a positive and its `Not`',
    () => {
      when('[t0] both Resource and NotResource are present', () => {
        then('the sdk-object read cast fails fast', async () => {
          const error = await getError(() =>
            castIntoDeclaredAwsIamPolicyStatement({
              Effect: 'Deny',
              Action: 's3:GetObject',
              Resource: 'arn:aws:s3:::a/*',
              NotResource: 'arn:aws:s3:::b/*',
            }),
          );
          expect(error.message).toContain('both "Resource" and "NotResource"');
          expect(error.message).toMatchSnapshot();
        });
      });

      when('[t1] both Action and NotAction are present', () => {
        then('the sdk-object read cast fails fast', async () => {
          const error = await getError(() =>
            castIntoDeclaredAwsIamPolicyStatement({
              Effect: 'Deny',
              Action: 's3:GetObject',
              NotAction: 's3:DeleteObject',
              Resource: '*',
            }),
          );
          expect(error.message).toContain('both "Action" and "NotAction"');
          expect(error.message).toMatchSnapshot();
        });
      });

      when('[t2] both Principal and NotPrincipal are present', () => {
        then('the sdk-object read cast fails fast', async () => {
          const error = await getError(() =>
            castIntoDeclaredAwsIamPolicyStatement({
              Effect: 'Deny',
              Principal: { AWS: 'arn:aws:iam::111111111111:root' },
              NotPrincipal: { AWS: 'arn:aws:iam::999999999999:root' },
              Action: 's3:GetObject',
              Resource: '*',
            }),
          );
          expect(error.message).toContain(
            'both "Principal" and "NotPrincipal"',
          );
          expect(error.message).toMatchSnapshot();
        });
      });
    },
  );
});
