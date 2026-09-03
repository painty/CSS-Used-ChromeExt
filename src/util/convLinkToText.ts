import convUrlToAbs from './convUrlToAbs'
import { getFileContent } from './getFileContent'

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

// Tenta obter o CSS diretamente via fetch.
// Mesma origem: funciona sempre. Cross-origin: funciona se o CORS permitir.
// Devolve null quando não é possível, para acionar o fallback.
async function fetchDirect(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) return null
    return await res.text()
  } catch (e) {
    return null
  }
}

function makeRequest(url: string): Promise<customCssObj> {
  const result: customCssObj = { url, cssraw: '' }
  chrome.runtime.sendMessage({
    action: 'inform',
    info: 'Getting : ' + url,
  })
  return new Promise(function (resolve) {
    // 1) fetch direto  →  2) fallback ao getFileContent (devtools getResources)
    fetchDirect(url)
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
