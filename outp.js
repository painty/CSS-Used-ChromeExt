function qr(sel){
    return document.querySelector(sel);
}
qr('#newwin').addEventListener('click', function(){
    var w=window.open();
    w.document.write('<!DOCTYPE html>'+document.getElementById('outp1').value);

    var css=document.getElementById('outp2').value;
    var style = w.document.createElement('style');
    style.type = 'text/css';
    style.appendChild(w.document.createTextNode(css))
    w.document.head.appendChild(style);

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