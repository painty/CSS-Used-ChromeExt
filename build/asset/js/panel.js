function qr(sel) {
  return document.querySelector(sel)
}
qr('#newwin').addEventListener('click', function () {
  var regNoProtocol = /(['"]|\(['"]?)\/\//g
  var strAddProtocol = '$1http://'
  var html = qr('#outp1').value.replace(regNoProtocol, strAddProtocol)
  var css = qr('#outp2').value.replace(regNoProtocol, strAddProtocol)

  var w = window.open()
  setTimeout(function () {
    w.document.write('<!DOCTYPE html>' + html)
    // the local preview will have two injected style
    // which contains body fontsize 75%
    // making body fontsize 75%*75%
    // That's not correct.
    var styleDefault = w.document.createElement('style')
    styleDefault.appendChild(w.document.createTextNode(`body{font-size:16px;}`))
    w.document.head.appendChild(styleDefault)
    // insert the picked css rules
    var styleInsert = w.document.createElement('style')
    styleInsert.appendChild(w.document.createTextNode(css))
    w.document.head.appendChild(styleInsert)
  }, 200)
})

qr('#issuebtn').addEventListener('click', gotoGithubIssue)

qr('#copy').addEventListener('click', function () {
  qr('#outp2').select()
  document.execCommand('copy')
  this.innerText = 'Copied'
  setTimeout(() => {
    this.innerText = 'Copy'
  }, 1500)
})

qr('#pop').addEventListener('click', function (e) {
  if (e.target) {
    if (e.target.id == 'openCSSUsedSettings') {
      chrome.tabs.create({
        url: 'chrome://extensions/?id=' + chrome.runtime.id,
      })
    } else if (e.target.id == 'refreshPage') {
      chrome.devtools.inspectedWindow.reload()
    } else if (e.target.id == 'issueSpan') {
      gotoGithubIssue()
    }
  }
})

function gotoGithubIssue() {
  var w = window.open('https://github.com/painty/CSS-Used-ChromeExt/issues')
}

document.documentElement.className +=
  ' theme-' + chrome.devtools.panels.themeName

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // console.log('sender,message from panel', sender, message)
  // Messages from content scripts should have sender.tab set
  if (sender.tab && sender.tab.id === chrome.devtools.inspectedWindow.tabId) {
    if (message.info !== undefined) {
      if (message.info === 'fileURLsNotAllowed') {
        accessToFileURLs = false
      } else {
        showMessage(JSON.stringify(message.info))
      }
    } else if (message.err !== undefined) {
      showMessage('ERROR:' + message.err)
    } else if (message.status !== undefined) {
      showMessage(message.status)
    } else if (message.css === undefined) {
      showMessage(
        `The selected dom has ${message.dom}${
          message.dom > 0 ? ' children' : ' child'
        }.<br>Page rules are about ${message.rule}.<br>Traversing the ${
          message.rulenow
        }th rule...`
      )
    } else {
      outp1.value = message.html
      outp2.value = message.css
      outp2.select()
      input.value = JSON.stringify({
        title: 'New Pen via CSS-Used',
        html: message.html,
        css: message.css,
      })
      pop.style.display = 'none'
      // SideBar.setExpression(message.result);
      // document.getElementById('outp').value=message.result;
    }
  } else {
    // Messages from devtools.js
  }
})
