const cssHelper = require('./cssHelper');
const convUrlToAbs = require('./convUrlToAbs');
const convLinkToText = require('./convLinkToText');
const convTextToRules = require('./convTextToRules');

function traversalCSSRuleList(doc, externalCssCache, cssNodeArr) {
  var promises = [];

  var objCss = {
    normRule: [],
    keyFram: [],
    fontFace: []
  };

  return new Promise(function (resolve, reject) {
    if (cssNodeArr === undefined || cssNodeArr.length === 0) {
      resolve(objCss);
    } else if (cssNodeArr.length > 0) { // annotion where the CSS rule from
      let strMediaText = '';
      if (cssNodeArr.media && cssNodeArr.media.length > 0) {
        strMediaText = `; media=${cssNodeArr.media.mediaText} `;
      }
      if (cssNodeArr.href === doc.location.href) {
        objCss.normRule.push(`/*! CSS Used from: Embedded ${strMediaText}*/`);
      } else if (cssNodeArr.href && !cssNodeArr.parentHref) {
        objCss.normRule.push(`/*! CSS Used from: ${cssNodeArr.href} ${strMediaText}*/`);
      }
    }

    for (var i = 0; i < cssNodeArr.length; i++) {
      (function (CSSRuleListItem, i) {
        promises.push(new Promise(function (res, rej) {

          var _objCss = {
            normRule: [],
            keyFram: [],
            fontFace: []
          };
          if (CSSRuleListItem.type === 'atrule' && CSSRuleListItem.name.match(/^(-(webkit|moz|ms|o)-)?keyframes$/)) { // CSSKeyframesRule
            _objCss.keyFram.push(CSSRuleListItem);
            res(_objCss);
          } else if (CSSRuleListItem.type === 'atrule' && CSSRuleListItem.name === 'font-face') { // CSSFontFaceRule
            _objCss.fontFace.push(CSSRuleListItem);
            res(_objCss);
          } else if (CSSRuleListItem.type === 'atrule' && CSSRuleListItem.name === "media") { // CSSMediaRule
            traversalCSSRuleList(doc, externalCssCache, CSSRuleListItem.nodes).then(function (obj) {
              _objCss.normRule.push('\n@media ' + CSSRuleListItem.params + '{');
              cssHelper.mergeobjCss(_objCss, obj);
              _objCss.normRule.push('}');
              res(_objCss);
            });
          } else if (CSSRuleListItem.type === "atrule" && CSSRuleListItem.name === "import") { // CSSImportRule
            let isValidImport = true;
            for (let j = 0; j < i; j++) {
              let rule = cssNodeArr[j];
              if ((rule.type === 'rule') || (rule.type === 'atrule' && rule.name.match(/^charset|import$/) === null)) {
                isValidImport = false;
                break;
              }
            }
            if (!cssNodeArr.href) {
              // such as import inside media query
              isValidImport = false;
            }
            let importParamsMatch = CSSRuleListItem.params.match(/^(url\((['"]?)(.*?)\2\)|(['"])(.*?)\4)\s*(.*)$/);
            let href = importParamsMatch[3] || importParamsMatch[5] || '';
            let media = importParamsMatch[6];
            if (isValidImport && (href = convUrlToAbs(cssNodeArr.href, href)) && href !== cssNodeArr.parentHref) {
              new Promise((resolve, reject) => {
                  if (externalCssCache[href] !== undefined) {
                    resolve(externalCssCache[href]);
                  } else {
                    convLinkToText([href]).then(function (result) {
                      return convTextToRules(result[0].cssraw)
                    }).then(function (nodeArr) {
                      nodeArr.href = href;
                      nodeArr.parentHref = cssNodeArr.href;
                      externalCssCache[href] = nodeArr;
                      resolve(nodeArr);
                    });
                  }
                }).then(function (nodeArr) {
                  return traversalCSSRuleList(doc, externalCssCache, nodeArr);
                })
                .then(function (obj) {
                  if (obj.normRule.length > 0) {
                    _objCss.normRule.push('/*! @import ' + href + media + ' */');
                    media.length && _objCss.normRule.push('\n@media ' + media + '{');
                    cssHelper.mergeobjCss(_objCss, obj);
                    media.length && _objCss.normRule.push('}');
                    _objCss.normRule.push('/*! end @import */');
                  } else {
                    cssHelper.mergeobjCss(_objCss, obj);
                  }
                  res(_objCss);
                });
            } else {
              res(_objCss);
            }
          } else if (CSSRuleListItem.type === "rule" && CSSRuleListItem.selector !== '') { // the normal "CSSStyleRule"
            _objCss.normRule.push(CSSRuleListItem);
            res(_objCss);
          } else {
            res(_objCss);
          };
        }));
      })(cssNodeArr[i], i)
    };

    Promise.all(promises).then(function (result) {
      result.forEach(function (ele) {
        cssHelper.mergeobjCss(objCss, ele);
      })
      if (cssNodeArr.media && cssNodeArr.media.length > 0) {
        objCss.normRule.splice(1, 0, `@media ${cssNodeArr.media.mediaText}{`)
        objCss.normRule.push('}');
      }
      resolve(objCss);
    }).catch(function (err) {
      reject(err);
    });
  });
}

module.exports = traversalCSSRuleList;