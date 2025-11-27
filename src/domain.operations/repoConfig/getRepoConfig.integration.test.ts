import { given, then } from 'test-fns';

import { getSampleGithubContext } from '../../.test/assets/getSampleGithubContext';
import { getSampleRepo } from '../../.test/assets/getSampleRepo';
import { getRepoConfig } from './getRepoConfig';

const log = console;

describe('getRepoConfig', () => {
  const context = { log, ...getSampleGithubContext() };

  given('a live example repo exists', () => {
    then('we should be able to get its config', async () => {
      const sampleRepo = getSampleRepo({
        owner: 'ehmpathy',
        name: 'declastruct-aws-demo',
      });

      const config = await getRepoConfig(
        {
          by: {
            unique: {
              repo: {
                owner: sampleRepo.owner,
                name: sampleRepo.name,
              },
            },
          },
        },
        context,
      );

      console.log(config);
      expect(config).toBeDefined();
      expect(config?.repo.owner).toBe(sampleRepo.owner);
      expect(config?.repo.name).toBe(sampleRepo.name);
      expect(config?.defaultBranch).toBeDefined();
      expect(typeof config?.hasIssues).toBe('boolean');
      expect(typeof config?.hasProjects).toBe('boolean');
      expect(typeof config?.hasWiki).toBe('boolean');
      expect(typeof config?.allowSquashMerge).toBe('boolean');
      expect(typeof config?.allowMergeCommit).toBe('boolean');
      expect(typeof config?.allowRebaseMerge).toBe('boolean');
    });
  });

  given('a repo that does not exist', () => {
    then('it should return null', async () => {
      const config = await getRepoConfig(
        {
          by: {
            unique: {
              repo: {
                owner: 'ehmpathy',
                name: 'repo-that-does-not-exist-99999',
              },
            },
          },
        },
        context,
      );

      expect(config).toBeNull();
    });
  });
});
