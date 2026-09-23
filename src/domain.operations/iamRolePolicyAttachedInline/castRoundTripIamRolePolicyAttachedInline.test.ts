import { omitReadonly, refByUnique, serialize } from 'domain-objects';
import { given, then, when } from 'test-fns';

import { DeclaredAwsIamPolicyDocument } from '@src/domain.objects/DeclaredAwsIamPolicyDocument';
import { DeclaredAwsIamPolicyStatement } from '@src/domain.objects/DeclaredAwsIamPolicyStatement';
import { DeclaredAwsIamRole } from '@src/domain.objects/DeclaredAwsIamRole';
import { DeclaredAwsIamRolePolicyAttachedInline } from '@src/domain.objects/DeclaredAwsIamRolePolicyAttachedInline';
import { castFromDeclaredAwsIamPolicyDocument } from '@src/domain.operations/iamRole/castFromDeclaredAwsIamPolicyDocument';
import {
  castIntoDeclaredAwsIamPolicyDocument,
  type SdkAwsPolicyDocumentRaw,
} from '@src/domain.operations/iamRole/castIntoDeclaredAwsIamPolicyDocument';

import { castIntoDeclaredAwsIamRolePolicyAttachedInline } from './castIntoDeclaredAwsIamRolePolicyAttachedInline';

/**
 * .what = drives a whole ATTACHMENT through the declare -> aws -> read cycle
 * .why = 🔴 the statement and document round-trips are each pinned by their own
 *   file, and neither reaches this layer. the attachment adds two fields those
 *   tests never see — `name`, and a nested `role` REF — and a ref is built one
 *   way by a wish (`refByUnique(role)`, from the whole role object) and another
 *   by the read path (`RefByUnique.as({ name })`, from a string). if those two
 *   disagree, every inline attachment permadiffs
 * .note = this reproduces `getIamRolePolicyAttachedInline` minus the aws call:
 *   it serializes the document to the json string iam stores, parses it back the
 *   same way that operation does, and rebuilds the attachment through the very
 *   cast the read path uses
 */
const asRoundTripped = (input: {
  attachment: DeclaredAwsIamRolePolicyAttachedInline;
  roleName: string;
}): DeclaredAwsIamRolePolicyAttachedInline => {
  const stored = JSON.parse(
    castFromDeclaredAwsIamPolicyDocument(input.attachment.document),
  ) as SdkAwsPolicyDocumentRaw;
  return castIntoDeclaredAwsIamRolePolicyAttachedInline({
    policyName: input.attachment.name,
    roleName: input.roleName,
    policyDocument: castIntoDeclaredAwsIamPolicyDocument(stored),
  });
};

/**
 * .what = the exact equivalence check declastruct plans against
 * .why = 🔴 `computeChange` compares `serialize(omitReadonly(x))`, so a test that
 *   used `toEqual` would grade a different question than the planner asks
 */
const isPlannedAsKeep = (input: {
  desired: DeclaredAwsIamRolePolicyAttachedInline;
  remote: DeclaredAwsIamRolePolicyAttachedInline;
}): boolean =>
  serialize(omitReadonly(input.remote)) ===
  serialize(omitReadonly(input.desired));

/**
 * .what = the role a wish declares and then references
 * .note = the ref a wish builds is derived from THIS object, so the object's own
 *   shape is part of what the ref test exercises
 */
const buildRole = (): DeclaredAwsIamRole =>
  new DeclaredAwsIamRole({
    name: 'example-role',
    path: '/',
    description: 'an example role',
    policies: [
      new DeclaredAwsIamPolicyStatement({
        effect: 'Allow',
        principal: { aws: 'arn:aws:iam::000000000000:role/caller' },
        action: 'sts:AssumeRole',
      }),
    ],
    tags: { managedBy: 'declastruct' },
  });

/**
 * .what = pins that a declared inline attachment round-trips to an equivalent one
 * .why = 🔴 a permadiff here is the worst grain of the three: every plan reads
 *   UPDATE on a policy nobody edited, forever. the revoke runbook's fail-safe is
 *   a human who STOPS on an unexpected plan row, and a plan that always carries
 *   one trains that human to skim past it
 */
describe('castRoundTrip — iam role policy attached inline', () => {
  given(
    '[case1] an attachment whose role ref came from the role object',
    () => {
      const role = buildRole();
      const declared = new DeclaredAwsIamRolePolicyAttachedInline({
        name: 'example-role-extension',
        role: refByUnique<typeof DeclaredAwsIamRole>(role),
        document: new DeclaredAwsIamPolicyDocument({
          statements: [
            new DeclaredAwsIamPolicyStatement({
              effect: 'Allow',
              action: 's3:GetObject',
              resource: '*',
            }),
          ],
        }),
      });

      when('[t0] it round-trips through aws', () => {
        then('the plan reads KEEP, never UPDATE', () => {
          expect(
            isPlannedAsKeep({
              desired: declared,
              remote: asRoundTripped({
                attachment: declared,
                roleName: role.name,
              }),
            }),
          ).toEqual(true);
        });
      });
    },
  );

  given('[case2] the camp `grove-reach` shape — one sid + an arn array', () => {
    // 🔴 this is the shape the caller half carries: one statement, a sid, one
    //   action, and a resource array that grows by one arn per reach. it is the
    //   shape a live plan reported an UPDATE on, so it is pinned literally
    const role = buildRole();
    const declared = new DeclaredAwsIamRolePolicyAttachedInline({
      name: 'grove-reach',
      role: refByUnique<typeof DeclaredAwsIamRole>(role),
      document: new DeclaredAwsIamPolicyDocument({
        statements: [
          new DeclaredAwsIamPolicyStatement({
            sid: 'AssumeReachTargets',
            effect: 'Allow',
            action: 'sts:AssumeRole',
            resource: [
              'arn:aws:iam::000000000000:role/a-for-grove',
              'arn:aws:iam::000000000001:role/b-for-grove',
              'arn:aws:iam::000000000002:role/c-for-grove',
            ],
          }),
        ],
      }),
    });

    when('[t0] it round-trips through aws', () => {
      then('the plan reads KEEP, never UPDATE', () => {
        expect(
          isPlannedAsKeep({
            desired: declared,
            remote: asRoundTripped({
              attachment: declared,
              roleName: role.name,
            }),
          }),
        ).toEqual(true);
      });
    });
  });

  given('[case3] the role ref, built the two legal ways', () => {
    // 🔴 the isolated pin for the one field the statement and document tests
    //   cannot reach. a wish builds the ref by a PICK off the whole role object;
    //   the read path builds it from a bare name string. if `refByUnique` carried
    //   any extra key off the role, every attachment would permadiff
    when(
      '[t0] one is picked off the role and the other built from a name',
      () => {
        then('the two refs serialize identically', () => {
          const role = buildRole();
          const document = new DeclaredAwsIamPolicyDocument({
            statements: [
              new DeclaredAwsIamPolicyStatement({
                effect: 'Allow',
                action: 's3:GetObject',
                resource: '*',
              }),
            ],
          });
          const desired = new DeclaredAwsIamRolePolicyAttachedInline({
            name: 'example-role-extension',
            role: refByUnique<typeof DeclaredAwsIamRole>(role),
            document,
          });
          const remote = castIntoDeclaredAwsIamRolePolicyAttachedInline({
            policyName: 'example-role-extension',
            roleName: role.name,
            policyDocument: document,
          });
          expect(serialize(desired.role)).toEqual(serialize(remote.role));
        });
      },
    );
  });
});
