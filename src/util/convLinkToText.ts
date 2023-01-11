/* global chrome */
import isutf8 from "is-utf8";
import convUrlToAbs from "./convUrlToAbs";

function checkPermission() {
  return new Promise((resolve) => {
    if (chrome.storage) {
      chrome.storage.sync.get(
        {
          convUrlToAbsolute: true,
        },
        function (items) {
          resolve(items.convUrlToAbsolute);
        }
      );
    } else {
      resolve(true);
    }
  });
}

interface customCssObj {
  cssraw?: string;
  status?: number;
  /** returned from xhr, only for debug */
  statusText?: string;
  url?: string;
}

function makeRequest(url: string): Promise<customCssObj> {
  var result: customCssObj = {};
  result.url = url;
  chrome.runtime.sendMessage({
    status: "Getting : " + url,
  });
  return new Promise(function (resolve) {
    var xhr = new XMLHttpRequest();
    xhr.responseType = "arraybuffer";
    xhr.open("get", url);
    xhr.onload = function () {
      if (
        (this.status >= 200 && this.status < 300) ||
        url.match(/^file:\/\/\//) !== null
      ) {
        var decoder: TextDecoder;
        if (isutf8(new Uint8Array(xhr.response))) {
          decoder = new TextDecoder("UTF-8");
        } else {
          decoder = new TextDecoder("gbk");
        }

        result.cssraw = decoder.decode(xhr.response);

        checkPermission().then((willConvUrlToAbs) => {
          if (willConvUrlToAbs) {
            result.cssraw = result.cssraw.replace(
              /url\((['"]?)(.*?)\1\)/g,
              function (_a: string, p1: string, p2: string) {
                return `url(${p1}${convUrlToAbs(url, p2)}${p1})`;
              }
            );
          }
          result.status = this.status;
          result.statusText = this.statusText;
          resolve(result);
          chrome.runtime.sendMessage({
            status: "Parsing : " + url,
          });
        });
      } else {
        result.cssraw = "";
        result.status = this.status;
        result.statusText = this.statusText;
        resolve(result);
      }
    };
    xhr.onerror = function () {
      console.log("CSS-Used: Fail to get: " + url);
      result.cssraw = "";
      result.status = this.status;
      result.statusText = this.statusText;
      resolve(result);
    };
    xhr.send();
  });
}

function convLinkToText(links: string[]): Promise<customCssObj[]> {
  var promises = [];
  return new Promise(function (resolve, reject) {
    if (links.length === 0) {
      resolve([]);
    } else {
      for (var i = 0; i < links.length; i++) {
        promises.push(makeRequest(links[i]));
      }
      Promise.all(promises)
        .then((result: customCssObj[]) => {
          resolve(result);
        })
        .catch(function (err) {
          reject(err);
        });
    }
  });
}

export default convLinkToText;
