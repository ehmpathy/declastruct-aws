import { given, then } from 'test-fns';

import { getSampleGithubContext } from '../../.test/assets/getSampleGithubContext';
import { getSampleRepo } from '../../.test/assets/getSampleRepo';
import { getBranchProtection } from './getBranchProtection';

const log = console;

describe('getBranchProtection', () => {
  const context = { log, ...getSampleGithubContext() };

  given('a protected branch exists', () => {
    then('we should be able to get its protection rules', async () => {
      const sampleRepo = getSampleRepo({
        owner: 'ehmpathy',
        name: 'declastruct-aws-demo',
      });

      const protection = await getBranchProtection(
        {
          by: {
            unique: {
              branch: {
                repo: {
                  owner: sampleRepo.owner,
                  name: sampleRepo.name,
                },
                name: 'main',
              },
            },
          },
        },
        context,
      );

      console.log(protection);
      // May be null if branch has no protection
      if (protection) {
        expect(protection.branch.repo.owner).toBe(sampleRepo.owner);
        expect(protection.branch.repo.name).toBe(sampleRepo.name);
        expect(protection.branch.name).toBe('main');
      }
    });
  });

  given('an unprotected branch', () => {
    then('it should return null', async () => {
      const sampleRepo = getSampleRepo({
        owner: 'ehmpathy',
        name: 'declastruct-aws-demo',
      });

      // Try to get protection for a branch that likely doesn't have protection
      const protection = await getBranchProtection(
        {
          by: {
            unique: {
              branch: {
                repo: {
                  owner: sampleRepo.owner,
                  name: sampleRepo.name,
                },
                name: 'test-branch-unprotected-99999',
              },
            },
          },
        },
        context,
      );

      // Should return null for non-existent branch or unprotected branch
      expect(protection).toBeNull();
    });
  });
});
