import traversalCSSRuleList from './traversalCSSRuleList';
import convTextToRules from './convTextToRules';
import cssHelper from './cssHelper';
import convUrlToAbs from './convUrlToAbs';

function generateRulesAll(doc, externalCssCache) {
  var x;

  var objCss = {
    normRule: [],
    fontFace: [],
    keyFram: []
  }

  var promises = [];

  return new Promise(function (resolve, reject) {
    // loop every styleSheets
    for (x = 0; x < doc.styleSheets.length; x++) {
      promises.push(new Promise(function (res, rej) {
        var cssHref = doc.styleSheets[x].ownerNode.href;
        var cssNodeArr;
        if (cssHref) {
          cssNodeArr = externalCssCache[cssHref];
          cssNodeArr.media = doc.styleSheets[x].media;
          traversalCSSRuleList(doc, externalCssCache, cssNodeArr).then(function (obj) {
            res(obj);
          })
        } else {
          // style tag
          let html=doc.styleSheets[x].ownerNode.innerHTML;
          if(html===''){
            // style may be in style-tag's cssRules but not show in innerHTML
            for (let index = 0; index < doc.styleSheets[x].cssRules.length; index++) {
              const rule = doc.styleSheets[x].cssRules[index];
              html+=rule.cssText;
            }
          }
          // convert urls in style tag to abs
          html = html.replace(/url\((['"]?)(.*?)\1\)/g, function (a, p1, p2) {
            return 'url(' + convUrlToAbs(doc.location.href, p2) + ')';
          });
          // the next operation is asynchronous
          // store the current x value
          let _x = x;
          convTextToRules(html, doc.location.href).then(function (cssNodeArr) {
            cssNodeArr.media = doc.styleSheets[_x].media;
            traversalCSSRuleList(doc, externalCssCache, cssNodeArr).then(function (obj) {
              res(obj);
            })
          })
        }
      }));
    };

    Promise.all(promises).then(function (result) {
      result.forEach(function (ele) {
        cssHelper.mergeobjCss(objCss, ele);
      });
      resolve(objCss);
    }).catch(function (err) {
      reject(err);
    });
  });
}
export default generateRulesAll;