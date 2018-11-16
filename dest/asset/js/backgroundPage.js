var connections = {};

chrome.runtime.onConnect.addListener(function (port) {
    if (port.name !== "panel") return;
    var extensionListener = function (message, sender, sendResponse) {
        // The original connection event doesn't include the tab ID of the
        // DevTools page, so we need to send it explicitly.
        if (message.name == "init") {
          connections[message.tabId] = port;
          return;
        }
    // other message handling
    }

    // Listen to messages sent from the DevTools page
    port.onMessage.addListener(extensionListener);

    port.onDisconnect.addListener(function(port) {
        port.onMessage.removeListener(extensionListener);

        var tabs = Object.keys(connections);
        for (var i=0, len=tabs.length; i < len; i++) {
          if (connections[tabs[i]] == port) {
            delete connections[tabs[i]]
            break;
          }
        }
    });

    chrome.extension.isAllowedFileSchemeAccess(function(isAllowedAccess) {
        if (isAllowedAccess) return; // Great, we've got access
        port.postMessage({
            info: 'fileURLsNotAllowed'
        });
    });
});

chrome.extension.onMessage.addListener(function (message, sender, sendResponse) {
    if(message.action==='openCSSUsedSettings'){
        chrome.tabs.create({
            url: 'chrome://extensions/?id=' + chrome.runtime.id
        });
    }
})

// Receive message from content script and relay to the devTools page for the
// current tab
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // Messages from content scripts should have sender.tab set
    // console.log(request,sender);
    if (sender.tab) {
      var tabId = sender.tab.id;
      if (tabId in connections) {
        connections[tabId].postMessage(request);
      } else {
        console.log("Tab not found in connection list.");
      }
    } else {
      console.log("sender.tab not defined.");
    }
    return true;
});