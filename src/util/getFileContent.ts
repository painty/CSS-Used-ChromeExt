import debugMode from '../const/debugMode'

const getByFetch = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    fetch(url, {
      method: 'GET',
      mode: 'no-cors',
    })
      .then((resonse) => resonse.arrayBuffer())
      .then((data) => {
        const decoder = new TextDecoder()
        resolve(decoder.decode(data))
      })
      .catch((error) => reject(error))
  })
}

const getByChromeAPI = (url: string): Promise<string> => {
  return new Promise((resolve, _reject) => {
    chrome.runtime.sendMessage(
      {
        action: 'getRecourceContent',
        url,
      },
      (response) => {
        // console.log('response',response);
        resolve(response.content)
      }
    )
  })
}

export function getFileContent(url: string) {
  if (debugMode) {
    return getByFetch(url)
  }
  return getByChromeAPI(url)
}
