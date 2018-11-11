const traversalCSSRuleList = require('./traversalCSSRuleList');
const convTextToRules = require('./convTextToRules');
const cssHelper = require('./cssHelper');
const convUrlToAbs = require('./convUrlToAbs');

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
          // convert urls in style tag to abs
          let html = doc.styleSheets[x].ownerNode.innerHTML.replace(/url\((['"]?)(.*?)\1\)/g, function (a, p1, p2) {
            return 'url(' + convUrlToAbs(doc.location.href, p2) + ')';
          });
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
module.exports = generateRulesAll;