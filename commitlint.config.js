module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [1, 'always', 140],
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'cont', // continuation commit for multi-commit PRs
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
      ],
    ],
  },
};
