import { omitReadonly, serialize } from 'domain-objects';
import { given, then, when } from 'test-fns';

import { DeclaredAwsIamPolicyStatement } from '@src/domain.objects/DeclaredAwsIamPolicyStatement';

import { castFromDeclaredAwsIamPolicyStatement } from './castFromDeclaredAwsIamPolicyStatement';
import {
  castIntoDeclaredAwsIamPolicyStatement,
  type SdkAwsPolicyStatementRaw,
} from './castIntoDeclaredAwsIamPolicyStatement';

/**
 * .what = drives one statement through the full declare -> aws -> read cycle
 * .why = 🔴 a permadiff is a round-trip defect, and neither cast test can see one:
 *   each proves its own direction in isolation, so a pair that disagrees passes
 *   both. this is the only shape that catches it
 * .note = the `JSON.parse(JSON.stringify(...))` is not ceremony — iam stores the
 *   document as url-encoded json, so every `undefined` key and every class
 *   identity is erased in transit. `getIamRolePolicyAttachedInline` parses the
 *   same way, so this reproduces what the read path actually receives
 */
const asRoundTripped = (
  statement: DeclaredAwsIamPolicyStatement,
  options?: { asAwsStored?: (stored: SdkAwsPolicyStatementRaw) => void },
): DeclaredAwsIamPolicyStatement => {
  const sent = castFromDeclaredAwsIamPolicyStatement(statement);
  const stored = JSON.parse(JSON.stringify(sent)) as SdkAwsPolicyStatementRaw;
  options?.asAwsStored?.(stored);
  return castIntoDeclaredAwsIamPolicyStatement(stored);
};

/**
 * .what = the exact equivalence check declastruct plans against
 * .why = 🔴 `computeChange` compares `serialize(omitReadonly(x))`, so a test that
 *   used `toEqual` would grade a different question than the planner asks and
 *   could pass on a pair the planner calls UPDATE
 */
const isPlannedAsKeep = (input: {
  desired: DeclaredAwsIamPolicyStatement;
  remote: DeclaredAwsIamPolicyStatement;
}): boolean =>
  serialize(omitReadonly(input.remote)) ===
  serialize(omitReadonly(input.desired));

/**
 * .what = pins that a declared statement round-trips to an equivalent one
 * .why = 🔴 a statement that does not is a PERMADIFF: every plan reads UPDATE,
 *   forever, on a resource nobody edited. that costs more than noise — the
 *   revoke runbook's fail-safe is a human who stops on an unexpected plan row,
 *   and a plan that always carries one trains that human to skim past it
 */
