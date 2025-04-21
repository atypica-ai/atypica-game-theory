// node 18 和 20 的 fetch 函数不直接使用代理，需要额外实现
// https://stackoverflow.com/questions/72306101/make-a-request-in-native-fetch-with-proxy-in-nodejs-18
export default function proxiedImageLoader({ src }: { src: string }) {
  return `/api/proxy-image?url=${encodeURIComponent(src)}`;
}
