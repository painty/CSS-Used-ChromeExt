var outp1, outp2, input, pop, tips
let panelVisible = false

// Whether this extention can access file://
var accessToFileURLs = true

chrome.extension.isAllowedFileSchemeAccess(function (isAllowedAccess) {
  accessToFileURLs = isAllowedAccess
})

var initialText = `
For the first time installed/updated/allowedFileAccess:
<li id="openCSSUsedSettings">Active the "Allow access to file URLs" for file:/// page</li>
<li><span id="refreshPage">Refresh</span> the inspected page</li>
or
<li>Restart Chrome</li>
If problem persists, please <span id="issueSpan">create an issue</span>.
`

function showMessage(str) {
  if (str === initialText) {
    tips.innerHTML = str
  } else {
    // only <br> is allowed
    tips.innerText = str.replace(/<br>/g, '\n')
  }
  pop.style.display = 'block'
}

function isProtected(url) {
  return url.match(/^(chrome|https:\/\/chrome\.google\.com\/webstore)/) !== null
}

function getInspectedTabUrl() {
  return new Promise((res) => {
    chrome.tabs.query({}, function (results) {
      results.forEach(function (ele) {
        if (ele.id === chrome.devtools.inspectedWindow.tabId) {
          res(ele.url)
        }
      })
    })
  })
}

function evalGetc(cancel = false) {
  if (!cancel && !panelVisible) {
    return
  }
  showMessage(initialText)

  getInspectedTabUrl().then((inspectedTabUrl) => {
    if (isProtected(inspectedTabUrl)) {
      showMessage('This page is protected by Chrome.<br>Try another page.')
      return
    }
    let arrFrameURL = []
    chrome.devtools.inspectedWindow.getResources(function (resources) {
      for (var i = 0; i < resources.length; i++) {
        if (
          resources[i].type === 'document' &&
          resources[i].url.match(/^(https?:|file:\/)\/\//) !== null
        ) {
          arrFrameURL.push(resources[i].url)
        }
      }
      if (arrFrameURL.length === 0) {
        showMessage('Cannot work on this page.')
      } else {
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
      }
    })
  })
}

chrome.devtools.panels.elements.onSelectionChanged.addListener(function () {
  console.log('onSelectionChanged')
  evalGetc()
})

chrome.devtools.network.onNavigated.addListener(function () {
  console.log('onNavigated')
  showMessage('New page')
  // evalGetc();
  // initialText = `on Navigated.<li>Select another dom on the left </li>or<li>Reopen the Devtool</li>`
})

chrome.devtools.panels.elements.createSidebarPane(
  'CSS Used',
  function (sidebar) {
    sidebar.setHeight('calc(100vh - 48px)')
    sidebar.setPage('panel.html')
    sidebar.onShown.addListener(function (win) {
      console.log('onShown')
      panelVisible = true
      outp1 = win.document.body.querySelector('#outp1')
      outp2 = win.document.body.querySelector('#outp2')
      pop = win.document.body.querySelector('#pop')
      tips = win.document.body.querySelector('#pop ol')
      input = win.document.body.querySelector('input[name=data]')
      if (accessToFileURLs) {
        win.document.body.className = 'havefileaccess'
      }
      evalGetc()
    })
    sidebar.onHidden.addListener(function () {
      console.log('onHidden')
      evalGetc(true)
      panelVisible = false
    })
  }
)

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // console.log('sender,message', sender, message)
  // Messages from content scripts should have sender.tab set
  if (sender.tab && sender.tab.id === chrome.devtools.inspectedWindow.tabId) {
    if (message.action == 'getRecourceContent') {
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
    }
  } else {
    // Messages from panel scripts
  }
})
