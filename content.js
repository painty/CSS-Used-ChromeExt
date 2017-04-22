var working = false;
var externalCss = {};

// may match accoding to interaction
var pseudocls = 'active|checked|disabled|empty|enabled|focus|hover|in-range|invalid|link|out-of-range|target|valid|visited',
    pseudoele = 'after|before|first-letter|first-line|selection';

function getC($0) {
    console.log('getC($0)',working);
    working = true;
    var domlist = [];
    domlist.push($0);
    Array.prototype.forEach.call($0.querySelectorAll('*'), function(e) {
        domlist.push(e);
    });


    function getCssTxt(rules, nowSheet) {
        if (rules === null) return [];
        var _ele, arrCss = [],
            arrSel, arrSelMatched,
            rules, keyFram = [],
            keyFramUsed = [],
            font = [],
            fontUsed = [],
            // baseURI,
            childRules = '',
            i, j, k;

        for (i = 0; i < rules.length; i++) {

            chrome.runtime.sendMessage({
                dom: domlist.length - 1,
                rule: i,
                sheet: nowSheet
            });

            // CSSKeyframesRule
            if (rules[i].type === 7) {
                keyFram.push(rules[i]);
                continue;
            };

            // CSSFontFaceRule
            if (rules[i].type === 5) {
                font.push(rules[i]);
                continue;
            };

            // CSSMediaRule
            if (rules[i].type === 4) {
                childRules = getCssTxt(rules[i].cssRules, nowSheet);
                if (childRules.length > 0) {
                    arrCss.push('\n@media ' + rules[i].conditionText + '{\n');
                    arrCss = arrCss.concat(childRules);
                    arrCss.push('}\n');
                }
                continue;
            };

            // CSSImportRule
            if (rules[i].type === 3) {
                if (rules[i].styleSheet && rules[i].styleSheet.cssRules) {
                    childRules = getCssTxt(rules[i].styleSheet.cssRules, nowSheet);
                    if (childRules.length > 0) {
                        arrCss = arrCss.concat(childRules);
                    }
                }
                continue;
            };

            if (!rules[i].selectorText) continue;
            
            // the normal "CSSStyleRule"

            arrSel = rules[i].selectorText.split(', ');
            arrSelMatched = [];
            for (j = 0, length2 = arrSel.length; j < length2; j++) {
                for (k = 0, length3 = domlist.length; k < length3; k++) {
                    _ele = domlist[k];

                    // these pseudo class/elements can apply to any ele
                    // but wont apply now 
                    // eg. :active{xxx}
                    // only works when clicked on and actived
                    if (arrSel[j].match(new RegExp('^:((' + pseudocls + ')|(:?' + pseudoele + '))*$', ''))) {
                        arrSelMatched.push(arrSel[j]);
                    } else {
                        try {
                            if (_ele.matches(arrSel[j].replace(new RegExp(':((' + pseudocls + ')|(:?' + pseudoele + '))*', 'g'), ''))) {
                                arrSelMatched.push(arrSel[j]);
                            }
                        } catch (e) {
                            // console.log(e);
                        }
                    }
                }
            }

            // remove duplicate selector
            arrSelMatched = arrSelMatched.filter(function(v, i, self) {
                return self.indexOf(v) === i;
            });

            if (arrSelMatched.length > 0) {
                arrCss.push(rules[i].cssText
                    .replace(rules[i].selectorText, arrSelMatched.join(','))
                    .replace(/\}$/, function() {
                        return chromeBugFix(rules[i])
                    }) + '\n');
                if (rules[i].style.animationName) {
                    keyFramUsed.push(rules[i].style.animationName.split(', '));
                };
                if (rules[i].style.fontFamily) {
                    fontUsed.push(rules[i].style.fontFamily.split(', '));
                };
            };
        }

        // find used keyframe defination
        for (i = 0; i < keyFram.length; i++) {
            for (j = 0; j < keyFramUsed.length; j++) {
                for (k = 0; k < keyFramUsed[j].length; k++) {
                    if (keyFram[i].name === keyFramUsed[j][k]) {
                        arrCss.push('\n' + keyFram[i].cssText + '\n');
                    };
                };
            };
        };

        // find used fontface defination
        for (i = 0; i < font.length; i++) {
            for (j = 0; j < fontUsed.length; j++) {
                for (k = 0; k < fontUsed[j].length; k++) {
                    if (font[i].style.fontFamily === fontUsed[j][k]) {
                        arrCss.push('\n' + font[i].cssText + '\n');
                    };
                };
            };
        };

        return arrCss;
    }

    function handleCssTxt() {
        var arr = [],
            arrtemp = [],
            s = '',
            x, rules, cssHref;

        // check every css rule
        for (x = 0; x < document.styleSheets.length; x++) {
            // baseURI=document.styleSheets[x].ownerNode.href || document.styleSheets[x].ownerNode.baseURI;
            cssHref=document.styleSheets[x].ownerNode.href;
            rules = (externalCss[cssHref] && externalCss[cssHref].cssRules) || document.styleSheets[x].cssRules;

            arrtemp = getCssTxt(rules, x + '/' + document.styleSheets.length);
            if (arrtemp.length > 0) {
                // annotion where the CSS rule from
                arr.push('\n/* CSS Used from : ' + (document.styleSheets[x].ownerNode.href ? document.styleSheets[x].ownerNode.href : 'Embedded') + ' */\n');
                arr = arr.concat(arrtemp);
            }
        };

        s = arr.join('');
        // color  rgb->hex
        s = s.replace(/ rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)/g, function(a, p1, p2, p3) {
                function to2w(n) {
                    var s = (n * 1).toString(16);
                    if (n < 16) {
                        return '0' + s;
                    }
                    return s;
                }
                return ' #' + (to2w(p1) + to2w(p2) + to2w(p3)).replace(/((.)\2)((.)\4)((.)\6)/, '$2$4$6');
            }).replace(/(['"']?)微软雅黑\1/, '"Microsoft Yahei"')
            .replace(/(['"']?)宋体\1/, ' simsun ');
        chrome.runtime.sendMessage({
            css: s,
            html: $0.outerHTML.replace(/<script>[\s\S]*?<\/script>/g, '')
        });
    }

    var links=[];
    Array.prototype.forEach.call(document.querySelectorAll('link[rel="stylesheet"][href]'), function(ele) {
        if(ele.href && (externalCss[ele.href] === undefined) ){
            links.push(ele.href);
        }
    });

    convLinkToText(links).then(function(result) {
        if( Object.prototype.toString.call( result ) === '[object Array]' ){
            result.forEach(function(ele){
                ele.CSSStyleSheet=convTextToRules(ele.cssraw);
                externalCss[ele.url] = ele;
            });
        }
    }, function(err) {
        chrome.runtime.sendMessage({
            err: JSON.stringify(err)
        });
    }).then(function(){
        generateRulesAll();
        // handleCssTxt();
    })
}

