import convUrlToAbs from "./convUrlToAbs";
import { getFileContent } from "./getFileContent";

function getSavedSettings() {
  return new Promise((resolve) => {
    if (chrome && chrome.storage) {
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
  url: string;
  cssraw: string;
}

function makeRequest(url: string): Promise<customCssObj> {
  const result: customCssObj = { url, cssraw:'' };
  chrome.runtime.sendMessage({
    status: "Getting : " + url,
  });
  return new Promise(function (resolve) {
    getFileContent(url).then(data=>{
      result.cssraw = data;
      // console.log("Success:", url, data);
      getSavedSettings().then((willConvUrlToAbs) => {
        if (willConvUrlToAbs) {
          result.cssraw = result.cssraw.replace(
            /url\((['"]?)(.*?)\1\)/g,
            function (_a: string, p1: string, p2: string) {
              return `url(${p1}${convUrlToAbs(url, p2)}${p1})`;
            }
          );
        }
        resolve(result);
        chrome.runtime.sendMessage({
          status: "Parsing : " + url,
        });
      });
    }).catch((error) => {
      console.log("CSS-Used: Fail to get: " + url, error);
      result.cssraw = "";
      resolve(result);
    });
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
