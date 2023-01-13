import debugMode from '../const/debugMode'

let chromeObj

if (debugMode) {
  chromeObj = {
    devtools: {
      panels: {
        // themeName: 'default',
        themeName: 'dark',
      },
      inspectedWindow:{
        tabId: 123
      }
    },
    runtime: {
      _messageHandlerStack: [],
      onMessage: {
        addListener: (fn) => {
          // message, sender, sendResponse
          chromeObj.runtime._messageHandlerStack.push({
            target: this,
            handler: fn,
          })
        },
      },
      sendMessage: (message, responseFn) => {
        // self send and slef response
        chromeObj.runtime._messageHandlerStack.forEach((h) => {
          let sender = {
            tab:{
              id:123
            }
          }
          let handler = h.handler
          let sendResponse = (r) => {
            responseFn.call(null,r)
          }
          let isAsyncResponse = handler.call(chromeObj, message, sender, sendResponse)
          if (isAsyncResponse === true) {
            // async response
          }else{

          }
        })
      },
    },
  }
} else {
  chromeObj = chrome
}
export default chromeObj