function generateRulesAll(){
    var x,cssHref,styleSheet,objCss={};

    objCss.normRule=[];
    objCss.fontFace=[];
    objCss.keyFram=[];

    // loop every styleSheets
    for (x = 0; x < document.styleSheets.length; x++) {
        // baseURI=document.styleSheets[x].ownerNode.href || document.styleSheets[x].ownerNode.baseURI;
        cssHref=document.styleSheets[x].ownerNode.href;
        styleSheet = (externalCss[cssHref]&&externalCss[cssHref].CSSStyleSheet) || document.styleSheets[x];
        helper.mergeobjCss(objCss,traversalCSSRuleList(styleSheet));
    };
    console.log(objCss);
    return objCss;
}

helper={
    mergeobjCss:function(a,b){
        ['normRule','fontFace','keyFram'].forEach(function(ele){
            if(!a[ele]||!b[ele]){
                console.log('NO '+ele);
            }
            a[ele]=a[ele].concat(b[ele])
        });
    }
}

function traversalCSSRuleList(styleSheet){
    var objCss={};
    objCss.normRule=[];
    objCss.keyFram=[];
    objCss.fontFace=[];

    var CSSRuleList=styleSheet.cssRules;

    if(CSSRuleList===null){
        return objCss;
    }

    // annotion where the CSS rule from
    if(CSSRuleList.length>0){
        if(styleSheet.href){
            objCss.normRule.push('/* CSS Used from: '+styleSheet.href+' */');
        }else if(styleSheet.ownerNode){
            objCss.normRule.push('/* CSS Used from: Embedded */');
        }
    }

    for (var i = 0; i < CSSRuleList.length; i++) {

        // CSSKeyframesRule
        if (CSSRuleList[i].type === 7) {
            objCss.keyFram.push(CSSRuleList[i]);
            continue;
        };

        // CSSFontFaceRule
        if (CSSRuleList[i].type === 5) {
            objCss.fontFace.push(CSSRuleList[i]);
            continue;
        };

        // CSSMediaRule
        if (CSSRuleList[i].type === 4) {
            objCss.normRule.push('\n@media ' + CSSRuleList[i].conditionText + '{\n');
            helper.mergeobjCss(objCss, traversalCSSRuleList(CSSRuleList[i]) );
            objCss.normRule.push('}\n');
            continue;
        };

        // CSSImportRule
        if (CSSRuleList[i].type === 3) {

            console.log(CSSRuleList[i],CSSRuleList[i].href,CSSRuleList[i].styleSheet);
            
            if (CSSRuleList[i].styleSheet && CSSRuleList[i].styleSheet.cssRules) {
                helper.mergeobjCss(objCss, traversalCSSRuleList(CSSRuleList[i]).styleSheet );
            }
            continue;
        };

        if (!CSSRuleList[i].selectorText) continue;
        
        // the normal "CSSStyleRule"
        objCss.normRule.push(CSSRuleList[i]);
    }
    return objCss;
}

