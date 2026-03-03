/**
 * 海外和国内用的是同一个 CDN 域名，全球加速，源站是国内站点
 * 现在只考虑了国内站点用 proxy 请求海外对象存储的资源，所以这样更好
 *
 * ~~todo 还需要处理下海外站点请求国内对象存储的资源，客户端问题还好，主要是后端取数据给模型用的时候，可能会有问题~~
 * 目前海外没问题，由于国内和海外用了同一个CDN，这个CDN是连接国内站点的，国内站点访问两边的资源都没问题，代理会配置规则，所以只要用了CDN域名，海外访问就没问题。
 */
export function getProxyCdnOrigin(): string {
  if (typeof window !== "undefined") {
    return (window.document.documentElement.getAttribute("data-proxy-cdn-origin") ?? "") as string;
  } else {
    // 可以为空字符串的，这样就是用源站域名
    return (process.env.PROXY_CDN_ORIGIN ?? "") as string;
  }
}

/**
 * 生成 /cdn/proxy-object?objectUrl=&mimeType= 形式的链接，在服务器上下载文件，缓存返回
 */
export function proxiedObjectCdnUrl({
  name,
  objectUrl,
  mimeType,
}: {
  name?: string;
  objectUrl: string;
  mimeType: string;
}) {
  const proxyCdnOrigin = getProxyCdnOrigin();
  // 可以为空字符串的，这样就是用源站域名
  // if (!proxyCdnOrigin) {
  //   throw new Error("PROXY_CDN_ORIGIN environment variable is not set");
  // }
  const fileNameInUrl = objectUrl.split("?")[0].split("/").pop() as string;
  const cache = "false"; // 不用 cache, 因为 cdn 已经 cache 了
  const parse = "false"; // parse = (mimeType === "application/pdf").toString()
  // 对 name 进行 URL 编码,避免特殊字符(如 %)导致的双重编码问题
  const encodedName = name ? encodeURIComponent(name) : fileNameInUrl;
  const cdnUrl = `${proxyCdnOrigin}/cdn/proxy-object/${encodedName}?objectUrl=${encodeURIComponent(objectUrl)}&mimeType=${mimeType}&cache=${cache}&parse=${parse}`;
  return cdnUrl;
}

export function proxiedImageCdnUrl(args: {
  src: string;
  width?: number;
  height?: number;
  quality?: number;
}): string;
export function proxiedImageCdnUrl(args: {
  objectUrl: string;
  width?: number;
  height?: number;
  quality?: number;
}): string;

/**
 * 生成 /cdn/proxy-image?url=xxx (或 ?objectUrl=xxx) 形式的链接，在服务器上下载图片，处理尺寸以后，缓存返回
 *
 * @param src: 任意图片 src, 通过代理访问
 * @param objectUrl: AWS_S3_CONFIG 里面配置过的 S3 object url, 无需签名
 * @param width: 目标宽度
 * @param height: 目标高度 (如果同时提供 width 和 height，会进行裁剪)
 * @param quality: 图片质量 (1-100)
 * @todo proxy-image api 需要有自己的签名并支持有效期，以防传入任意 src 或者长期外链 objectUrl 滥用
 */
export function proxiedImageCdnUrl({
  src,
  objectUrl,
  width = 1920,
  height,
  quality = 100,
}: {
  src?: string;
  objectUrl?: string;
  width?: number;
  height?: number;
  quality?: number;
}) {
  if ((!src && !objectUrl) || (src && objectUrl)) {
    throw new Error("Either src or objectUrl must be provided");
  }

  const proxyCdnOrigin = getProxyCdnOrigin();
  // 可以为空字符串的，这样就是用源站域名
  // if (!proxyCdnOrigin) {
  //   throw new Error("PROXY_CDN_ORIGIN environment variable is not set");
  // }
  const fileNameInUrl = src
    ? (src.split("?")[0].split("/").pop() as string)
    : objectUrl
      ? (objectUrl.split("?")[0].split("/").pop() as string)
      : "404";

  // 构建查询参数
  const params = new URLSearchParams();
  if (src) {
    params.set("url", src);
  } else if (objectUrl) {
    params.set("objectUrl", objectUrl);
  }
  params.set("w", width.toString());
  if (height !== undefined) {
    params.set("h", height.toString());
  }
  params.set("q", quality.toString());

  const proxiedUrl = `/cdn/proxy-image/${fileNameInUrl}?${params.toString()}`;

  if (proxyCdnOrigin) {
    // CDN 已经缓存了，所以不再需要 /_next/image
    // return new URL(proxiedUrl, proxyCdnOrigin).toString();
    return `${proxyCdnOrigin}${proxiedUrl}`;
  } else {
    // 这样可以使用 nextjs 的图像优化方法以及缓存 .next/cache/images，线上不需要
    return `/_next/image?url=${encodeURIComponent(proxiedUrl)}&w=${width}&q=${quality}`;
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
  const proxyCdnOrigin = getProxyCdnOrigin();
  // 可以为空字符串的，这样就是用源站域名
  // if (!proxyCdnOrigin) {
  //   throw new Error("PROXY_CDN_ORIGIN environment variable is not set");
  // }
  // 和 proxiedImageCdnUrl 不同的是，因为 src 可能是外部资源，这里没有 proxy-image 去下载资源，所以还是需要 /_next/image
  return `${proxyCdnOrigin}/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}
