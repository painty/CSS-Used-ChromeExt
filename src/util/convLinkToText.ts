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

function makeRequest(url: string) {
  var result: {
    cssraw?: any;
    status?: number;
    statusText?: string;
    url?: string;
  } = {};
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
        var decoder;
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
              function (_a, p1, p2) {
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

function convLinkToText(links) {
  var promises = [];
  return new Promise(function (resolve, reject) {
    if (links.length === 0) {
      resolve([]);
    } else {
      for (var i = 0; i < links.length; i++) {
        promises.push(makeRequest(links[i]));
      }
      Promise.all(promises)
        .then(function (result) {
          resolve(result);
        })
        .catch(function (err) {
          reject(err);
        });
    }
  });
}

export default convLinkToText;
