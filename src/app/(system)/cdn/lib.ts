export function getObjectCdnOrigin(): string {
  if (typeof window !== "undefined") {
    return window.document.documentElement.getAttribute("data-object-cdn-origin") as string;
  } else {
    return process.env.OBJECT_CDN_ORIGIN as string;
  }
}

export function proxiedObjectCdnUrl({
  objectUrl,
  mimeType,
}: {
  objectUrl: string;
  mimeType: string;
}) {
  const objectCdnOrigin = getObjectCdnOrigin();
  if (!objectCdnOrigin) {
    throw new Error("OBJECT_CDN_ORIGIN environment variable is not set");
  }
  const cdnUrl = `${objectCdnOrigin}/cdn/proxy-object?objectUrl=${encodeURIComponent(objectUrl)}&mimeType=${mimeType}`;
  // if (mimeType === "application/pdf") {
  //   cdnUrl += +"&parse=true";
  // }
  return cdnUrl;
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
  if (!objectCdnOrigin) {
    throw new Error("OBJECT_CDN_ORIGIN environment variable is not set");
  }
  const proxiedUrl = `/cdn/proxy-image?url=${encodeURIComponent(src)}`;
  // 这样可以使用 nextjs 的图像优化方法以及缓存 .next/cache/images
  return `${objectCdnOrigin}/_next/image?url=${encodeURIComponent(proxiedUrl)}&w=${width}&q=${quality}`;
}

export function noProxiedImageCdnUrl({
  src,
  width = 1920,
  quality = 100,
  origin,
}: {
  src: string;
  width?: number;
  quality?: number;
  origin?: string;
}) {
  const objectCdnOrigin = getObjectCdnOrigin();
  if (!objectCdnOrigin) {
    throw new Error("OBJECT_CDN_ORIGIN environment variable is not set");
  }
  return `${origin ? origin : objectCdnOrigin}/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}
