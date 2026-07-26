import { asHashShake256 } from 'hash-fns';

// the max chars the readable slug may span, so the escaped name stays compact once the
// hash suffix + declastruct prefix are added. this is a DECORATIVE bound on the unsafe-
// branch slug only — it is NOT a safety gate (see commentIsSsmSafe, charset-only)
const SLUG_LENGTH_MAX = 40;

// the byte length of the shake256 suffix (→ SLUG_HASH_BYTES * 2 hex chars); 8 bytes = 64
// bits, ample to keep a per-instance handful of comments collision-free while compact
const SLUG_HASH_BYTES = 8;

/**
 * .what = derives the SSM Parameter Store name for an authorized SSH key from its
 *   unique key (instance exid + comment)
 * .why = SSM param names allow only `[A-Za-z0-9._-]` per path segment, but SSH key
 *   comments default to `user@host` (ssh-keygen) — the `@` makes AWS reject the name.
 *   this transformer is the ONE place the name is composed, so get / set / del cannot
 *   drift apart (a re-plan must derive the same name a prior apply wrote).
 * .note
 *   - a comment that is ALREADY SSM-safe keeps its LITERAL name — byte-identical to
 *     the pre-fix bare-comment name — so an upgrade never orphans a param a prior apply
 *     already wrote (only a comment with an illegal char, the bug this fixes, changes)
 *   - the safety gate is CHARSET-ONLY: the pre-fix code used the comment verbatim with no
 *     length gate, so any comment AWS accepted before (charset-legal, any length) must keep
 *     its literal name. the length cap is NOT a safety concern here — it only bounds the
 *     decorative slug in the escaped branch, which is why it does not gate this decision
 *   - an unsafe comment maps to a `slug-hash` combo: the slug keeps the name human-
 *     readable ("who is this key for?"), the hash guarantees uniqueness + determinism
 *   - the slug is decorative + lossy (two comments can slug alike); the HASH is what
 *     keeps distinct comments distinct, so this is NOT the naive-replace collision trap
 *   - the full, readable comment still lives in the param VALUE (setEc2SshKeyAuthorized)
 *   - exid is NOT hashed — it is already SSM-safe by our instance-name convention
 */
export const asEc2SshKeyAuthorizedSsmParameterName = (input: {
  instanceExid: string;
  comment: string;
}): string => {
  // an already-safe comment (charset-legal, any length) keeps its literal segment, so a
  // name a prior apply wrote stays stable across the upgrade; only an illegal-char comment
  // is escaped into a slug-hash segment (the bug this fixes)
  const commentIsSsmSafe = /^[A-Za-z0-9._-]+$/.test(input.comment);
  const segment = commentIsSsmSafe
    ? input.comment
    : asEscapedCommentSegment(input.comment);

  return `/declastruct/ec2/ssh-keys/${input.instanceExid}/${segment}`;
};

/**
 * .what = escapes a comment that holds an illegal char into an SSM-safe name segment
 * .why = keeps the escape logic (slug + collision-safe hash) off the literal path, so the
 *   hash is computed only when it is actually used
 * .note = the segment is a `slug-hash` combo, or the hash alone when the slug is empty
 *   (a comment with no safe char at all, e.g. `@@@`) — which avoids a lead `-`
 */
const asEscapedCommentSegment = (comment: string): string => {
  // readable, lossy slug: replace illegal chars, collapse repeats, bound length, then trim
  // note: the length bound runs BEFORE the trim so a mid-run cut cannot re-expose a
  //   lead/trail dash (e.g. a 40th char that lands on a `-`)
  const slug = comment
    .replace(/[^A-Za-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, SLUG_LENGTH_MAX)
    .replace(/^-+|-+$/g, '');

  // collision-safe suffix: a truncated shake256 of the full comment
  const hash = asHashShake256(comment, { bytes: SLUG_HASH_BYTES });

  return slug ? `${slug}-${hash}` : hash;
};
