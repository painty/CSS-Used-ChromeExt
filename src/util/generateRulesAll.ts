import traversalCSSRuleList from './traversalCSSRuleList'
import convTextToRules from './convTextToRules'
import convLinkToText from './convLinkToText'
import { cssHelper } from './cssHelper'
import convUrlToAbs from './convUrlToAbs'
import { getCssRulesText } from './getCssRulesText'
import { collectStyleSheets } from './collectStyleSheets'

type cssNodeObj = Awaited<ReturnType<typeof convTextToRules>>

function generateRulesAll(
  doc: Document,
  externalCssCache: { [index: cssNodeObj['href']]: cssNodeObj },
  ele?: Element
) {
  var objCss = {
    normRule: [],
    fontFace: [],
    keyFram: [],
    propRule: [],
  }

  var promises = []

  return new Promise(function (resolve, reject) {
    // toutes les feuilles atteignables : document + adoptedStyleSheets
    // + shadow roots (P3) — pas seulement doc.styleSheets
    const sheets = collectStyleSheets(doc, ele)
    for (const styleSheet of sheets) {
      promises.push(
        new Promise(function (res) {
          const sheetHref = styleSheet.href
          if (sheetHref !== null) {
            // link tag (document ou shadow root)
            const cssNodeArr = externalCssCache[sheetHref]
            if (cssNodeArr) {
              cssNodeArr.media = styleSheet.media
              traversalCSSRuleList(doc, externalCssCache, cssNodeArr).then(res)
            } else {
              // cache miss (ex: <link> dans un shadow root, non préchargé) :
              // lire le CSSOM de la feuille directement, puis fallback
              // convLinkToText (fetch / devtools getResources)
              const cssomText = getCssRulesText(styleSheet)
              const parseAndStore = (raw: string) => {
                convTextToRules(raw, sheetHref).then((cssNodeObj) => {
                  cssNodeObj.media = styleSheet.media
                  externalCssCache[sheetHref] = cssNodeObj
                  traversalCSSRuleList(doc, externalCssCache, cssNodeObj).then(
                    res
                  )
                })
              }
              if (cssomText !== null) {
                parseAndStore(cssomText)
              } else {
                convLinkToText([sheetHref]).then((result) => {
                  parseAndStore(result[0] ? result[0].cssraw : '')
                })
              }
            }
          } else if (styleSheet.ownerNode instanceof Element) {
            // style tag
            // prefer the CSSOM: it reflects what the browser actually applies
            // (including rules injected dynamically via insertRule),
            // then fallback to the raw tag content
            let html: string =
              getCssRulesText(styleSheet) ?? styleSheet.ownerNode.innerHTML
            if (html === '') {
              // style may be in style-tag's cssRules but not show in innerHTML
              try {
                for (
                  let index = 0;
                  index < styleSheet.cssRules.length;
                  index++
                ) {
                  const rule = styleSheet.cssRules[index]
                  html += rule.cssText
                }
              } catch {
                // feuille inaccessible
              }
            }
            // convert urls in style tag to abs
            html = html.replace(
              /url\((['"]?)(.*?)\1\)/g,
              function (_a, p1, p2) {
                return (
                  'url(' + p1 + convUrlToAbs(doc.location.href, p2) + p1 + ')'
                )
              }
            )
            convTextToRules(html, doc.location.href).then((cssNodeObj) => {
              cssNodeObj.media = styleSheet.media
              traversalCSSRuleList(doc, externalCssCache, cssNodeObj).then(res)
            })
          } else {
            // adopted stylesheet (document.adoptedStyleSheets ou
            // shadowRoot.adoptedStyleSheets) ou ProcessingInstruction
            const cssomText = getCssRulesText(styleSheet)
            if (cssomText !== null) {
              convTextToRules(cssomText, doc.location.href).then(
                (cssNodeObj) => {
                  cssNodeObj.media = styleSheet.media
                  traversalCSSRuleList(doc, externalCssCache, cssNodeObj).then(
                    res
                  )
                }
              )
            } else {
              res({})
            }
          }
        })
      )
    }

    Promise.all(promises)
      .then(function (result) {
        result.forEach(function (ele) {
          cssHelper.mergeobjCss(objCss, ele)
        })
        resolve(objCss)
      })
      .catch(function (err) {
        reject(err)
      })
  })
}
export default generateRulesAll
