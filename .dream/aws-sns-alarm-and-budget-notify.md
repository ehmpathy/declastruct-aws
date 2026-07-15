# dream: aws-sns-alarm-and-budget-notify

## .what

add an AWS SNS topic + subscription resource pair so CloudWatch alarms — and, optionally,
budget alerts — can fan out to email / SMS via a shared topic. this is what
`DeclaredAwsCloudwatchMetricAlarm.alarmActions` needs to notify a human: an SNS topic ARN,
NOT a bare email.

## .why

`alarmActions` is a list of ARNs AWS invokes on breach. AWS does NOT accept an email address
there — the only "notify a human" target is an SNS topic ARN, and the topic holds the email /
SMS subscriptions. so to make the demo's `declastruct-demo-estimated-charges` alarm page
`seaturtle@ehmpath.com`, we need: (1) an SNS topic, (2) an email/SMS subscription to it,
(3) the topic ARN in `alarmActions`. SNS is a net-new service here — hence a separate feature.

**meanwhile the email alerts are NOT lost**: budget `DeclaredAwsBudgetNotification` already
emails `seaturtle@ehmpath.com` natively (Budgets supports EMAIL subscribers, no SNS). so the
$21 cap alerts already reach the human; the alarm's email path is the redundant second signal.

## .the ask

- **`DeclaredAwsSnsTopic`** — `unique=[name]`, `metadata=[arn]`, client `@aws-sdk/client-sns`
  (not installed — add via `set.package.install`), + DAO + acceptance
- **`DeclaredAwsSnsSubscription`** — `unique=[topic, protocol, endpoint]` (tuple identity,
  mirrors `DeclaredAwsBudgetNotification`); `protocol: 'email' | 'sms'`; email subs stay
  unconfirmed until a human clicks the AWS link (aws reports `PENDING_CONFIRMATION`) — the get
  must tolerate that
- wire the topic ARN into `alarmActions` (ref → arn at apply, mirrors `setBudgetAction`'s
  executionRole arn derivation); a budget notification's `subscribers` can also take the SNS
  channel, so one topic backs both
- **SMS** is just a second subscription with `protocol: 'sms'`, `endpoint: '+1...'` — note SNS
  SMS has account spend limits + an unverified-number sandbox to surface

## .until then

leave `alarmActions: []` in the demo posture; budget notifications carry the email alerts.

## .see also

- `DeclaredAwsCloudwatchMetricAlarm`, `DeclaredAwsBudgetNotification`, `setBudgetAction` (this repo)
- `rule.require.dao-and-acceptance-per-declared-resource`
