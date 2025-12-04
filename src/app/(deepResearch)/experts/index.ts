import { grokExpert } from "./Grok";
import { trendExplorerExpert } from "./TrendExplorer";
import { ExpertExecutor, ExpertName } from "./types";

type ConcreteExpert = Exclude<ExpertName, ExpertName.Auto>;

const expertExecutors: Record<ConcreteExpert, ExpertExecutor> = {
  [ExpertName.Grok]: grokExpert,
  [ExpertName.TrendExplorer]: trendExplorerExpert,
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
