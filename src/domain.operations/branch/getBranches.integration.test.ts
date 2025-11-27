import { given, then } from 'test-fns';

import { getSampleGithubContext } from '../../.test/assets/getSampleGithubContext';
import { getSampleRepo } from '../../.test/assets/getSampleRepo';
import { getBranches } from './getBranches';

const log = console;

describe('getBranches', () => {
  const context = { log, ...getSampleGithubContext() };

  given('a live example repo with branches', () => {
    then('we should be able to list its branches', async () => {
      const sampleRepo = getSampleRepo({
        owner: 'ehmpathy',
        name: 'declastruct-aws-demo',
      });

      const branches = await getBranches(
        {
          where: {
            repo: {
              owner: sampleRepo.owner,
              name: sampleRepo.name,
            },
          },
        },
        context,
      );

      console.log(branches);
      expect(branches).toBeDefined();
      expect(Array.isArray(branches)).toBe(true);
      expect(branches.length).toBeGreaterThan(0);

      // verify first branch has expected shape
      const firstBranch = branches[0];
      expect(firstBranch?.name).toBeDefined();
      expect(firstBranch?.commit?.sha).toBeDefined();
      expect(firstBranch?.repo).toEqual({
        owner: sampleRepo.owner,
        name: sampleRepo.name,
      });
      expect(typeof firstBranch?.protected).toBe('boolean');
    });
  });
});
