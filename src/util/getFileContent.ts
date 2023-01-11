import isutf8 from 'is-utf8'
import debugMode from '../const/debugMode'

const parser = (data: ArrayBuffer) => {
  var decoder: TextDecoder
  if (isutf8(new Uint8Array(data))) {
    decoder = new TextDecoder('UTF-8')
  } else {
    decoder = new TextDecoder('gbk')
  }
  return decoder.decode(data)
}

const getByFetch = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    fetch(url, {
      method: 'GET',
      mode: 'no-cors',
    })
      .then((resonse) => resonse.arrayBuffer())
      .then((data) => {
        resolve(parser(data))
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
