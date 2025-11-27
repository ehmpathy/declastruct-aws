import { given, then } from 'test-fns';

import { getSampleGithubContext } from '../../.test/assets/getSampleGithubContext';
import { getSampleRepo } from '../../.test/assets/getSampleRepo';
import { getBranch } from './getBranch';

const log = console;

describe('getBranch', () => {
  const context = { log, ...getSampleGithubContext() };

  given('a live example repo with a main branch', () => {
    then('we should be able to get the branch state', async () => {
      const sampleRepo = getSampleRepo({
        owner: 'ehmpathy',
        name: 'declastruct-aws-demo',
      });

      const branch = await getBranch(
        {
          by: {
            unique: {
              repo: {
                owner: sampleRepo.owner,
                name: sampleRepo.name,
              },
              name: 'main',
            },
          },
        },
        context,
      );

      console.log(branch);
      expect(branch).toBeDefined();
      expect(branch?.name).toBe('main');
      expect(branch?.repo).toEqual({
        owner: sampleRepo.owner,
        name: sampleRepo.name,
      });
      expect(branch?.commit?.sha).toBeDefined();
      expect(typeof branch?.protected).toBe('boolean');
    });
  });

  given('a branch that does not exist', () => {
    then('it should return null', async () => {
      const sampleRepo = getSampleRepo({
        owner: 'ehmpathy',
        name: 'declastruct-aws-demo',
      });

      const branch = await getBranch(
        {
          by: {
            unique: {
              repo: {
                owner: sampleRepo.owner,
                name: sampleRepo.name,
              },
              name: 'branch-that-does-not-exist-99999',
            },
          },
        },
        context,
      );

      expect(branch).toBeNull();
    });
  });
});
