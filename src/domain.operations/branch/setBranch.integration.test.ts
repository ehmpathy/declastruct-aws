import { UnexpectedCodePathError } from 'helpful-errors';

import { getSampleGithubContext } from '../../.test/assets/getSampleGithubContext';
import { getSampleRepo } from '../../.test/assets/getSampleRepo';
import { getBranch } from './getBranch';
import { setBranch } from './setBranch';

const log = console;

describe('setBranch', () => {
  const context = { log, ...getSampleGithubContext() };

  describe('live tests', () => {
    it('should create a new branch with explicit commit.sha', async () => {
      const sampleRepo = getSampleRepo({
        owner: 'ehmpathy',
        name: 'declastruct-aws-demo',
      });

      // Get a commit SHA from the demo repo's main branch
      const demoRepoBranch =
        (await getBranch(
          {
            by: {
              unique: {
                repo: { owner: 'ehmpathy', name: 'declastruct-aws-demo' },
                name: 'main',
              },
            },
          },
          context,
        )) ??
        UnexpectedCodePathError.throw('demo repo branch not found', {
          sampleRepo,
        });

      const branchName = `test-branch-${Date.now()}`;

      const result = await setBranch(
        {
          finsert: {
            repo: {
              owner: sampleRepo.owner,
              name: sampleRepo.name,
            },
            name: branchName,
            commit: { sha: demoRepoBranch.commit!.sha },
          },
        },
        context,
      );

      expect(result).toBeDefined();
      expect(result.name).toBe(branchName);
      expect(result.commit?.sha).toBe(demoRepoBranch.commit!.sha);
    });

    it('should return existing branch for finsert', async () => {
      // Use the main declastruct-aws repo which we know exists
      const sampleRepo = getSampleRepo({
        owner: 'ehmpathy',
        name: 'declastruct-aws',
      });

      const result = await setBranch(
        {
          finsert: {
            repo: {
              owner: sampleRepo.owner,
              name: sampleRepo.name,
            },
            name: 'main',
          },
        },
        context,
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('main');
      expect(result.commit?.sha).toBeDefined();
    });
  });
});
