/**
 * 海外和国内用的是同一个 CDN 域名，全球加速，源站是国内站点
 * 现在只考虑了国内站点用 proxy 请求海外对象存储的资源，所以这样更好
 *
 * ~~todo 还需要处理下海外站点请求国内对象存储的资源，客户端问题还好，主要是后端取数据给模型用的时候，可能会有问题~~
 * 目前海外没问题，由于国内和海外用了同一个CDN，这个CDN是连接国内站点的，国内站点访问两边的资源都没问题，代理会配置规则，所以只要用了CDN域名，海外访问就没问题。
 */

export function getObjectCdnOrigin(): string {
  if (typeof window !== "undefined") {
    return (window.document.documentElement.getAttribute("data-object-cdn-origin") ?? "") as string;
  } else {
    // 可以为空字符串的，这样就是用源站域名
    return (process.env.OBJECT_CDN_ORIGIN ?? "") as string;
  }
}

export function proxiedObjectCdnUrl({
  name,
  objectUrl,
  mimeType,
}: {
  name: string;
  objectUrl: string;
  mimeType: string;
}) {
  const objectCdnOrigin = getObjectCdnOrigin();
  // 可以为空字符串的，这样就是用源站域名
  // if (!objectCdnOrigin) {
  //   throw new Error("OBJECT_CDN_ORIGIN environment variable is not set");
  // }
  const fileNameInUrl = objectUrl.split("?")[0].split("/").pop() as string;
  // const cdnUrl = `${objectCdnOrigin}/cdn/proxy-object/${name ? name : fileNameInUrl}?objectUrl=${encodeURIComponent(objectUrl)}&mimeType=${mimeType}&cache=${cache}&parse=${parse}`;
  const cdnUrl = new URL(`${objectCdnOrigin}/cdn/proxy-object/${name ? name : fileNameInUrl}`);
  cdnUrl.searchParams.set("objectUrl", objectUrl);
  cdnUrl.searchParams.set("mimeType", mimeType);
  cdnUrl.searchParams.set("cache", "false"); // 不用 cache, 因为 cdn 已经 cache 了
  cdnUrl.searchParams.set("parse", "false"); // parse = (mimeType === "application/pdf").toString()l
  return cdnUrl.toString();
}

export function proxiedImageCdnUrl({
  src,
  width = 1920,
  quality = 100,
}: {
  src: string;
  width?: number;
  quality?: number;
}) {
  const objectCdnOrigin = getObjectCdnOrigin();
  // 可以为空字符串的，这样就是用源站域名
  // if (!objectCdnOrigin) {
  //   throw new Error("OBJECT_CDN_ORIGIN environment variable is not set");
  // }
  const fileNameInUrl = src.split("?")[0].split("/").pop() as string;
  const proxiedUrl = `/cdn/proxy-image/${fileNameInUrl}?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
  if (objectCdnOrigin) {
    // CDN 已经缓存了，所以不再需要 /_next/image
    // return new URL(proxiedUrl, objectCdnOrigin).toString();
    return `${objectCdnOrigin}${proxiedUrl}`;
  } else {
    // 这样可以使用 nextjs 的图像优化方法以及缓存 .next/cache/images，线上不需要
    return `${objectCdnOrigin}/_next/image?url=${encodeURIComponent(proxiedUrl)}&w=${width}&q=${quality}`;
  }
}

export function noProxiedImageCdnUrl({
  src,
  width = 1920,
  quality = 100,
}: {
  src: string;
  width?: number;
  quality?: number;
}) {
  const objectCdnOrigin = getObjectCdnOrigin();
  // 可以为空字符串的，这样就是用源站域名
  // if (!objectCdnOrigin) {
  //   throw new Error("OBJECT_CDN_ORIGIN environment variable is not set");
  // }
  // 和 proxiedImageCdnUrl 不同的是，因为 src 可能是外部资源，这里没有 proxy-image 去下载资源，所以还是需要 /_next/image
  return `${objectCdnOrigin}/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}
