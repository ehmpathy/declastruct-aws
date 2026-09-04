import type { getConfigurationSetEventDestinations } from '@src/access/sdks/sdkSesv2/getConfigurationSetEventDestinations';

/**
 * .what = the friendly event-destination shape read off a configuration set
 */
type SesEventDestinationRead = NonNullable<
  Awaited<ReturnType<typeof getConfigurationSetEventDestinations>>
>[number];

/**
 * .what = picks the one event destination whose name matches, else null
 * .why = names the in-memory lookup so the getOne orchestrator reads as one operation instead
 *   of an inline find predicate (rule.forbid.inline-decode-friction)
 */
export const getOneDestinationByName = (input: {
  destinations: SesEventDestinationRead[];
  name: string;
}): SesEventDestinationRead | null =>
  input.destinations.find((each) => each.name === input.name) ?? null;
