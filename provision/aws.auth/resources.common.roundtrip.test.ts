import { omitReadonly, serialize } from 'domain-objects';
import { given, then, when } from 'test-fns';

import type { DeclaredAwsIamPolicyDocument } from '../../src/contract/sdks';
import { castFromDeclaredAwsIamPolicyDocument } from '../../src/domain.operations/iamRole/castFromDeclaredAwsIamPolicyDocument';
import {
  castIntoDeclaredAwsIamPolicyDocument,
  type SdkAwsPolicyDocumentRaw,
} from '../../src/domain.operations/iamRole/castIntoDeclaredAwsIamPolicyDocument';
import { demoPermissionsPolicy } from './resources.common';

/**
 * .what = drives a whole document through the declare -> aws -> read cycle
 * .note = `castFrom...` already yields the json STRING iam stores, and the read
 *   path parses that same string. so the parse here is the transit, never
 *   ceremony: it is where every `undefined` key and every class identity is
 *   erased, exactly as `getIamRolePolicyAttachedInline` receives it
 */
const asRoundTripped = (
  document: DeclaredAwsIamPolicyDocument,
): DeclaredAwsIamPolicyDocument => {
  const stored = JSON.parse(
    castFromDeclaredAwsIamPolicyDocument(document),
  ) as SdkAwsPolicyDocumentRaw;
  return castIntoDeclaredAwsIamPolicyDocument(stored);
};

/**
 * .what = the exact equivalence check declastruct plans against
 * .why = 🔴 `computeChange` compares `serialize(omitReadonly(x))`. a test that
 *   used `toEqual` would grade a different question than the planner asks, and
 *   could pass on a pair the planner calls UPDATE
 */
const isPlannedAsKeep = (input: {
  desired: DeclaredAwsIamPolicyDocument;
  remote: DeclaredAwsIamPolicyDocument;
}): boolean =>
  serialize(omitReadonly(input.remote)) ===
  serialize(omitReadonly(input.desired));

/**
 * .what = pins that the shared bundle round-trips to an equivalent document
 * .why = 🔴 a document that does not is a PERMADIFF: every plan reads UPDATE,
 *   forever, on a policy nobody edited. that costs more than noise — the revoke
 *   runbook's fail-safe is a human who STOPS on an unexpected plan row, and a
 *   plan that always carries one trains that human to skim past it
 * .note = the bundle is the widest document this repo declares — ~20 statements,
 *   scalar and array actions, wildcards, arrays of arns. so it is the richest
 *   round-trip surface available without a live apply
 */
describe('resources.common — the bundle round-trips', () => {
  given('[case1] demoPermissionsPolicy.inline, as declared', () => {
    when('[t0] it round-trips through aws', () => {
      then('the plan reads KEEP, never UPDATE', () => {
        const declared = demoPermissionsPolicy.inline;
        expect(
          isPlannedAsKeep({
            desired: declared,
            remote: asRoundTripped(declared),
          }),
        ).toEqual(true);
      });
    });
  });
});
