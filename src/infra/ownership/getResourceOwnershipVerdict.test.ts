import { given, then, when } from 'test-fns';

import {
  getResourceOwnershipVerdict,
  type ResourceOwnershipVerdict,
} from './getResourceOwnershipVerdict';

/**
 * .what = proves the ownership gate classifies every marker case correctly
 * .why = this verdict decides whether a set op may adopt a resource or must fail loud on
 *   a foreign claim (rule.forbid.silent-resource-theft). the branch is unit-critical:
 *   a wrong `foreign` misfires a block; a wrong `ours`/`unowned` silently steals
 */
describe('getResourceOwnershipVerdict', () => {
  const cases: {
    description: string;
    exidDetected: string | null | undefined;
    exidExpected: string;
    verdict: ResourceOwnershipVerdict;
  }[] = [
    {
      description: 'a null marker is unowned (a genuine orphan)',
      exidDetected: null,
      exidExpected: 'declastruct-demo-subnet-1a',
      verdict: 'unowned',
    },
    {
      description: 'an undefined marker is unowned',
      exidDetected: undefined,
      exidExpected: 'declastruct-demo-subnet-1a',
      verdict: 'unowned',
    },
    {
      description: 'an empty-string marker is unowned (blank tag = no claim)',
      exidDetected: '',
      exidExpected: 'declastruct-demo-subnet-1a',
      verdict: 'unowned',
    },
    {
      description: 'a marker equal to expected is ours',
      exidDetected: 'declastruct-demo-subnet-1a',
      exidExpected: 'declastruct-demo-subnet-1a',
      verdict: 'ours',
    },
    {
      description: 'a marker different from expected is foreign',
      exidDetected: 'declastruct-acceptance-subnet-1a',
      exidExpected: 'declastruct-demo-subnet-1a',
      verdict: 'foreign',
    },
    {
      description:
        'a marker that differs only by case is foreign (exact match)',
      exidDetected: 'Declastruct-Demo-Subnet-1a',
      exidExpected: 'declastruct-demo-subnet-1a',
      verdict: 'foreign',
    },
  ];

  given('a pre-extant marker and an expected exid', () => {
    cases.forEach((each) => {
      when(`[${each.description}]`, () => {
        then(`the verdict is "${each.verdict}"`, () => {
          expect(
            getResourceOwnershipVerdict({
              exidDetected: each.exidDetected,
              exidExpected: each.exidExpected,
            }),
          ).toEqual(each.verdict);
        });
      });
    });
  });
});
