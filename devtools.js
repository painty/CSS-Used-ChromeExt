var outp1, outp2, pop,tips, sidebarvisible=false;

var accessToFileURLs=true;

var newpage=true;

var initialText='<li id="openCSSUsedSettings">Active the "Allow access to file URLs" for file:/// page</li><li>Reload the inspected page</li><li>Reopen the Devtool</li><li>Select an elements on the left';

function evalGetc() {
    newpage=false;
    if(!sidebarvisible) return;
    pop.style.display='block';
    tips.innerHTML=initialText;

    var arrFrameURL=[];
    chrome.devtools.inspectedWindow.getResources(function(resources){
        for (var i = 0; i < resources.length; i++) {
            if(resources[i].type==='document' && resources[i].url.match(/^(https?:|file:\/)\/\//)!==null){
                arrFrameURL.push(resources[i].url);
            }
        }
        arrFrameURL.forEach(function(ele){
            chrome.devtools.inspectedWindow.eval('getC($0)',{
                frameURL:ele,
                useContentScriptContext: true
            });
        })
    });
}

function evalGetcSTOP() {
    pop.style.display='block';
    tips.innerHTML=initialText;

    var arrFrameURL=[];
    chrome.devtools.inspectedWindow.getResources(function(resources){
        for (var i = 0; i < resources.length; i++) {
            if(resources[i].type==='document' && resources[i].url.match(/^https?:\/\//)!==null){
                arrFrameURL.push(resources[i].url);
            }
        }
        arrFrameURL.forEach(function(ele){
            chrome.devtools.inspectedWindow.eval('getC()',{
                frameURL:ele,
                useContentScriptContext: true
            });
        })
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
            tips=win.document.body.querySelector('#pop ol');
            input=win.document.body.querySelector('input[name=data]');
            if(accessToFileURLs){
                win.document.body.className='havefileaccess';
            }
            evalGetc();
        });
        sidebar.onHidden.addListener(function(){
            evalGetcSTOP();
            sidebarvisible=false;
        });
    }
);

chrome.devtools.network.onNavigated.addListener(function(){
    newpage=true;
})

// Create a connection to the background page
var backgroundPageConnection = chrome.runtime.connect({
    name: "panel"
});

backgroundPageConnection.postMessage({
    name: 'init',
    tabId: chrome.devtools.inspectedWindow.tabId
});

backgroundPageConnection.onMessage.addListener(function (message, sender, sendResponse) {
    // console.log(message);
    if(message.info==='fileURLsNotAllowed'){
        accessToFileURLs=false;
        // console.log('Please "allow access to file URLs" in the following screen.');
    }else if(message.err!==undefined){
        tips.innerHTML='ERROR:'+message.err;
        pop.style.display='block';
    }else if(message.status!==undefined){
        if(message.status==='$load'){
            
        }else{
            tips.innerHTML=message.status;
            pop.style.display='block';
        }
    }else if(message.css===undefined){
        tips.innerHTML='The selected dom has '+message.dom+(message.dom>0?' children':' child')+'.<br>Page rules are about '+message.rule+'.<br>Traversing the '+message.rulenow+'th rule...';
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