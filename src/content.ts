import filterRules from './util/filterRules'
import convLinkToText from './util/convLinkToText'
import convTextToRules from './util/convTextToRules'
import postTideCss from './util/postTideCss'
import generateRulesAll from './util/generateRulesAll'
import cleanHTML from './util/cleanHTML'

type cssNodeObj = Awaited<ReturnType<typeof convTextToRules>>

const externalCssCache: { [index: string]: cssNodeObj } = {}
//to store timers of testing if a html element matches a rule selector.
const arrTimerOfTestingIfMatched: ReturnType<typeof setTimeout>[] = []
let doc = document
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

  const links: string[] = []

  $0.ownerDocument
    .querySelectorAll('link[rel~="stylesheet"][href]')
    .forEach((ele: HTMLLinkElement) => {
      // if href==='' , ele.getAttribute('href') !== ele.href
      const current = externalCssCache[ele.href]
      if (
        ele.getAttribute('href') &&
        (current === undefined || current.nodes.length === 0)
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
      return generateRulesAll(doc, externalCssCache)
    })
    .then(function (objCss) {
      // {fontFace : Array, keyFram : Array, normRule : Array}
      return filterRules($0, objCss, arrTimerOfTestingIfMatched)
    })
    .then(function (data) {
      chrome.runtime.sendMessage({
        action: 'celebrate',
        css: postTideCss(data),
        html: cleanHTML($0.outerHTML, doc),
      })
    })
}

chrome.runtime
  .sendMessage({
    action: 'evalGetCssUsed',
    info: 'page loaded',
  })
  .catch(() => {
    // console.log('error',error);
  })

export default getC