describe('castRoundTrip — iam policy statement', () => {
  given('[case1] a trust statement, as a consumer declares it', () => {
    // `new`, never `.as()` — this is how a wish declares a statement, and the
    // two differ: `.as()` hydrates nested keys, `new` leaves them bare
    const declared = new DeclaredAwsIamPolicyStatement({
      effect: 'Allow',
      principal: { aws: 'arn:aws:iam::000000000000:role/example-role' },
      action: 'sts:AssumeRole',
    });

    when('[t0] it round-trips through aws', () => {
      then('the plan reads KEEP, never UPDATE', () => {
        expect(
          isPlannedAsKeep({
            desired: declared,
            remote: asRoundTripped(declared),
          }),
        ).toEqual(true);
      });
    });
  });

  given('[case2] an identity statement with an array resource', () => {
    // the shape ahbode's `grove-reach` inline policy carries: one action, and a
    // resource array that grows by one arn per reach
    const declared = new DeclaredAwsIamPolicyStatement({
      sid: 'AssumeDemoPower',
      effect: 'Allow',
      action: 'sts:AssumeRole',
      resource: [
        'arn:aws:iam::000000000000:role/a-for-grove',
        'arn:aws:iam::000000000001:role/b-for-grove',
      ],
    });

    when('[t0] it round-trips through aws', () => {
      then('the plan reads KEEP, never UPDATE', () => {
        expect(
          isPlannedAsKeep({
            desired: declared,
            remote: asRoundTripped(declared),
          }),
        ).toEqual(true);
      });
    });
  });

  given('[case3] a statement with an { exclude } scope', () => {
    // the scope shorthand is the one shape that HYDRATES under a nested key, so
    // it is where a class-identity asymmetry would surface if one exists
    const declared = new DeclaredAwsIamPolicyStatement({
      effect: 'Deny',
      action: { exclude: 's3:DeleteObject' },
      resource: '*',
    });

    when('[t0] it round-trips through aws', () => {
      then('the plan reads KEEP, never UPDATE', () => {
        expect(
          isPlannedAsKeep({
            desired: declared,
            remote: asRoundTripped(declared),
          }),
        ).toEqual(true);
      });
    });
  });

  given('[case5] one statement, built two legal ways', () => {
    // 🔴 the read path builds with `.as()` and a wish builds with `new`. if
    //   `serialize` told those apart, EVERY declared statement would permadiff,
    //   so this pins the property the whole cast pair rests on
    when('[t0] one is `new` and the other `.as()`', () => {
      then('the plan reads KEEP, never UPDATE', () => {
        const shape = {
          effect: 'Allow' as const,
          action: 'sts:AssumeRole',
          resource: 'arn:aws:iam::000000000000:role/example',
        };
        expect(
          isPlannedAsKeep({
            desired: new DeclaredAwsIamPolicyStatement(shape),
            remote: DeclaredAwsIamPolicyStatement.as(shape),
          }),
        ).toEqual(true);
      });
    });

    // 🔴 `{ ...stmt, sid }` reads as the paved way to amend a shared statement,
    //   and it is NOT a legal declaration shape: a spread yields a plain object,
    //   and `omitReadonly` throws on a value that is not a domain-object
    //   instance. so the planner CRASHES rather than diffs — loud, and pinned
    //   here because the crash names `omitReadonly` rather than the wish, so a
    //   reader would not guess the cause. re-instantiate instead, per [t2]
    when('[t1] one is a bare spread of the other', () => {
      then('the planner throws — a spread is not a declaration', () => {
        const declared = new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: 'sts:AssumeRole',
          resource: 'arn:aws:iam::000000000000:role/example',
        });
        expect(() =>
          isPlannedAsKeep({
            desired: { ...declared } as DeclaredAwsIamPolicyStatement,
            remote: declared,
          }),
        ).toThrow('not an instance of a DomainObject');
      });
    });

    // ⇒ and the sanctioned amend shape round-trips clean
    when('[t2] the amend is re-instantiated, not spread', () => {
      then('the plan reads KEEP, never UPDATE', () => {
        const declared = new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: 'sts:AssumeRole',
          resource: 'arn:aws:iam::000000000000:role/example',
        });
        const amended = new DeclaredAwsIamPolicyStatement({
          ...declared,
          sid: 'Amended',
        });
        expect(
          isPlannedAsKeep({
            desired: amended,
            remote: asRoundTripped(amended),
          }),
        ).toEqual(true);
      });
    });
  });

  given('[case4] a statement with a condition', () => {
    const declared = new DeclaredAwsIamPolicyStatement({
      effect: 'Deny',
      action: '*',
      resource: '*',
      condition: {
        DateLessThan: { 'aws:TokenIssueTime': '2026-01-01T00:00:00Z' },
      },
    });

    when('[t0] it round-trips through aws', () => {
      then('the plan reads KEEP, never UPDATE', () => {
        expect(
          isPlannedAsKeep({
            desired: declared,
            remote: asRoundTripped(declared),
          }),
        ).toEqual(true);
      });
    });
  });

  /**
   * 🔴 THE PERMADIFF, pinned as it behaves today. it is a DEFECT, and its root
   * is UPSTREAM in `declastruct`, not here.
   *
   * every case above round-trips only because the transit happened to preserve
   * its shape. `action`, `resource`, and `principal.aws` are each
   * `string | string[]`, iam treats `'x'` and `['x']` as identical and does not
   * promise to echo the shape it was given — and `computeChange` compares
   * `serialize(omitReadonly(x))`, which is SHAPE-sensitive. so a flip in transit
   * is permanent: every plan reports UPDATE on a statement nobody edited.
   *
   * ⚠️ it cannot be closed from a cast. a fold here rescues a scalar
   * declaration and breaks a list-of-one, and both are legal — so the read path
   * would trade one permadiff for another. the desired side has to be
   * canonicalized too, and that side is built by a wish via `new`, which this
   * library does not reach.
   *
   * ⇒ the fix belongs where BOTH sides are in hand — the planner's equivalence
   * check. canonicalize each side identically before the compare:
   *   - sort arrays (`serialize` already takes `{ orderless: true }`)
   *   - fold a one-element array to its bare value
   * symmetric, so it changes no written document and cannot break a caller.
   *
   * these assert the CURRENT behavior. they go RED the day the root fix lands,
   * which is the signal to delete this block.
   */
  given('[case6] a shape flip in transit — the permadiff, unclosed', () => {
    const arn = 'arn:aws:iam::000000000000:role/only-one';
    const second = 'arn:aws:iam::000000000001:role/second';

    when('[t0] `principal.aws` is scalar, and iam expands it', () => {
      then('🔴 the plan reads UPDATE — a permadiff', () => {
        const declared = new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          principal: { aws: arn },
          action: 'sts:AssumeRole',
        });
        expect(
          isPlannedAsKeep({
            desired: declared,
            remote: asRoundTripped(declared, {
              asAwsStored: (stored) => {
                stored.Principal = { AWS: [arn] };
              },
            }),
          }),
        ).toEqual(false);
      });
    });

    when('[t1] `principal.aws` is a list of one, and iam collapses it', () => {
      then('🔴 the plan reads UPDATE — a permadiff', () => {
        const declared = new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          principal: { aws: [arn] },
          action: 'sts:AssumeRole',
        });
        expect(
          isPlannedAsKeep({
            desired: declared,
            remote: asRoundTripped(declared, {
              asAwsStored: (stored) => {
                stored.Principal = { AWS: arn };
              },
            }),
          }),
        ).toEqual(false);
      });
    });

    when('[t2] `resource` is a list of one, and iam collapses it', () => {
      then('🔴 the plan reads UPDATE — a permadiff', () => {
        const declared = new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: 'sts:AssumeRole',
          resource: [arn],
        });
        expect(
          isPlannedAsKeep({
            desired: declared,
            remote: asRoundTripped(declared, {
              asAwsStored: (stored) => {
                stored.Resource = arn;
              },
            }),
          }),
        ).toEqual(false);
      });
    });

    // ⇒ ORDER is the second arm of the same root, and `serialize` already has
    //   the flag that closes it — the planner simply does not pass it
    when('[t3] iam returns a multi-arn `resource` in another order', () => {
      then('🔴 the plan reads UPDATE — a permadiff', () => {
        const declared = new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: 'sts:AssumeRole',
          resource: [arn, second],
        });
        expect(
          isPlannedAsKeep({
            desired: declared,
            remote: asRoundTripped(declared, {
              asAwsStored: (stored) => {
                stored.Resource = [second, arn];
              },
            }),
          }),
        ).toEqual(false);
      });
    });
  });
});
