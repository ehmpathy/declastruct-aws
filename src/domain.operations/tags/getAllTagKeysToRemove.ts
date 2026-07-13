import type { DeclaredAwsTags } from '@src/domain.objects/DeclaredAwsTags';

/**
 * .what = derives the tag keys present before but absent from the desired set
 * .why = tag drift reconciles by untag-then-tag; this is the untag half — the keys
 *        AWS must drop. extracted as a named transformer so the set* orchestrators
 *        read as narrative (per rule.forbid.inline-decode-friction)
 */
export const getAllTagKeysToRemove = (input: {
  before: DeclaredAwsTags | null;
  desired: DeclaredAwsTags | null;
}): string[] =>
  Object.keys(input.before ?? {}).filter(
    (key) => !input.desired || !(key in input.desired),
  );
