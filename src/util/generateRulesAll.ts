import traversalCSSRuleList from "./traversalCSSRuleList";
import convTextToRules from "./convTextToRules";
import {cssHelper} from "./cssHelper";
import convUrlToAbs from "./convUrlToAbs";

type cssNodeObj = Awaited<ReturnType<typeof convTextToRules>>;

function generateRulesAll(
  doc: Document,
  externalCssCache: { [index: cssNodeObj["href"]]: cssNodeObj }
) {
  var x: number;

  var objCss = {
    normRule: [],
    fontFace: [],
    keyFram: [],
  };

  var promises = [];

  return new Promise(function (resolve, reject) {
    // loop every styleSheets
    for (x = 0; x < doc.styleSheets.length; x++) {
      const styleSheet = doc.styleSheets[x];
      promises.push(
        new Promise(function (res) {
          var cssNodeArr : cssNodeObj;
          if (styleSheet.href !== null) {
            // can be link tag
            cssNodeArr = externalCssCache[styleSheet.href];
            cssNodeArr.media = doc.styleSheets[x].media;
            traversalCSSRuleList(doc, externalCssCache, cssNodeArr).then(res);
          } else if(styleSheet.ownerNode instanceof Element) {
            // style tag
            let html: string = styleSheet.ownerNode.innerHTML;
            if (html === "") {
              // style may be in style-tag's cssRules but not show in innerHTML
              for (
                let index = 0;
                index < doc.styleSheets[x].cssRules.length;
                index++
              ) {
                const rule = doc.styleSheets[x].cssRules[index];
                html += rule.cssText;
              }
            }
            // convert urls in style tag to abs
            html = html.replace(
              /url\((['"]?)(.*?)\1\)/g,
              function (_a, _p1, p2) {
                return "url(" + convUrlToAbs(doc.location.href, p2) + ")";
              }
            );
            // the next operation is asynchronous
            // store the current x value
            let _x = x;
            convTextToRules(html, doc.location.href).then(cssNodeObj=>{
              cssNodeObj.media = doc.styleSheets[_x].media;
              traversalCSSRuleList(doc, externalCssCache, cssNodeObj).then(res);
            });
          }else{
            // console.log('ProcessingInstruction', styleSheet.ownerNode);
            res({})
          }
        })
      );
    }

    Promise.all(promises)
      .then(function (result) {
        result.forEach(function (ele) {
          cssHelper.mergeobjCss(objCss, ele);
        });
        resolve(objCss);
      })
      .catch(function (err) {
        reject(err);
      });
  });
}
export default generateRulesAll;
