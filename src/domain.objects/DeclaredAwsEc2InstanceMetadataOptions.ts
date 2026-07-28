import { DomainLiteral, serialize } from 'domain-objects';

/**
 * .what = the imdsv2 instance-metadata-service controls for an ec2 box
 * .why = enables declarative control of imdsv2 enforcement, so a managed box is
 *        not reachable for instance-role credentials via imdsv1 (ssrf / container hop)
 * .note
 *   - set on the launch template; a box launched from the template inherits these
 *   - a launch template with a null metadataOptions is created with the secure
 *     default (see ec2InstanceMetadataOptionsSecure) — imdsv2-only
 */
export interface DeclaredAwsEc2InstanceMetadataOptions {
  /**
   * .what = whether imdsv2 (the put-token handshake) is required
   * .why = 'required' blocks imdsv1's no-handshake credential fetch; 'optional'
   *        allows imdsv1 (the legacy, less secure behavior)
   */
  httpTokens: 'required' | 'optional';

  /**
   * .what = the http put response hop limit for metadata requests
   * .why = 1 keeps metadata host-only (blocks a container hop); 2 is the
   *        documented value for docker/containers that must reach metadata
   * .note = AWS accepts 1–64; a value outside that range is rejected by AWS at
   *         apply time (setEc2LaunchTemplate surfaces the AWS error)
   */
  httpPutResponseHopLimit: number;

  /**
   * .what = whether the http metadata endpoint is on
   * .why = 'enabled' keeps the instance role reachable; 'disabled' turns metadata
   *        off entirely (the instance role becomes unreachable)
   */
  httpEndpoint: 'enabled' | 'disabled';
}

export class DeclaredAwsEc2InstanceMetadataOptions
  extends DomainLiteral<DeclaredAwsEc2InstanceMetadataOptions>
  implements DeclaredAwsEc2InstanceMetadataOptions {}

/**
 * .what = the secure-by-default imdsv2 metadata options
 * .why = the single source of the secure default, shared by the set path (expand a
 *        null declaration to these values) and the cast path (collapse a read-back
 *        that equals these back to null, so a secure box converges to KEEP)
 * .note = hop limit 1 = host-only; a docker/container box opts into 2 explicitly
 * .note = frozen: this ONE object instance backs every launch template declared with
 *   metadataOptions: null (the module-level fallback in setEc2LaunchTemplate + the
 *   per-sub-field fallback in the cast). a caller is meant to SPREAD it
 *   ({ ...ec2InstanceMetadataOptionsSecure, httpPutResponseHopLimit: 2 }); Object.freeze
 *   makes an accidental in-place write (ec2InstanceMetadataOptionsSecure.httpTokens =
 *   'optional') throw in strict mode instead of a silent degrade of the secure default for
 *   every subsequent declaration — the exact failure class this feature prevents
 */
export const ec2InstanceMetadataOptionsSecure: DeclaredAwsEc2InstanceMetadataOptions =
  Object.freeze({
    httpTokens: 'required',
    httpPutResponseHopLimit: 1,
    httpEndpoint: 'enabled',
  });

/**
 * .what = the AWS implicit (insecure) metadata options — imdsv1-allowed
 * .why = a launch template created with NO MetadataOptions is imdsv1-allowed at AWS
 *        (httpTokens defaults to 'optional'). the cast reads such a template back as
 *        these values (NOT null) so it does NOT collapse to the secure default — a
 *        pre-feature template plans a change (then, immutable, fails loud →
 *        prune-then-recreate) instead of a false KEEP that masks an insecure box
 * .note = the honest read of the live truth (rule.require.immutable-source-of-truth):
 *        an absent MetadataOptions means imdsv1-allowed, not secure
 */
export const ec2InstanceMetadataOptionsAwsImplicit: DeclaredAwsEc2InstanceMetadataOptions =
  Object.freeze({
    httpTokens: 'optional',
    httpPutResponseHopLimit: 1,
    httpEndpoint: 'enabled',
  });

/**
 * .what = reduces a metadataOptions value to its ONE canonical declared form: a value
 *   structurally equal to the secure default (or a null) becomes null; any other value
 *   is returned unchanged
 * .why = null is the canonical "secure-by-default" representation, and there are THREE
 *   ways a secure box can arrive: a caller omits the field (null), a caller writes the
 *   literal secure object, or AWS reads a secure box back. declastruct decides KEEP via
 *   serialize(desired) === serialize(remote) — plain structural equality (see
 *   declastruct computeChange). so BOTH the DESIRED side (the caller's object) AND the
 *   REMOTE side (the read-back) must reduce every secure form to the SAME null, else a
 *   caller who declares the literal secure values plans UPDATE forever (immutable ->
 *   fails loud). applied at DeclaredAwsEc2LaunchTemplate construction so both sides
 *   converge symmetrically (rule.require.guaranteed-idempotency)
 * .note = a non-secure value (opt-out httpTokens=optional, or a raised hop limit) is
 *   returned unchanged, so an explicit non-default posture is preserved + honestly
 *   diffed. the AWS-implicit (imdsv1-allowed) value is non-secure, so it is preserved
 *   too — a pre-feature template still plans a change
 */
export const asCanonicalEc2InstanceMetadataOptions = (
  metadataOptions: DeclaredAwsEc2InstanceMetadataOptions | null,
): DeclaredAwsEc2InstanceMetadataOptions | null => {
  // a null is already canonical (secure-by-default)
  if (!metadataOptions) return null;

  // a value structurally equal to the secure default collapses to null. serialize()
  // equality (not a field-by-field && check) so a sub-field added to the interface
  // later — the vision names HttpProtocolIpv6 / InstanceMetadataTags as additive
  // follow-ups — is compared automatically. a hand-rolled && would silently forget the
  // new field and false-collapse a value that differs ONLY in it: a false KEEP that
  // masks real drift, the exact failure rule.require.immutable-source-of-truth guards
  // against. same serialize()-equality the KEEP-convergence proof already relies on.
  //
  // spread each operand into a plain object FIRST: serialize() tags a DomainObject
  // instance with a _dobj key (its constructor name) but never tags a plain literal, so
  // a caller who passes `new DeclaredAwsEc2InstanceMetadataOptions({...secure})` instead
  // of a bare literal would otherwise NOT collapse — a re-introduction of the
  // UPDATE-forever / immutable-throw bug this mechanism exists to prevent. the spread
  // copies own enumerable data fields (incl. any future sub-field) and drops the instance
  // marker, so a plain literal and an equivalent instance compare equal.
  if (
    serialize({ ...metadataOptions }) ===
    serialize({ ...ec2InstanceMetadataOptionsSecure })
  )
    return null;

  // any other (explicit non-default) value is preserved as-is
  return metadataOptions;
};
