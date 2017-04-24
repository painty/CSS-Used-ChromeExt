function qr(sel){
    return document.querySelector(sel);
}
qr('#newwin').addEventListener('click', function(){
    var w=window.open();
    w.document.write('<!DOCTYPE html> <html> <head> <title>Block Preview</title> </head> <body> </body> </html>');
    w.document.head.innerHTML='<style>'+document.getElementById('outp2').value+'</style>';
    w.document.body.outerHTML=document.getElementById('outp1').value;
});

qr('#issuebtn').addEventListener('click', function(){
    var w=window.open("https://github.com/painty/CSS-Used-ChromeExt/issues");
});

qr('#copy').addEventListener('click', function(){
    qr('#outp2').select();
    document.execCommand('copy');
});