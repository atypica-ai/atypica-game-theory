"use server";
import { rootLogger } from "@/lib/logging";
import { HttpsProxyAgent } from "https-proxy-agent";
import https from "node:https";
import { ProxyAgent, fetch as nodeFetch } from "undici";

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

// Vertex provider 里授权的部分没有用 fetch，使用的是 https 库
// 这是最近 vertex api 经常调用不通的原因，是因为获取授权信息失败
const originRequest = https.request;
if (process.env.FETCH_HTTPS_PROXY) {
  const httpsProxyAgent = new HttpsProxyAgent(process.env.FETCH_HTTPS_PROXY);
  // https.globalAgent = httpsProxyAgent;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  https.request = function (...args: any) {
    try {
      rootLogger.info({ msg: "Overriding https.request", args });
      let options = null;
      let url = null;
      if (typeof args[0] === "string") {
        [url, options] = args;
      }
      if (typeof args[0] === "object") {
        url = args[0].href;
        options = args[0];
      }
      if (
        /accounts\.google\.com|oauth2\.googleapis\.com|www\.googleapis\.com\/oauth2/.test(url) &&
        // /openid-client/.test(options?.headers?.["User-Agent"]) &&
        !options.agent
      ) {
        options.agent = httpsProxyAgent;
      }
    } catch (error) {
      rootLogger.error(`Error in https.request: ${(error as Error).message}`);
    }
    return originRequest.apply(https, args);
  };
}
