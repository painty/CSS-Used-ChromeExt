/* global chrome */

function qr(sel){
    return document.querySelector(sel);
}
qr('#newwin').addEventListener('click', function(){
    var regNoProtocol=/(['"]|\(['"]?)\/\//g;
    var strAddProtocol='$1http://';
    var html=qr('#outp1').value.replace(regNoProtocol,strAddProtocol);
    var css=qr('#outp2').value.replace(regNoProtocol,strAddProtocol);

    var w=window.open();
    setTimeout(() => {
        w.document.write('<!DOCTYPE html>'+html);
        var style = w.document.createElement('style');
        style.type = 'text/css';
        style.appendChild(w.document.createTextNode(css))
        w.document.head.appendChild(style);
    }, 200);
});

qr('#issuebtn').addEventListener('click', function(){
    var w=window.open("https://github.com/painty/CSS-Used-ChromeExt/issues");
});

qr('#copy').addEventListener('click', function(){
    qr('#outp2').select();
    document.execCommand('copy');
});

qr("#pop").addEventListener("click", function(e) {
    if(e.target && e.target.id == "openCSSUsedSettings") {
        chrome.extension.sendMessage({
            action:'openCSSUsedSettings'
        })
    }
});
