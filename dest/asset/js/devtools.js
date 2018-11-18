/* global chrome */
var outp1, outp2, input, pop, tips, sidebarvisible = false;

var accessToFileURLs = true;

var initialText = `
<li id="openCSSUsedSettings">Active the "Allow access to file URLs" for file:/// page</li>
<li><span id="refreshPage">Refresh</span> the inspected page</li>
<li>Reopen the Devtool or Select another elements on the left</li>
`;

function showMessage(str) {
  tips.innerHTML = str;
  pop.style.display = 'block';
}

function isProtected(url) {
  return url.match(/^https:\/\/chrome\.google\.com/) !== null
}

function evalGetc(cancel) {
  if (!cancel && !sidebarvisible) return;
  showMessage(initialText);

  var arrFrameURL = [];
  chrome.devtools.inspectedWindow.getResources(function (resources) {
    for (var i = 0; i < resources.length; i++) {
      if (resources[i].type === 'document' && resources[i].url.match(/^(https?:|file:\/)\/\//) !== null) {
        arrFrameURL.push(resources[i].url);
      }
    }
    if(arrFrameURL.length===0){
      showMessage('Cannot work on this page.')
    }else{
      arrFrameURL.forEach(function (ele) {
        if (isProtected(ele)) {
          showMessage('Chrome Webstore pages are protected.<br>Try another page.');
        } else {
          chrome.devtools.inspectedWindow.eval('getCssUsed(' + (cancel ? '' : '$0') + ')', {
            frameURL: ele,
            useContentScriptContext: true
          });
        }
      })
    }
  });
}

chrome.devtools.panels.elements.onSelectionChanged.addListener(function () {
  evalGetc();
});

chrome.devtools.network.onNavigated.addListener(function(){
  // evalGetc();
});

chrome.devtools.panels.elements.createSidebarPane(
  "CSS Used",
  function (sidebar) {
    sidebar.setHeight('calc(100vh - 48px)');
    sidebar.setPage('pannel.html');
    sidebar.onShown.addListener(function (win) {
      sidebarvisible = true;
      outp1 = win.document.body.querySelector('#outp1');
      outp2 = win.document.body.querySelector('#outp2');
      pop = win.document.body.querySelector('#pop');
      tips = win.document.body.querySelector('#pop ol');
      input = win.document.body.querySelector('input[name=data]');
      if (accessToFileURLs) {
        win.document.body.className = 'havefileaccess';
      }
      evalGetc();
    });
    sidebar.onHidden.addListener(function () {
      evalGetc(true);
      sidebarvisible = false;
    });
  }
);

// Create a connection to the background page
var backgroundPageConnection = chrome.runtime.connect({
  name: "panel"
});

backgroundPageConnection.postMessage({
  name: 'init',
  tabId: chrome.devtools.inspectedWindow.tabId
});

backgroundPageConnection.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.info !== undefined) {
    if (message.info === 'fileURLsNotAllowed') {
      accessToFileURLs = false;
    } else {
      showMessage(JSON.stringify(message.info))
    }
  } else if (message.err !== undefined) {
    showMessage('ERROR:' + message.err);
  } else if (message.status !== undefined) {
    if (message.status === '$load') {

    } else {

    }
  } else if (message.css === undefined) {
    showMessage('The selected dom has ' + message.dom + (message.dom > 0 ? ' children' : ' child') + '.<br>Page rules are about ' + message.rule + '.<br>Traversing the ' + message.rulenow + 'th rule...')
  } else {
    outp1.value = message.html;
    outp2.value = message.css;
    outp2.select();
    input.value = JSON.stringify(message);
    pop.style.display = 'none';
    // SideBar.setExpression(message.result);
    // document.getElementById('outp').value=message.result;
  }
})