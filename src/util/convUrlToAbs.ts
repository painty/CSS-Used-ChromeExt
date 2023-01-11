function convUrlToAbs(baseURI: string | URL, url: string | URL) {
  return new URL(url, baseURI).href;
}
export default convUrlToAbs;
