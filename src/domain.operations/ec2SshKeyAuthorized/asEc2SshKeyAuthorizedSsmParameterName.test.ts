import { given, then, when } from 'test-fns';

import { asEc2SshKeyAuthorizedSsmParameterName } from './asEc2SshKeyAuthorizedSsmParameterName';

/**
 * .what = asserts every `/`-split segment of an SSM param name is SSM-safe
 * .why = AWS rejects a name whose segment holds any char outside `[A-Za-z0-9._-]`
 */
const eachSegmentIsSsmSafe = (name: string): boolean =>
  name
    .split('/')
    .filter((segment) => segment.length > 0)
    .every((segment) => /^[A-Za-z0-9._-]+$/.test(segment));

describe('asEc2SshKeyAuthorizedSsmParameterName', () => {
  given('[case1] a default ssh-keygen comment (user@host)', () => {
    const input = { instanceExid: 'grove-1-box', comment: 'vlad@grove-laptop' };

    when('[t0] the name is derived', () => {
      const name = asEc2SshKeyAuthorizedSsmParameterName(input);

      then(
        'the name is SSM-safe (no @, only [A-Za-z0-9._-] per segment)',
        () => {
          expect(name).not.toContain('@');
          expect(eachSegmentIsSsmSafe(name)).toBe(true);
        },
      );

      then('the name carries a readable slug of the comment', () => {
        expect(name).toContain('vlad-grove-laptop-');
      });

      then('the name keeps the declastruct prefix + exid verbatim', () => {
        expect(name).toContain('/declastruct/ec2/ssh-keys/grove-1-box/');
      });
    });
  });

  given('[case2] the same comment derived twice', () => {
    const input = { instanceExid: 'grove-1-box', comment: 'vlad@grove-laptop' };

    when('[t0] the transformer is called twice', () => {
      then(
        'it is deterministic — this is the get/set agreement guarantee',
        () => {
          // get + set both call THIS transformer with the same input; determinism
          // here is exactly what makes a re-plan find the name a prior apply wrote
          const first = asEc2SshKeyAuthorizedSsmParameterName(input);
          const second = asEc2SshKeyAuthorizedSsmParameterName(input);
          expect(first).toBe(second);
        },
      );
    });
  });

  given(
    '[case2b] the get-site input shape and the set-site input shape',
    () => {
      // prove get/set AGREE explicitly (not just determinism): mirror how each callsite
      // feeds the transformer. get holds `{ by: { unique: { instance, comment } } }`;
      // set holds a bare `DeclaredAwsEc2SshKeyAuthorized`. both must derive one name.
      const exid = 'grove-1-box';
      const comment = 'vlad@grove-laptop';
      const getSite = { by: { unique: { instance: { exid }, comment } } };
      const setSite = { instance: { exid }, comment };

      when(
        '[t0] each callsite derives the name the way it does in code',
        () => {
          then('get and set derive the SAME name', () => {
            const nameFromGet = asEc2SshKeyAuthorizedSsmParameterName({
              instanceExid: getSite.by.unique.instance.exid,
              comment: getSite.by.unique.comment,
            });
            const nameFromSet = asEc2SshKeyAuthorizedSsmParameterName({
              instanceExid: setSite.instance.exid,
              comment: setSite.comment,
            });
            expect(nameFromGet).toBe(nameFromSet);
          });
        },
      );
    },
  );

  given('[case3] two comments that differ ONLY in an illegal char', () => {
    // `a@b` and `a_b` both slug to `a-b` — the naive replace-only approach would
    // collide them onto one name; the hash suffix must keep them distinct
    const alpha = { instanceExid: 'box', comment: 'a@b' };
    const bravo = { instanceExid: 'box', comment: 'a_b' };

    when('[t0] both names are derived', () => {
      const alphaName = asEc2SshKeyAuthorizedSsmParameterName(alpha);
      const bravoName = asEc2SshKeyAuthorizedSsmParameterName(bravo);

      then('the two names are distinct (no collision)', () => {
        expect(alphaName).not.toBe(bravoName);
      });

      then('both are SSM-safe', () => {
        expect(eachSegmentIsSsmSafe(alphaName)).toBe(true);
        expect(eachSegmentIsSsmSafe(bravoName)).toBe(true);
      });
    });
  });

  given('[case4] comments with assorted illegal chars', () => {
    const comments = [
      'user@host',
      'name with spaces',
      'path/like/comment',
      'plus+equals=sign',
      'unicode-☃-snowman',
      'ssh-key-2026',
    ];

    when('[t0] each name is derived', () => {
      then('every derived name is SSM-safe', () => {
        comments.forEach((comment) => {
          const name = asEc2SshKeyAuthorizedSsmParameterName({
            instanceExid: 'box',
            comment,
          });
          expect(eachSegmentIsSsmSafe(name)).toBe(true);
        });
      });

      then('distinct comments derive distinct names', () => {
        const names = comments.map((comment) =>
          asEc2SshKeyAuthorizedSsmParameterName({
            instanceExid: 'box',
            comment,
          }),
        );
        expect(new Set(names).size).toBe(comments.length);
      });
    });
  });

  given('[case5] an empty comment', () => {
    const input = { instanceExid: 'box', comment: '' };

    when('[t0] the name is derived', () => {
      const name = asEc2SshKeyAuthorizedSsmParameterName(input);

      then(
        'the name is still SSM-safe (hash-only segment, no lead dash)',
        () => {
          expect(eachSegmentIsSsmSafe(name)).toBe(true);
          expect(name.endsWith('/')).toBe(false);
        },
      );
    });
  });

  given('[case6] a long comment whose length-bound cut lands on a dash', () => {
    // 39 safe chars, then `@` — after replace, index 40 is `-`, so a slice(0,40) that
    // ran BEFORE the trim would leave a dash at the end -> a `--` at the slug/hash join.
    // this guards the slice-before-trim order (the length bound must precede the trim).
    const input = {
      instanceExid: 'box',
      comment: `${'a'.repeat(39)}@extra-tail`,
    };

    when('[t0] the name is derived', () => {
      const name = asEc2SshKeyAuthorizedSsmParameterName(input);

      then('the slug does not leave a double dash before the hash', () => {
        expect(name).not.toContain('--');
      });

      then('the name is SSM-safe', () => {
        expect(eachSegmentIsSsmSafe(name)).toBe(true);
      });
    });
  });

  given('[case7] a comment that is already SSM-safe', () => {
    // backward-compat: a comment with no illegal char kept its bare name under the
    // pre-fix code, and that param already exists in AWS. the transformer must derive
    // the SAME literal name (no hash suffix) so an upgrade never orphans it and never
    // forces a re-create (which would need the box active).
    const input = {
      instanceExid: 'box',
      comment: 'declastruct-acceptance-seed',
    };

    when('[t0] the name is derived', () => {
      const name = asEc2SshKeyAuthorizedSsmParameterName(input);

      then('the segment is the literal comment (no hash suffix)', () => {
        expect(name).toBe(
          '/declastruct/ec2/ssh-keys/box/declastruct-acceptance-seed',
        );
      });

      then('the name is SSM-safe', () => {
        expect(eachSegmentIsSsmSafe(name)).toBe(true);
      });
    });
  });

  given('[case8] an already-safe comment longer than the slug bound', () => {
    // the length cap is a DECORATIVE bound on the escaped-branch slug, NOT a safety gate.
    // a charset-legal comment kept its bare name under the pre-fix code at ANY length, so
    // a 50-char safe comment must STILL derive its literal name — a length gate here would
    // re-orphan the pre-fix param (the exact backward-compat break, gated by length).
    const comment = 'deploy-key-for-prep-cluster-fleet-automation-2026-01';
    const input = { instanceExid: 'box', comment };

    when('[t0] the name is derived', () => {
      const name = asEc2SshKeyAuthorizedSsmParameterName(input);

      then('the comment is over the slug bound', () => {
        expect(comment.length).toBeGreaterThan(40);
      });

      then('the segment is still the literal comment (no hash suffix)', () => {
        expect(name).toBe(`/declastruct/ec2/ssh-keys/box/${comment}`);
      });

      then('the name is SSM-safe', () => {
        expect(eachSegmentIsSsmSafe(name)).toBe(true);
      });
    });
  });
});
