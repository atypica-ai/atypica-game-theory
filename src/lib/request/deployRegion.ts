export type TDeployRegion = "mainland" | "global";

export function getDeployRegion(): TDeployRegion {
  return process.env.DEPLOY_REGION as TDeployRegion;
}
