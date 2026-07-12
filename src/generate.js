import { loadConfig } from './config.js';
import { fetchPublicEvents } from './fetch-events.js';
import { buildSlides } from './enrich-events.js';

export async function fetchActivitySlides(config = loadConfig()) {
  console.log(`Fetching public events for ${config.username}…`);
  const events = await fetchPublicEvents(config);
  return buildSlides(events, config);
}
