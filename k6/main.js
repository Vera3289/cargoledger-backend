import { smokeOptions, loadOptions, stressOptions, soakOptions } from './config.js';
import { healthScenario } from './scenarios/health.js';
import { shipmentsScenario } from './scenarios/shipments.js';

const scenario = __ENV.SCENARIO || 'smoke';

const optionsMap = {
  smoke: smokeOptions,
  load: loadOptions,
  stress: stressOptions,
  soak: soakOptions,
};

export const options = optionsMap[scenario] || smokeOptions;

export default function () {
  healthScenario();
  shipmentsScenario();
}
