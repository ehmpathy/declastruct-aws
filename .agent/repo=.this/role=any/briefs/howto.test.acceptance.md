# Acceptance Testing

How to run acceptance tests for declastruct-aws.

## Prerequisites

1. **AWS Profile**: You must have AWS credentials configured. Source the dev profile:
   ```sh
   source .agent/repo=.this/skills/use.demo.awsprofile.sh
   ```

2. **Build the project**: Acceptance tests use the `dist/` output, so you must build first:
   ```sh
   npm run build
   ```

## Running Acceptance Tests

```sh
source .agent/repo=.this/skills/use.demo.awsprofile.sh && npm run build && npm run test:acceptance
```

Or with the locally flag if needed:
```sh
source .agent/repo=.this/skills/use.demo.awsprofile.sh && npm run build && npm run test:acceptance:locally
```

## How It Works

The acceptance tests use declastruct CLI to:
1. Parse resources from `src/contract/sdks/.test/assets/resources.acceptance.ts`
2. Generate a plan via `npx declastruct plan`
3. Apply the plan via `npx declastruct apply`
4. Verify resources were created correctly

### Key Files

- **Resources file**: `src/contract/sdks/.test/assets/resources.acceptance.ts`
  - Defines `getProviders()` - returns AWS provider
  - Defines `getResources()` - returns resource declarations (lambdas, roles, tunnels, reports, etc.)

- **Test file**: `src/contract/sdks/declastruct.acceptance.test.ts`
  - Contains acceptance test cases

### Adding New Resources to Test

1. Add imports to `resources.acceptance.ts`
2. Create the resource declaration using `DeclaredAwsXxx.as({ ... })`
3. Add it to the return array in `getResources()`
4. Add test assertions in `declastruct.acceptance.test.ts`

## Common Issues

### "AWS region not specified"
Ensure you've sourced the AWS profile script before running tests.

### Changes not reflected
Make sure to run `npm run build` before acceptance tests - they use `dist/` exports.

### Lambda logs not available
Log group reports query CloudWatch Logs. If the lambda was just created, wait a few minutes for logs to propagate. The test invokes the lambda in a `beforeAll` to generate logs.
