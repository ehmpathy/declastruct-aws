import { BadRequestError } from 'helpful-errors';

/**
 * .what = the per-type guidance used to compose the type-confusion guard message
 * .why = each expected type maps to the domain object that manages it + the sibling object a
 *   caller should reach for instead; centralizing the map keeps the two guard messages exact
 *   mirrors of each other, with no drift between the Plain and Secure call sites.
 */
const SSM_TYPE_GUIDE = {
  String: {
    manages: 'DeclaredAwsSsmParameterPlain',
    alt: 'DeclaredAwsSsmParameterSecure',
    altType: 'SecureString',
  },
  SecureString: {
    manages: 'DeclaredAwsSsmParameterSecure',
    alt: 'DeclaredAwsSsmParameterPlain',
    altType: 'String',
  },
} as const;

/**
 * .what = asserts a live SSM parameter's type matches the expected type; fails loud otherwise
 * .why = SSM shares ONE global name namespace across String/StringList/SecureString, so a Plain
 *   declared at a SecureString name (or vice versa) would let a later write DOWNGRADE a secret or
 *   misroute a non-secret into the write-only flow. this is the security-critical seam of the
 *   whole feature, so it lives in ONE place — called from both getOne orchestrators — rather than
 *   two hand-kept-in-sync copies (rule.prefer.most-common-denominator).
 * .note = throws a BadRequestError (caller-actionable) on any mismatch; a no-op on a match.
 *   StringList is never the expected type, so it always fails the guard — unsupported by design.
 */
export const assertSsmParameterType = (input: {
  found: { name: string; type: string };
  expected: 'String' | 'SecureString';
}): void => {
  // a match is the happy path — the guard passes
  if (input.found.type === input.expected) return;

  // a mismatch is a hard stop — compose the mirror-image message from the type guide
  const guide = SSM_TYPE_GUIDE[input.expected];
  BadRequestError.throw(
    `parameter '${input.found.name}' is a ${input.found.type}, not a ${input.expected}; will not manage it as ${guide.manages}. use ${guide.alt} for a ${guide.altType} instead; StringList is unsupported.`,
    { name: input.found.name, type: input.found.type },
  );
};
