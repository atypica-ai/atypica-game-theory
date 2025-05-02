"use server";
import { ProxyAgent, fetch as nodeFetch } from "undici";
import { rootLogger } from "./logging";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function proxiedFetch(url: any, init?: any): Promise<any> {
  rootLogger.debug({ msg: "proxiedFetch", url, settings: init });
  const proxyUrl = process.env.FETCH_HTTPS_PROXY;
  const proxyAgent = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
  return nodeFetch(url, {
    ...init,
    dispatcher: proxyAgent,
  });
}
