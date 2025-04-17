export function tryFindValidImage(url_list: string[]) {
  const validImage = url_list.find((url) => /\.(jpeg|jpg|png|webp)\?/.test(url));
  return validImage || url_list[0];
}
