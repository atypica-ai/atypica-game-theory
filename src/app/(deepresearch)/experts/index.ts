import { grokExpert } from "./Grok";
import { ExpertName } from "./types";

type ConcreteExpert = Exclude<ExpertName, ExpertName.Auto>;
type ExpertExecutor = typeof grokExpert;

const expertExecutors: Record<ConcreteExpert, ExpertExecutor> = {
  [ExpertName.Grok]: grokExpert,
};

const DEFAULT_EXPERT: ConcreteExpert = ExpertName.Grok;

export function resolveExpert(expert?: ExpertName) {
  const resolvedName: ConcreteExpert =
    expert && expert !== ExpertName.Auto ? expert : DEFAULT_EXPERT;

  const executor = expertExecutors[resolvedName];

  if (!executor) {
    throw new Error(`No expert registered for "${resolvedName}"`);
  }

  return {
    name: resolvedName,
    executor,
  };
}

export { DEFAULT_EXPERT };


