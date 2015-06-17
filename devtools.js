// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var outp1, outp2, pop, evalGetc, sidebarvisible=false;
// The function below is executed in the context of the inspected page.
function page_getProperties() {
    var data={};
    data.__proto__=null;
    data.name='jj';
    data.name2='jj2';
    return data;
}

evalGetc=function() {
    if(!sidebarvisible) return;
    pop.style.display='block';
    chrome.devtools.inspectedWindow.eval('getC($0)',{
        useContentScriptContext: true
    });
}

chrome.devtools.panels.elements.onSelectionChanged.addListener(evalGetc);

chrome.devtools.panels.elements.createSidebarPane(
    "CSS Used",
    function(sidebar) {
        sidebar.setHeight('calc(100vh - 48px)');
        sidebar.setPage('outp.html');
        sidebar.onShown.addListener(function(win){
            sidebarvisible=true;
            outp1=win.document.body.querySelector('#outp1');
            outp2=win.document.body.querySelector('#outp2');
            pop=win.document.body.querySelector('#pop');
            input=win.document.body.querySelector('input[name=data]');
            evalGetc();
        });
        sidebar.onHidden.addListener(function(){
            sidebarvisible=false;
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
    outp1.value=message.html;
    outp2.value=message.css;
    input.value=JSON.stringify(message);
    pop.style.display='none';
    // SideBar.setExpression(message.result);
    // document.getElementById('outp').value=message.result;
})