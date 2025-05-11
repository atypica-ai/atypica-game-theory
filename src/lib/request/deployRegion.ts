export type TDeployRegion = "mainland" | "global";

export function getDeployRegion(): TDeployRegion {
  if (typeof window !== "undefined") {
    return window.document.documentElement.getAttribute("data-deploy-region") as TDeployRegion;
  } else {
    return process.env.DEPLOY_REGION as TDeployRegion;
  }
}
