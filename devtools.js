// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var outp1, outp2, pop,tips, evalGetc, sidebarvisible=false;
// The function below is executed in the context of the inspected page.
function page_getProperties() {
    var data={};
    data.__proto__=null;
    data.name='jj';
    data.name2='jj2';
    return data;
}

evalGetc=function(stop) {
    if(!sidebarvisible) return;
    pop.style.display='block';
    tips.innerHTML='...'
    chrome.devtools.inspectedWindow.eval('getC('+(stop?'':'$0')+')',{
        useContentScriptContext: true
    });
}

chrome.devtools.panels.elements.onSelectionChanged.addListener(function(){
    evalGetc();
});

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
            tips=win.document.body.querySelector('#pop p');
            input=win.document.body.querySelector('input[name=data]');
            evalGetc();
        });
        sidebar.onHidden.addListener(function(){
            evalGetc(true);
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
    if(message.err!==undefined){
        tips.innerHTML='ERROR:'+message.err;
        pop.style.display='block';
    }else if(message.status!==undefined){
        tips.innerHTML=message.status;
        pop.style.display='block';
    }else if(message.css===undefined){
        tips.innerHTML='The selected dom has '+message.dom+(message.dom>0?' children':' child')+'.<br>Traversing the '+message.rulenow+'th rule:';
        pop.style.display='block';
    }else{
        outp1.value=message.html;
        outp2.value=message.css;
        outp2.select();
        input.value=JSON.stringify(message);
        pop.style.display='none';
        // SideBar.setExpression(message.result);
        // document.getElementById('outp').value=message.result;
    }
})