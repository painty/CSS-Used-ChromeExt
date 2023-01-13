<script lang="ts">
  import chrome from './mockChromeAPI'
  import debugMode from '../const/debugMode'

  // Whether this extention can access file://
  let haveAccessToFileURLs = true
  let isGooglePreservedPages = false
  let strHtml = ''
  let strCss = ''
  let popVisible = false
  let popText = ''
  let dataForCodepen = {
    title: 'New Pen!',
    html: '<div>Hello, World!</div>',
    css: '',
  }

  async function updateAccessToFileURLs() {
    // check file:// permission
    chrome.extension.isAllowedFileSchemeAccess((allow: boolean) => {
      haveAccessToFileURLs = allow
    })
    // check if is google preserved pages
    const inspectedTabUrl = await getInspectedTabUrl()
    if (
      inspectedTabUrl.match(
        /^(chrome|https:\/\/chrome\.google\.com\/webstore)/
      ) !== null
    ) {
      // showMessage('This page is protected by Chrome.<br>Try another page.')
      isGooglePreservedPages = true
    } else {
      isGooglePreservedPages = false
    }
  }

  function getInspectedTabUrl(): Promise<string> {
    return new Promise((res) => {
      chrome.tabs.query({}, function (results) {
        results.forEach(function (ele) {
          if (ele.id === chrome.devtools.inspectedWindow.tabId) {
            res(ele.url)
          }
        })
      })
    })
  }
  function preview() {
    const regNoProtocol = /(['"]|\(['"]?)\/\//g
    const strAddProtocol = '$1http://'
    const html = strHtml.replace(regNoProtocol, strAddProtocol)
    const css = strCss.replace(regNoProtocol, strAddProtocol)

    const w = window.open()
    // setTimeout(function () {
    w.document.write('<!DOCTYPE html>' + html)
    // the local preview will have two injected style
    // which contains body fontsize 75%
    // making body fontsize 75%*75%
    // That's not correct.
    const styleDefault = w.document.createElement('style')
    styleDefault.appendChild(w.document.createTextNode(`body{font-size:16px;}`))
    w.document.head.appendChild(styleDefault)
    // insert the picked css rules
    const styleInsert = w.document.createElement('style')
    styleInsert.appendChild(w.document.createTextNode(css))
    w.document.head.appendChild(styleInsert)
    // }, 200)
  }

  let textareaCss: HTMLTextAreaElement
  let btnCopyText = 'Copy'

  function copyResult() {
    textareaCss.select()
    document.execCommand('copy')
    btnCopyText = 'Copied'
    setTimeout(() => {
      btnCopyText = 'Copy'
    }, 1500)
  }

  function openCSSUsedSettings() {
    chrome.tabs.create({
      url: 'chrome://extensions/?id=' + chrome.runtime.id,
    })
  }

  function refreshContentScript() {
    chrome.devtools.inspectedWindow.reload()
  }

  function gotoGithubIssue() {
    window.open('https://github.com/painty/CSS-Used-ChromeExt/issues')
  }

  document.documentElement.className +=
    ' theme-' + chrome.devtools.panels.themeName

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('sender,message from panel', sender, message)
    // Messages from content scripts should have sender.tab set
    if (sender.tab && sender.tab.id === chrome.devtools.inspectedWindow.tabId) {
      if (message.action === 'inform') {
        popVisible = true
        popText = message.info
      } else if (message.action === 'celebrate') {
        popVisible = false
        strHtml = message.html
        strCss = message.css
        dataForCodepen.html = strHtml
        dataForCodepen.css = strCss
      }
    } else {
      // Messages from devtools.js
      if (message.action === 'inform') {
        if (
          message.info === 'onShown' ||
          message.info === 'onNavigated' ||
          message.info === 'onSelectionChanged'
        ) {
          updateAccessToFileURLs()
        }
      }
    }
  })

  function debugSendMessage() {
    chrome.runtime.sendMessage({
      action: 'inform',
      info: 'onSelectionChanged\n' + Math.random(),
    })
  }
</script>

