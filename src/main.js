/* global chrome*/
// chrome.runtime.sendMessage=function(){};
const filterRules = require('./filterRules');
const convLinkToText = require('./convLinkToText');
const convUrlToAbs = require('./convUrlToAbs');
const convTextToRules = require('./convTextToRules');
const postTideCss = require('./postTideCss');
const generateRulesAll = require('./generateRulesAll');

var externalCssCache = {};
//to store timers of testing if a html element matches a rule selector.
var arrTimerOfTestingIfMatched = [];
var doc = document;

function getC($0) {
  arrTimerOfTestingIfMatched.forEach(function (ele) {
    clearTimeout(ele);
  });
  arrTimerOfTestingIfMatched = [];

  if ($0 === null || typeof $0 === 'undefined' || typeof $0.nodeName === 'undefined') {
    return
  } else {
    if ($0.nodeName.match(/^<pseudo:/)) {
      chrome.runtime.sendMessage({
        status: "It's a pseudo element"
      });
      return
    } else if ($0.nodeName === 'html' || $0.nodeName.match(/^#/)) {
      chrome.runtime.sendMessage({
        status: "Not for this element"
      });
      return
    }
  }

  var isInSameOrigin = true;
  try {
    $0.ownerDocument.defaultView.parent.document
  } catch (e) {
    isInSameOrigin = false;
    // console.log(e);
  }

  if (isInSameOrigin) {
    // if same isInSameOrigin
    // $0 can be accessed from its parent context
    if ($0.ownerDocument.defaultView.parent.document !== document) {
      return
    }
  }

  chrome.runtime.sendMessage({
    status: "Preparing ..."
  });

  // console.log('NOT return,begin');
  doc = $0.ownerDocument;

  var links = [];
  Array.prototype.forEach.call($0.ownerDocument.querySelectorAll('link[rel~="stylesheet"][href]'), function (ele) {
    // if href==='' , ele.getAttribute('href') !== ele.href
    if (ele.getAttribute('href') && (externalCssCache[ele.href] === undefined)) {
      links.push(ele.href);
    }
  });
  convLinkToText(links).then(function (result) {
      var promises = [];
      for (var i = 0; i < result.length; i++) {
        let ele = result[i],
          idx = i;
        promises.push(convTextToRules(ele.cssraw, links[idx]));
      }
      return Promise.all(promises);
    }).catch(function (err) {
      chrome.runtime.sendMessage({
        err: JSON.stringify(err)
      });
    }).then(function (result) {
      result.forEach(function (ele) {
        externalCssCache[ele.href] = ele;
      });
    })
    .then(function () {
      return generateRulesAll(doc, externalCssCache)
    })
    .then(function (objCss) { // {fontFace : Array, keyFram : Array, normRule : Array}
      return filterRules($0, objCss, arrTimerOfTestingIfMatched);
    }).then(function (data) {
      chrome.runtime.sendMessage({
        css: postTideCss(data),
        html: $0.outerHTML.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
          .replace(/<link[\s\S]*?>/gi, '')
          .replace(/(<img[^>]+src=(['"]))(.*?)(\2.*?>)/g, function () {
            var src = convUrlToAbs(doc.location.href, arguments[3]);
            return arguments[1] + src + arguments[4]
          })
          .replace(/(<img[^>]+srcset=(['"]))(.*?)(\2.*?>)/g, function () {
            var srcset = arguments[3].split(/,\s*/)
            srcset.forEach(function (ele, index) {
              var src = ele.replace(/([^ ]*)(.*)/, function () {
                var _src = convUrlToAbs(doc.location.href, arguments[1])
                return _src + ' ' + arguments[2]
              })
              srcset[index] = src;
            })
            return arguments[1] + srcset.join(',') + arguments[4]
          })
      });
    });
}

module.exports = getC;