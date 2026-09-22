import filterRules from './util/filterRules'
import convLinkToText from './util/convLinkToText'
import convTextToRules from './util/convTextToRules'
import postTideCss from './util/postTideCss'
import generateRulesAll from './util/generateRulesAll'
import cleanHTML from './util/cleanHTML'
import collectInlineStyles from './util/collectInlineStyles'

type cssNodeObj = Awaited<ReturnType<typeof convTextToRules>>

const externalCssCache: { [index: string]: cssNodeObj } = {}
//to store timers of testing if a html element matches a rule selector.
const arrTimerOfTestingIfMatched: ReturnType<typeof setTimeout>[] = []
let doc = document
// dernier élément analysé (P6 : refresh auto quand les styles changent)
let last$0: HTMLElement | null = null
async function getC($0: HTMLElement) {
  arrTimerOfTestingIfMatched.forEach(function (ele) {
    clearTimeout(ele)
  })
  // reset to empty
  arrTimerOfTestingIfMatched.length = 0

  if (
    $0 === null ||
    typeof $0 === 'undefined' ||
    typeof $0.nodeName === 'undefined'
  ) {
    // appel sans argument (panel caché) : stopper aussi le refresh auto
    last$0 = null
    return
  }

  if ($0.nodeName.match(/^<pseudo:/)) {
    chrome.runtime.sendMessage({
      action: 'inform',
      info: "It's a pseudo element",
    })
    return
  }

  if ($0.nodeName === 'html' || $0.nodeName.match(/^#/)) {
    chrome.runtime.sendMessage({
      action: 'inform',
      info: 'Not for this element',
    })
    return
  }

  let isInSameOrigin = true
  try {
    $0.ownerDocument.defaultView.parent.document
  } catch (e) {
    isInSameOrigin = false
  }

  if (isInSameOrigin) {
    // if same isInSameOrigin
    // $0 can be accessed from its parent context
    if ($0.ownerDocument.defaultView.parent.document !== document) {
      return
    }
  }

  chrome.runtime.sendMessage({
    action: 'inform',
    info: 'Preparing ...',
  })

  // console.log('NOT return,begin');
  doc = $0.ownerDocument
  last$0 = $0

  const links: string[] = []

  $0.ownerDocument
    .querySelectorAll('link[rel~="stylesheet"][href]')
    .forEach((ele: HTMLLinkElement) => {
      // if href==='' , ele.getAttribute('href') !== ele.href
      const current = externalCssCache[ele.href]
      if (
        ele.getAttribute('href') &&
        (current === undefined || current.nodes.length === 0) &&
        // astuce media="print" + fallback : deux <link> pour le même href
        links.indexOf(ele.href) === -1
      ) {
        links.push(ele.href)
      }
    })

  convLinkToText(links)
    .then(async (result) => {
      var promises: cssNodeObj[] = []
      for (var i = 0; i < result.length; i++) {
        let ele = result[i],
          idx = i
        const rulesObj = await convTextToRules(ele.cssraw, links[idx])
        promises.push(rulesObj)
      }
      return promises
    })
    .catch(function (err) {
      console.error('CSS-Used: ', err)
      chrome.runtime.sendMessage({
        action: 'inform',
        info: 'convLinkToText error, see detail in console',
      })
    })
    .then(function (result) {
      if (Array.isArray(result)) {
        result.forEach(function (rulesObj) {
          externalCssCache[rulesObj.href] = rulesObj
        })
      }
    })
    .then(function () {
      return generateRulesAll(doc, externalCssCache, $0)
    })
    .then(function (objCss) {
      // {fontFace : Array, keyFram : Array, normRule : Array}
      return filterRules($0, objCss, arrTimerOfTestingIfMatched)
    })
    .then(function (data: string[]) {
      // P5 : styles inline (style="...") de $0 et de ses descendants —
      // massivement utilisés par Angular ([style.x] / style bindings)
      const inlineStyles = collectInlineStyles($0)
      if (inlineStyles.length > 0) {
        data = data.concat(['/*! CSS Used inline styles */'], inlineStyles)
      }
      chrome.runtime
        .sendMessage({
          action: 'celebrate',
          css: postTideCss(data),
          html: cleanHTML($0.outerHTML, doc),
        })
        .catch(() => {
          // pas de récepteur (panel fermé) : ignorer
        })
    })
}

// P6 : refresh automatique quand les feuilles de la page changent
// (SPA : lazy-loading de styles Angular, HMR, CSS-in-JS) et
// invalidation du cache pour les <link> supprimés.
let styleChangeTimer: ReturnType<typeof setTimeout> | null = null
const styleObserver = new MutationObserver(function (mutations) {
  let styleChanged = false
  mutations.forEach(function (m) {
    m.addedNodes.forEach(function (node) {
      if (
        node instanceof Element &&
        (node.tagName === 'LINK' || node.tagName === 'STYLE')
      ) {
        styleChanged = true
      }
    })
    m.removedNodes.forEach(function (node) {
      if (
        node instanceof Element &&
        (node.tagName === 'LINK' || node.tagName === 'STYLE')
      ) {
        styleChanged = true
        if (node instanceof HTMLLinkElement && node.href) {
          delete externalCssCache[node.href]
        }
      }
    })
  })
  if (!styleChanged) {
    return
  }
  if (styleChangeTimer !== null) {
    clearTimeout(styleChangeTimer)
  }
  styleChangeTimer = setTimeout(function () {
    styleChangeTimer = null
    const target = last$0
    if (target && target.isConnected) {
      getC(target)
    }
  }, 800)
})
if (document.head) {
  styleObserver.observe(document.head, { childList: true, subtree: true })
}

chrome.runtime
  .sendMessage({
    action: 'evalGetCssUsed',
    info: 'page loaded',
  })
  .catch(() => {
    // console.log('error',error);
  })

  // expõe getC como global 'getCssUsed' no mundo do content script,
  // para o devtools.js poder chamar via inspectedWindow.eval(...)
  ; (globalThis as any).getCssUsed = getC

export default getC
