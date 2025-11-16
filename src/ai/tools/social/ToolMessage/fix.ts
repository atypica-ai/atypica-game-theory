export function fixXHSImageSrc(src: string): string {
  if (/xhscdn.+imageView2.+heif/.test(src)) {
    return src.split("?")[0];
  } else {
    return src;
  }
}
