export type TDeployRegion = "mainland" | "global";

export function deployRegion(): TDeployRegion {
  return process.env.DEPLOY_REGION as TDeployRegion;
}

export function useDeployRegion(): TDeployRegion {
  if (typeof window !== "undefined") {
    return window.document.documentElement.getAttribute("data-deploy-region") as TDeployRegion;
  } else {
    throw new Error("useDeployRegion is not available in server-side rendering");
  }
}
