import type { LaunchTemplateInstanceMetadataOptions } from '@aws-sdk/client-ec2';

import {
  type DeclaredAwsEc2InstanceMetadataOptions,
  ec2InstanceMetadataOptionsAwsImplicit,
  ec2InstanceMetadataOptionsSecure,
} from '@src/domain.objects/DeclaredAwsEc2InstanceMetadataOptions';

/**
 * .what = reads AWS's LaunchTemplateInstanceMetadataOptions shape into the domain
 *   DeclaredAwsEc2InstanceMetadataOptions shape (the HONEST effective value)
 * .why = keeps the read-back decode-friction (the AWS-implicit fallback + per-sub-field
 *   defaulting) out of the cast, so castIntoDeclaredAwsEc2LaunchTemplate stays a flat
 *   narrative (rule.forbid.inline-decode-friction). extracted as its own transformer so
 *   the deferred instance-path follow-up (wish #77) can reuse it — an instance reads the
 *   identical AWS shape off Instance.MetadataOptions
 * .note = returns the HONEST effective value, NOT the canonical form. the secure-equal
 *   -> null collapse is applied ONCE, later, at DeclaredAwsEc2LaunchTemplate construction
 *   (asCanonicalEc2InstanceMetadataOptions) — so both a read-back AND a caller's declared
 *   object converge to the same canonical form for KEEP
 */
export const asDeclaredAwsEc2InstanceMetadataOptions = (input: {
  metadataOptions: LaunchTemplateInstanceMetadataOptions | undefined;
}): DeclaredAwsEc2InstanceMetadataOptions => {
  const mo = input.metadataOptions;

  // a WHOLLY-ABSENT block means the box is imdsv1-allowed (the AWS implicit default), NOT
  // secure. read it back as that honest insecure default so a pre-feature template plans a
  // change (immutable -> fails loud -> prune-then-recreate) instead of a false KEEP that
  // masks an insecure box (rule.require.immutable-source-of-truth, rule.forbid.failhide).
  //
  // "wholly absent" is BOTH shapes that carry no posture: AWS omits the MetadataOptions
  // key entirely (`undefined`), OR emits a present-but-empty `{}` with every sub-field
  // undefined. both mean "no posture read from AWS" and MUST take the insecure read — if
  // an all-empty `{}` fell through to the per-sub-field secure fallback below, it would
  // read back fully SECURE and false-KEEP an imdsv1-allowed box (the exact false-KEEP
  // hazard, just from the present-but-empty direction).
  const isWhollyAbsent =
    !mo ||
    (mo.HttpTokens === undefined &&
      mo.HttpPutResponseHopLimit === undefined &&
      mo.HttpEndpoint === undefined);
  if (isWhollyAbsent) return ec2InstanceMetadataOptionsAwsImplicit;

  // build the declared shape; fall back each ABSENT sub-field to the secure value.
  //
  // note the deliberate asymmetry with the branch above: a wholly-absent MetadataOptions
  // block falls back to the INSECURE aws-implicit value, but an absent SUB-field here (in a
  // block that DOES carry at least one field) falls back to the SECURE value. this is not a
  // contradiction of rule.require.immutable-source-of-truth — the two "absent" signals mean
  // different things. a wholly-absent block (key omitted OR all-empty {}) means genuinely
  // imdsv1-allowed → read insecure. but a PARTIALLY-present block is not a shape AWS emits
  // (once the block is present AWS populates all three sub-fields), so an absent sub-field
  // in a partial block is not an "unknown posture" to assume-worst about — it is unreachable
  // in practice, and the secure fallback is only a total-function guard for the impossible
  // partial. so neither branch assumes secure on a genuinely ambiguous read: every
  // no-posture shape (the only real ambiguity) already takes the insecure read above.
  return {
    httpTokens: mo.HttpTokens ?? ec2InstanceMetadataOptionsSecure.httpTokens,
    httpPutResponseHopLimit:
      mo.HttpPutResponseHopLimit ??
      ec2InstanceMetadataOptionsSecure.httpPutResponseHopLimit,
    httpEndpoint:
      mo.HttpEndpoint ?? ec2InstanceMetadataOptionsSecure.httpEndpoint,
  };
};
