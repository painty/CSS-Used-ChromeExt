import debugMode from '../const/debugMode'

const getByFetch = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    fetch(url, {
      method: 'GET',
      mode: 'no-cors',
    })
      .then((response) => response.arrayBuffer())
      .then((data) => {
        const decoder = new TextDecoder()
        resolve(decoder.decode(data))
      })
      .catch((error) => reject(error))
  })
}

const getByChromeAPI = (url: string): Promise<string> => {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        {
          action: 'getResourceContent',
          url,
        },
        (response) => {
          // consome o erro para não borbulhar "Could not establish connection"
          if (chrome.runtime.lastError) {
            resolve('')
            return
          }
          // resposta ausente/nula → devolve folha vazia em vez de rebentar
          if (!response || response.content == null) {
            resolve('')
            return
          }
          resolve(response.content)
        }
      )
    } catch (e) {
      resolve('')
    }
  })
}

export function getFileContent(url: string) {
  if (debugMode) {
    return getByFetch(url)
  }
  return getByChromeAPI(url)
}