function makeRequest(url) {
    var result={};
    result.url=url;
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.responseType = 'arraybuffer';
        xhr.open('get', url);
        xhr.onload = function() {
            if (this.status >= 200 && this.status < 300) {
                var decoder;
                if (isutf8(new Uint8Array(xhr.response))) {
                    decoder = new TextDecoder('UTF-8');
                } else {
                    decoder = new TextDecoder('gbk');
                };
                result.cssraw = decoder.decode(xhr.response)
                    .replace(/url\((.*?)\)/g, function(a, p1) {
                        return 'url(' + convUrlToAbs(url, p1) + ')';
                    });
                result.status=this.status;
                result.statusText=this.statusText;
                chrome.runtime.sendMessage({
                    cssloading: url
                });
                resolve(result);
            } else {
                result.cssraw="";
                result.status=this.status;
                result.statusText=this.statusText;
                resolve(result);
            }
        };
        xhr.onerror = function() {
            result.cssraw="";
            result.status=this.status;
            result.statusText=this.statusText;
            resolve(result);
        };
        xhr.send();
    });
}

function convLinkToText(links) {
    var promises = [];
    return new Promise(function(resolve, reject) {
        if (links.length === 0) {
            resolve('No need to ajax link');
        } else {
            for (var i = 0; i < links.length; i++) {
                promises.push(makeRequest(links[i]));
            };
            Promise.all(promises).then(function(a) {
                resolve(a);
            }).catch(function(err) {
                reject(err);
            });
        }
    });
}

function convTextToRules(styleContent) {
    var doc = document, //.implementation.createHTMLDocument(""),
        styleElement = document.createElement("style"),
        resultCssRules;
    styleElement.innerText = styleContent;
    // the style will only be parsed once it is added to a document
    doc.body.appendChild(styleElement);
    resultCssRules = styleElement.sheet;
    doc.body.removeChild(styleElement);
    return resultCssRules;
}

function convUrlToAbs(baseURI, url) {
    var quote = /^['"]*(.*?)['"]*$/;
    baseURI = baseURI.replace(quote, '$1');
    url = url.replace(quote, '$1');
    var _baseURI = new URI(baseURI),
        _url = new URI(url);
    if (url.match(/^\/\//)) {
        return '"' + _baseURI.protocol() + ':' + url + '"';
    };
    if (url.match(/^\//)) {
        return '"' + _baseURI.protocol() + '://' + _baseURI.hostname() + url + '"';
    };
    if (_url.is('relative')) {
        return '"' + _baseURI.protocol() + '://' + _baseURI.hostname() + _baseURI.directory() + '/' + url + '"';
    };
    if (_url.is('absolute')) {
        return '"' + url + '"';
    };
}

// cssText won't show background-size
// even it is in the css file
// but -webkit-background-size do
function chromeBugFix(rule) {
    var bas = rule.style.backgroundSize;
    if (bas !== "initial" && bas !== "") {
        return 'background-size:' + bas + ';}';
    } else {
        return '}';
    }
}
