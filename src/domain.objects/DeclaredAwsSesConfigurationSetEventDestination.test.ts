import { RefByUnique } from 'domain-objects';
import { given, then, when } from 'test-fns';

import type { DeclaredAwsSesConfigurationSet } from './DeclaredAwsSesConfigurationSet';
import {
  asCanonicalSesEventTypes,
  DeclaredAwsSesConfigurationSetEventDestination,
} from './DeclaredAwsSesConfigurationSetEventDestination';
import { DeclaredAwsSesEventSink } from './DeclaredAwsSesEventSink';

/**
 * .what = colocated proof of the constructor's eventTypes canonicalization invariant
 * .why = the constructor is the chokepoint the KEEP-convergence design rests on — declastruct
 *   compares eventTypes order-sensitively against the sorted aws read-back, so a non-alphabetical
 *   declaration would plan UPDATE forever unless the declared value is sorted too. a future
 *   engineer who touches THIS constructor looks for its test HERE, so the invariant is proven
 *   next to the code that holds it (rule.require.guaranteed-idempotency)
 */
describe('DeclaredAwsSesConfigurationSetEventDestination constructor canonicalization', () => {
  const baseProps = {
    configurationSet: RefByUnique.as<typeof DeclaredAwsSesConfigurationSet>({
      name: 'ehmpathy-mail-events',
    }),
    name: 'to-cloudwatch',
    enabled: true,
    sink: new DeclaredAwsSesEventSink({
      cloudwatch: null,
      sns: RefByUnique.as({ name: 'ehmpathy-mail-events-topic' }),
    }),
  };

  given('eventTypes declared in a non-alphabetical order', () => {
    when('constructed', () => {
      then('eventTypes are sorted to a canonical order', () => {
        const destination = DeclaredAwsSesConfigurationSetEventDestination.as({
          ...baseProps,
          eventTypes: ['SEND', 'BOUNCE', 'DELIVERY', 'COMPLAINT', 'OPEN'],
        });
        // the declared value must converge to the SAME sorted order a read-back yields, else the
        // plan never reaches KEEP — order at the declaration site must be irrelevant
        expect(destination.eventTypes).toEqual([
          'BOUNCE',
          'COMPLAINT',
          'DELIVERY',
          'OPEN',
          'SEND',
        ]);
      });
    });
  });

  given('eventTypes already in canonical order', () => {
    when('constructed', () => {
      then('eventTypes are preserved in that same order', () => {
        const destination = DeclaredAwsSesConfigurationSetEventDestination.as({
          ...baseProps,
          eventTypes: ['BOUNCE', 'COMPLAINT', 'SEND'],
        });
        expect(destination.eventTypes).toEqual(['BOUNCE', 'COMPLAINT', 'SEND']);
      });
    });
  });

  given('the asCanonicalSesEventTypes transformer directly', () => {
    when('a shuffled list is passed', () => {
      then('it returns a new sorted list (input not mutated)', () => {
        const input: ('SEND' | 'BOUNCE' | 'OPEN')[] = [
          'SEND',
          'BOUNCE',
          'OPEN',
        ];
        const sorted = asCanonicalSesEventTypes(input);
        expect(sorted).toEqual(['BOUNCE', 'OPEN', 'SEND']);
        // a new array — the caller's declared list is not mutated in place
        expect(input).toEqual(['SEND', 'BOUNCE', 'OPEN']);
      });
    });
  });
});