<main>
  <div class="title">
    <button class="btn-issue" on:click={gotoGithubIssue}>issue?</button>
    CSS Used by $0 and its children:
  </div>
  <div class="outp outp2">
    <textarea disabled={strCss === ''} value={strCss} bind:this={textareaCss} />
  </div>
  <div class="operate">
    <button on:click={copyResult} disabled={strCss === ''} id="copy" class="btn"
      >{btnCopyText}</button
    >
    <button on:click={preview} disabled={strCss === ''} class="btn"
      >Preview</button
    >
    <form action="https://codepen.io/pen/define" method="POST" target="_blank">
      <input type="hidden" name="data" value={dataForCodepen} />
      <input
        disabled={strCss === ''}
        title="Send snippet to CodePen"
        type="submit"
        value="CodePen"
        class="btn"
      />
    </form>
  </div>

  <!-- {#if popVisible} -->
  <div class="pop">
    <!-- <p>For the first time installed/updated/allowedFileAccess:</p> -->
    <div class="info">
      <pre>{popText}</pre>
    </div>
    <ol>
      <li id="openCSSUsedSettings" on:click={openCSSUsedSettings}>
        Turn on the "Allow access to file URLs" for file:/// page
      </li>
      <li><span id="refreshPage">Refresh</span> the inspected page</li>
      <li>Restart Chrome</li>
    </ol>
    If problem persists, please<span id="issueSpan">create an issue</span>.
    <ol />
  </div>
  <!-- {/if} -->

  {#if debugMode}
    <div class="debug-tool">
      <button on:click={debugSendMessage}>sendmessage</button>
    </div>
  {/if}
</main>

<style>
  .debug-tool {
    position: fixed;
    bottom: 10px;
    left: 10px;
    width: 100%;
  }
  textarea {
    font-family: Consolas, 'Lucida Console', monospace;
    font-size: 12px;
  }
  ::selection {
    background: #cfe8fc;
  }
  body {
    box-sizing: border-box;
    background: inherit;
    display: flex;
    flex-direction: column;
  }
  .outp {
    width: 50%;
    box-sizing: border-box;
    position: relative;
    flex-grow: 1;
  }
  textarea {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: 10px;
    border: 1px solid #ccc;
    border-left: none;
    border-right: none;
    resize: none;
    overflow: auto;
  }
  textarea:focus {
    outline: none;
  }
  .title {
    padding: 5px 10px;
  }
  .outp2 {
    float: right;
    width: 100%;
  }
  /* form{} */
  .pop {
    width: 100%;
    height: 100%;
    position: fixed;
    top: 0px;
    left: 0px;
    background: rgba(255, 255, 255, 0.77);
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
  }
  .pop p {
    margin: auto;
    font-size: 12px;
    display: inline-block;
    vertical-align: middle;
  }
  .pop ol {
    font-size: 12px;
    text-align: left;
    display: inline-block;
    line-height: 2;
    vertical-align: middle;
  }
  .btn {
    position: relative;
    font-size: 12px;
    display: block;
    margin-right: 10px;
    margin: 2px;
    height: 24px;
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    padding: 0px 12px;
    font-weight: 500;
    color: #1a73e8;
    background-color: #fff;
    flex: none;
    white-space: nowrap;
    height: 28px;
    margin: 8px 16px 8px 0;
  }
  .btn:hover {
    background-color: #f3f3f3;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    /* cursor: pointer; */
  }
  .btn-issue {
    float: right;
    cursor: pointer;
    z-index: 1;
    margin-left: 10px;
  }
  /* .btn-issue:hover{} */
  form {
    font-size: 12px;
    margin-right: 10px;
    position: relative;
    display: block;
  }
  /* form .btn{margin:0;} */
  .operate {
    position: relative;
    display: flex;
    clear: both;
    margin-left: 10px;
    flex-wrap: wrap;
  }
  #openCSSUsedSettings,
  #refreshPage,
  #issueSpan {
    text-decoration: underline;
    cursor: pointer;
    color: blue;
  }
  .havefileaccess #openCSSUsedSettings {
    display: none;
  }
  .theme-dark body {
    color: rgb(165, 165, 165);
  }
  .theme-dark textarea {
    background-color: #242424;
    border-color: #525252;
    color: rgb(217, 217, 217);
  }
  .theme-dark ::selection {
    background-color: #999;
  }
  .theme-dark .pop {
    color: #000;
    background: rgba(255, 255, 255, 0.55);
  }
  .theme-dark ::-webkit-scrollbar {
    background: #333;
    width: 14px;
    cursor: pointer;
  }
  .theme-dark ::-webkit-scrollbar-thumb {
    background: #333333;
    border: 1px solid #414141;
  }
  .theme-dark ::-webkit-scrollbar-thumb:hover {
    cursor: default;
  }
  .theme-dark ::-webkit-scrollbar-track {
    background: #242424;
    border-left: 1px solid #2b2b2b;
  }
  .theme-dark .btn {
    border-color: rgba(230, 230, 230, 0.2);
    color: #cccccc;
    background-color: rgb(36, 36, 36);
  }
  .theme-dark .btn:hover {
    background-color: #333333;
    box-shadow: rgba(230, 230, 230, 0.1) 0px 1px 2px;
  }
  #copy {
    background-color: #1a73e8;
    border: none;
    color: #fff;
  }
  #copy:hover {
    background-color: #3b86e8;
  }
  .theme-dark #copy {
    background-color: #0e639c;
    border: none;
    color: #fff;
  }
  .theme-dark #copy:hover {
    background-color: #1177bb;
  }
</style>
