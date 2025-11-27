import { getSampleGithubContext } from '../../.test/assets/getSampleGithubContext';
import { getSampleRepo } from '../../.test/assets/getSampleRepo';
import { getBranchProtection } from './getBranchProtection';
import { setBranchProtection } from './setBranchProtection';

const log = console;

describe('setBranchProtection', () => {
  const context = { log, ...getSampleGithubContext() };

  describe('live tests', () => {
    it('should update branch protection rules', async () => {
      const sampleRepo = getSampleRepo({
        owner: 'ehmpathy',
        name: 'declastruct-aws-demo',
      });

      // Get current protection (if any)
      const currentProtection = await getBranchProtection(
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

      console.log('Current protection:', currentProtection);

      // Update protection with upsert
      const result = await setBranchProtection(
        {
          upsert: {
            branch: {
              repo: { owner: sampleRepo.owner, name: sampleRepo.name },
              name: 'main',
            },
            enforceAdmins: false,
            allowsDeletions: false,
            allowsForcePushes: false,
            requireLinearHistory: false,
            requiredStatusChecks: null,
            requiredPullRequestReviews: {
              requiredApprovingReviewCount: 1,
            },
            restrictions: null,
          },
        },
        context,
      );

      expect(result).toBeDefined();
      expect(result.branch.repo.owner).toBe(sampleRepo.owner);
      expect(result.branch.repo.name).toBe(sampleRepo.name);
      expect(result.branch.name).toBe('main');
    });

    it('should return existing protection for finsert', async () => {
      const sampleRepo = getSampleRepo({
        owner: 'ehmpathy',
        name: 'declastruct-aws-demo',
      });

      // Get current protection
      const currentProtection = await getBranchProtection(
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

      // Only run finsert test if protection exists
      if (currentProtection) {
        // Finsert should return existing protection without making changes
        const result = await setBranchProtection(
          {
            finsert: {
              branch: {
                repo: { owner: sampleRepo.owner, name: sampleRepo.name },
                name: 'main',
              },
              enforceAdmins: true,
              allowsDeletions: true,
              allowsForcePushes: true,
              requireLinearHistory: true,
            },
          },
          context,
        );

        expect(result).toBeDefined();
        expect(result.branch.name).toBe('main');
        // Should match current protection, not the finsert values
        expect(result).toEqual(currentProtection);
      }
    });
  });
});
