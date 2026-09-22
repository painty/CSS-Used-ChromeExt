import convUrlToAbs from './convUrlToAbs'
import { getFileContent } from './getFileContent'
import { getByCSSOM } from './getCssRulesText'

function getSavedSettings() {
  return new Promise((resolve) => {
    if (chrome && chrome.storage) {
      chrome.storage.sync.get(
        {
          convUrlToAbsolute: true,
        },
        function (items) {
          resolve(items.convUrlToAbsolute)
        }
      )
    } else {
      resolve(true)
    }
  })
}

interface customCssObj {
  url: string
  cssraw: string
}

// Try to get the CSS directly via fetch.
// Same-origin: always works. Cross-origin: works if CORS allows it.
// Returns null when not possible, to trigger the fallback.
async function fetchDirect(url: string): Promise<string | null> {
  // 1) credentials:'omit' — works with CDNs answering
  //    `Access-Control-Allow-Origin: *`, which REJECT credentialed
  //    requests (ACAO:* + credentials is forbidden by the CORS spec)
  // 2) credentials:'include' — for same-origin/CDNs that require
  //    cookies to serve the real (non-anonymous) stylesheet
  const modes: RequestCredentials[] = ['omit', 'include']
  for (const credentials of modes) {
    try {
      const res = await fetch(url, { credentials })
      if (res.ok) {
        return await res.text()
      }
    } catch (e) {
      // try next mode / fall through to the caller's fallback
    }
  }
  return null
}

function makeRequest(url: string): Promise<customCssObj> {
  const result: customCssObj = { url, cssraw: '' }
  chrome.runtime.sendMessage({
    action: 'inform',
    info: 'Getting : ' + url,
  })
  return new Promise(function (resolve) {
    // 1) CSSOM (le CSS réellement appliqué par le navigateur)
    //    → 2) fetch direct → 3) fallback getFileContent (devtools getResources)
    getByCSSOM(url)
      .then((cssom) => (cssom !== null ? cssom : fetchDirect(url)))
      .then((direct) => (direct !== null ? direct : getFileContent(url)))
      .then((data) => {
        result.cssraw = data || ''
        getSavedSettings().then((willConvUrlToAbs) => {
          if (willConvUrlToAbs) {
            result.cssraw = result.cssraw.replace(
              /url\((['"]?)(.*?)\1\)/g,
              function (_a: string, p1: string, p2: string) {
                return `url(${p1}${convUrlToAbs(url, p2)}${p1})`
              }
            )
          }
          resolve(result)
          chrome.runtime.sendMessage({
            action: 'inform',
            info: 'Parsing : ' + url,
          })
        })
      })
      .catch((error) => {
        console.log('CSS-Used: Fail to get: ' + url, error)
        result.cssraw = ''
        resolve(result)
      })
  })
}

function convLinkToText(links: string[]): Promise<customCssObj[]> {
  var promises = []
  return new Promise(function (resolve, reject) {
    if (links.length === 0) {
      resolve([])
    } else {
      for (var i = 0; i < links.length; i++) {
        promises.push(makeRequest(links[i]))
      }
      Promise.all(promises)
        .then((result: customCssObj[]) => {
          resolve(result)
        })
        .catch(function (err) {
          reject(err)
        })
    }
  })
}

export default convLinkToText
