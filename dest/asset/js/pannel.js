/* global chrome */

function qr(sel) {
  return document.querySelector(sel);
}
qr('#newwin').addEventListener('click', function () {
  var regNoProtocol = /(['"]|\(['"]?)\/\//g;
  var strAddProtocol = '$1http://';
  var html = qr('#outp1').value.replace(regNoProtocol, strAddProtocol);
  var css = qr('#outp2').value.replace(regNoProtocol, strAddProtocol);

  var w = window.open();
  setTimeout(function () {
    w.document.write('<!DOCTYPE html>' + html);
    // the local preview will have two injected style
    // which contains body fontsize 75%
    // making body fontsize 75%*75%
    // That's not correct.
    var styleDefault = w.document.createElement('style');
    styleDefault.appendChild(w.document.createTextNode(`body{font-size:16px;}`));
    w.document.head.appendChild(styleDefault);
    // insert the picked css rules
    var styleInsert = w.document.createElement('style');
    styleInsert.appendChild(w.document.createTextNode(css));
    w.document.head.appendChild(styleInsert);
  }, 200);
});

qr('#issuebtn').addEventListener('click', gotoGithubIssue);

qr('#copy').addEventListener('click', function () {
  qr('#outp2').select();
  document.execCommand('copy');
});

qr("#pop").addEventListener("click", function (e) {
  if (e.target) {
    if (e.target.id == "openCSSUsedSettings") {
      chrome.extension.sendMessage({
        action: 'openCSSUsedSettings'
      })
    } else if (e.target.id == "refreshPage") {
      chrome.devtools.inspectedWindow.reload();
    }else if (e.target.id == "issueSpan") {
      gotoGithubIssue();
    }
  }
});

function gotoGithubIssue(){
  var w = window.open("https://github.com/painty/CSS-Used-ChromeExt/issues");
}