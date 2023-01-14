let panelVisible = false
let isPageLoaded = true

function getAllFramesUrl() {
  const framesURLArray = []
  return new Promise((resolve) => {
    chrome.devtools.inspectedWindow.getResources((resources) => {
      for (var i = 0; i < resources.length; i++) {
        if (
          resources[i].type === 'document' &&
          resources[i].url.match(/^(https?:|file:\/)\/\//) !== null
        ) {
          framesURLArray.push(resources[i].url)
        }
      }
      resolve(framesURLArray)
    })
  })
}

function evalGetCssUsed(cancel = false) {
  if ((!cancel && !panelVisible) || !isPageLoaded) {
    return
  }
  getAllFramesUrl().then((arrFrameURL) => {
    // console.log('arrFrameURL', arrFrameURL)
    if (arrFrameURL.length === 0) {
      chrome.runtime.sendMessage({
        action: 'inform',
        info: 'frameURLsEmpty',
        tabId: chrome.devtools.inspectedWindow.tabId, // to specify message from
      })
    }
    arrFrameURL.forEach(function (ele) {
      chrome.devtools.inspectedWindow.eval(
        'getCssUsed(' + (cancel ? '' : '$0') + ')',
        {
          frameURL: ele,
          useContentScriptContext: true,
        },
        function (result, isException) {
          if (isException) {
            // showMessage("isException:",isException);
          } else {
            // console.log(result);
          }
        }
      )
    })
  })
}

chrome.devtools.panels.elements.onSelectionChanged.addListener(function () {
  evalGetCssUsed()
  // console.log('onSelectionChanged')
  chrome.runtime.sendMessage({
    action: 'inform',
    info: 'onSelectionChanged',
    tabId: chrome.devtools.inspectedWindow.tabId,
  })
})

chrome.devtools.network.onNavigated.addListener(function () {
  // console.log('onNavigated')
  isPageLoaded = false
  chrome.runtime.sendMessage({
    action: 'inform',
    info: 'onNavigated',
    tabId: chrome.devtools.inspectedWindow.tabId,
  })
  // initialText = `on Navigated.<li>Select another dom on the left </li>or<li>Reopen the Devtool</li>`
})

chrome.devtools.panels.elements.createSidebarPane(
  'CSS Used',
  function (sidebar) {
    // sidebar.setHeight('calc(100vh - 48px)')
    sidebar.setPage('panel.html')
    sidebar.onShown.addListener(function (win) {
      // console.log('onShown')
      panelVisible = true
      evalGetCssUsed()
      chrome.runtime.sendMessage({
        action: 'inform',
        info: 'onShown',
        tabId: chrome.devtools.inspectedWindow.tabId,
      })
    })
    sidebar.onHidden.addListener(function () {
      // console.log('onHidden')
      evalGetCssUsed(true)
      panelVisible = false
      chrome.runtime.sendMessage({
        action: 'inform',
        info: 'onHidden',
        tabId: chrome.devtools.inspectedWindow.tabId,
      })
    })
  }
)

// passing resources to content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // console.log('sender,message', sender, message)
  // Messages from content scripts should have sender.tab set
  if (sender.tab && sender.tab.id === chrome.devtools.inspectedWindow.tabId) {
    if (message.action == 'getResourceContent') {
      chrome.devtools.inspectedWindow.getResources((resources) => {
        // console.log('resources', resources);
        const resourceMatched = resources.find((r) => r.url === message.url)
        resourceMatched.getContent((content, encoding) => {
          // https://developer.chrome.com/docs/extensions/reference/devtools_inspectedWindow/#method-getResources
          // encoding:Currently, only base64 is supported.
          // console.log(resourceMatched, encoding, content.length);
          sendResponse({
            url: message.url,
            content,
          })
        })
      })
      // https://stackoverflow.com/questions/44056271/chrome-runtime-onmessage-response-with-async-await
      return true
    } else if (message.action == 'evalGetCssUsed') {
      isPageLoaded = true
      evalGetCssUsed()
    }
  } else {
    // Messages from panel scripts
  }
})
