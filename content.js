var globalCount = 0;
var externalCssCache = {};
var toList=[]; //store testDomMatch timers
var doc=document;

// may match accoding to interaction
var pseudocls = 'active|checked|disabled|empty|enabled|focus|hover|in-range|invalid|link|out-of-range|target|valid|visited',
    pseudoele = 'after|before|first-letter|first-line|selection';

function getC($0) {
    globalCount++;
    toList.forEach(function(ele){
        clearTimeout(ele);
    });
    toList=[];

    if($0 ===null || typeof $0 ==='undefined' || typeof $0.nodeName ==='undefined'){
        return
    }else{
        if($0.nodeName.match(/^<pseudo:/)){
            chrome.runtime.sendMessage({
                status: "It's a pseudo element"
            });
            return
        }else if($0.nodeName==='html' || $0.nodeName.match(/^#/)){
            chrome.runtime.sendMessage({
                status: "Not for this element"
            });
            return
        }
    }

    var isInSameOrigin=true;
    try{
        $0.ownerDocument.defaultView.parent.document
    }catch(e){
        isInSameOrigin=false;
        // console.log(e);
    }

    if(isInSameOrigin){
        // if same isInSameOrigin
        // $0 can be accessed from its parent context
        if($0.ownerDocument.defaultView.parent.document!==document){
            return
        }
    }

    chrome.runtime.sendMessage({
        status: "Preparing ..."
    });

    // console.log('NOT return,begin');
    doc=$0.ownerDocument;

    var links=[];
    Array.prototype.forEach.call($0.ownerDocument.querySelectorAll('link[rel~="stylesheet"][href]'), function(ele) {
        if(ele.href && (externalCssCache[ele.href] === undefined) ){
            links.push(ele.href);
        }
    });
    convLinkToText(links).then(function(result) {
        if( Object.prototype.toString.call( result ) === '[object Array]' ){
            result.forEach(function(ele,idx){
                ele.CSSStyleSheet=convTextToRules(ele.cssraw,links[idx]);
                externalCssCache[ele.url] = ele;
            });
        }
    }, function(err) {
        chrome.runtime.sendMessage({
            err: JSON.stringify(err)
        });
    }).then(function(){
        return generateRulesAll();
    }).then(function(objCss){ // {fontFace : Array, keyFram : Array, normRule : Array}
        return testDomMatch($0,objCss,globalCount);
    }).then(function(data){
        return cleanCSS(data)
    }).then(function(data){
        chrome.runtime.sendMessage({
            css: postFixCss(data.styles),
            html: $0.outerHTML.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi,'').replace(/<link[\s\S]*?>/gi,'')
        });
    });
}

function testDomMatch($0,objCss,localCount){

    var promises = [];
    var x,y;
    var matched=[];
    var keyFramUsed = [];
    var fontFaceUsed = [];

    var domlist = [];
    domlist.push($0);
    Array.prototype.forEach.call($0.querySelectorAll('*'), function(e) {
        domlist.push(e);
    });

    return new Promise(function (resolve, reject) {
        // loop every dom
        objCss.normRule.forEach(function(rule,idx){
            promises.push(new Promise(function (res, rej){
                var timer=setTimeout(function(){
                    if(localCount!==globalCount){
                        // resolve(matched);
                        return;
                    }
                    if(idx%100===0){
                        chrome.runtime.sendMessage({
                            dom:domlist.length-1,
                            rule:objCss.normRule.length,
                            rulenow:idx
                        });
                    }
                    
                    if(typeof rule === 'string'){
                        res(rule);
                        return;
                    }else{
                        var selMatched=[];
                        var arrSel=rule.selectorText.split(', ').filter(function(v, i, self) {
                            return self.indexOf(v) === i;
                        });
                        arrSel.forEach(function(sel,i){
                            if(selMatched.indexOf(sel)!==-1){
                                return;
                            }
                            // these pseudo class/elements can apply to any ele
                            // but wont apply now 
                            // eg. :active{xxx}
                            // only works when clicked on and actived
                            if (sel.match(new RegExp('^(:(' + pseudocls + ')|::?(' + pseudoele + '))+$', ''))) {
                                selMatched.push(sel);
                            } else {
                                try{
                                    let replacedSel=sel.replace(new RegExp('( |^)(:(' + pseudocls + ')|::?(' + pseudoele + '))+( |$)', 'g'), ' * ');
                                    replacedSel=replacedSel.replace(new RegExp('\\((:(' + pseudocls + ')|::?(' + pseudoele + '))+\\)', 'g'), '(*)');
                                    replacedSel=replacedSel.replace(new RegExp('(:(' + pseudocls + ')|::?(' + pseudoele + '))+', 'g'), '');
                                    if($0.matches(sel)||$0.querySelectorAll(sel).length!==0){
                                        selMatched.push(sel);
                                    }else if($0.matches(replacedSel)||$0.querySelectorAll(replacedSel).length!==0){
                                        selMatched.push(sel);
                                    }
                                }catch(e){
                                    console.log(sel,e);
                                }
                            }
                        });
                        if(selMatched.length!==0){
                            res(rule.cssText.replace(rule.selectorText,selMatched.join(',')));
                            if (rule.style.animationName) {
                                keyFramUsed=keyFramUsed.concat(rule.style.animationName.split(', '));
                            };
                            if (rule.style.fontFamily) {
                                fontFaceUsed=fontFaceUsed.concat(rule.style.fontFamily.split(', '));
                            };
                            return;
                        }
                    }
                    res("");
                },0);
                toList.push(timer);
            }));
        });

        Promise.all(promises).then(function(result) {
            keyFramUsed=keyFramUsed.filter(function(v, i, self) {
                return self.indexOf(v) === i;
            });
            fontFaceUsed=fontFaceUsed.filter(function(v, i, self) {
                return self.indexOf(v) === i;
            });
            result.forEach(function(ele){
                // ele:string
                if(ele.length>0){
                    matched.push(ele);
                }
            });
            keyFramUsed.forEach(function(ele){
                objCss.keyFram.forEach(function(e){
                    if(ele===e.name){
                        matched.push(e.cssText);
                    }
                })
            });
            fontFaceUsed.forEach(function(ele){
                objCss.fontFace.forEach(function(e){
                    if(ele===e.style.fontFamily){
                        matched.push(e.cssText);
                    }
                })
            });
            resolve(matched);
        }).catch(function(err) {
            reject(err);
        });
    });
}

function generateRulesAll(){
    var x,styleSheet,objCss={};

    objCss.normRule=[];
    objCss.fontFace=[];
    objCss.keyFram=[];

    var promises = [];

    return new Promise(function (resolve, reject) {
        // loop every styleSheets
        for (x = 0; x < doc.styleSheets.length; x++) {
            promises.push(new Promise(function (res, rej){
                // baseURI=doc.styleSheets[x].ownerNode.href || doc.styleSheets[x].ownerNode.baseURI;
                var cssHref=doc.styleSheets[x].ownerNode.href;
                var cssLink=externalCssCache[cssHref]&&externalCssCache[cssHref].CSSStyleSheet;
                if(cssLink){
                    styleSheet=cssLink;
                }else{
                    styleSheet=doc.styleSheets[x];
                    // convert style tag css url to abs
                    styleSheet.ownerNode.innerHTML=styleSheet.ownerNode.innerHTML
                        .replace(/url\((.*?)\)/g, function(a, p1) {
                            return 'url(' + convUrlToAbs(doc.location.href, p1) + ')';
                        });
                }
                traversalCSSRuleList(styleSheet).then(function(obj){
                    res(obj);
                })
            }));
        };

        Promise.all(promises).then(function(result) {
            result.forEach(function(ele){
                helper.mergeobjCss(objCss, ele );
            });
            resolve(objCss);
        }).catch(function(err) {
            reject(err);
        });
    });
}

var helper={
    mergeobjCss:function(a,b){
        ['normRule','fontFace','keyFram'].forEach(function(ele){
            if(!a[ele]||!b[ele]){
                // console.log('NO '+ele);
            }
            a[ele]=a[ele].concat(b[ele])
        });
    }
}

function cleanCSS(s){
    s=s.join('');

    var options = {
        level: {
            1: {
                cleanupCharsets: false, // controls `@charset` moving to the front of a stylesheet; defaults to `true`
                normalizeUrls: true, // controls URL normalization; defaults to `true`
                optimizeBackground: false, // controls `background` property optimizations; defaults to `true`
                optimizeBorderRadius: false, // controls `border-radius` property optimizations; defaults to `true`
                optimizeFilter: false, // controls `filter` property optimizations; defaults to `true`
                optimizeFont: false, // controls `font` property optimizations; defaults to `true`
                optimizeFontWeight: false, // controls `font-weight` property optimizations; defaults to `true`
                optimizeOutline: false, // controls `outline` property optimizations; defaults to `true`
                removeEmpty: true, // controls removing empty rules and nested blocks; defaults to `true`
                removeNegativePaddings: true, // controls removing negative paddings; defaults to `true`
                removeQuotes: true, // controls removing quotes when unnecessary; defaults to `true`
                removeWhitespace: true, // controls removing unused whitespace; defaults to `true`
                replaceMultipleZeros: true, // contols removing redundant zeros; defaults to `true`
                replaceTimeUnits: false, // controls replacing time units with shorter values; defaults to `true`
                replaceZeroUnits: true, // controls replacing zero values with units; defaults to `true`
                roundingPrecision: false, // rounds pixel values to `N` decimal places; `false` disables rounding; defaults to `false`
                selectorsSortingMethod: 'standard', // denotes selector sorting method; can be `'natural'` or `'standard'`, `'none'`, or false (the last two since 4.1.0); defaults   o `'standard'`
                specialComments: 'all', // denotes a number of /*! ... */ comments preserved; defaults to `all`
                tidyAtRules: true, // controls at-rules (e.g. `@charset`, `@import`) optimizing; defaults to `true`
                tidyBlockScopes: true, // controls block scopes (e.g. `@media`) optimizing; defaults to `true`
                tidySelectors: true, // controls selectors optimizing; defaults to `true`,
                transform: function () {} // defines a callback for fine-grained property optimization; defaults to no-op
            }
        },
        format: {
            breaks: { // controls where to insert breaks
                afterAtRule: true, // controls if a line break comes after an at-rule; e.g. `@charset`; defaults to `false`
                afterBlockBegins: true, // controls if a line break comes after a block begins; e.g. `@media`; defaults to `false`
                afterBlockEnds: true, // controls if a line break comes after a block ends, defaults to `false`
                afterComment: true, // controls if a line break comes after a comment; defaults to `false`
                afterProperty: false, // controls if a line break comes after a property; defaults to `false`
                afterRuleBegins: false, // controls if a line break comes after a rule begins; defaults to `false`
                afterRuleEnds: true, // controls if a line break comes after a rule ends; defaults to `false`
                beforeBlockEnds: true, // controls if a line break comes before a block ends; defaults to `false`
                betweenSelectors: false // controls if a line break comes between selectors; defaults to `false`
            },
            indentBy: 0, // controls number of characters to indent with; defaults to `0`
            indentWith: 'space', // controls a character to indent with, can be `'space'` or `'tab'`; defaults to `'space'`
            spaces: { // controls where to insert spaces
                aroundSelectorRelation: false, // controls if spaces come around selector relations; e.g. `div > a`; defaults to `false`
                beforeBlockBegins: false, // controls if a space comes before a block begins; e.g. `.block {`; defaults to `false`
                beforeValue: false // controls if a space comes before a value; e.g. `width: 1rem`; defaults to `false`
            },
            wrapAt: false // controls maximum line length; defaults to `false`
        },
        returnPromise:true
    };
    s = new CleanCSS(options).minify(s);
    return s;
}

function postFixCss(s){
    s=s.split("\n");

    // remove the last comments line
    // which have no rules
    while(s.length>0&&s[s.length-1].match(/^\/\*\! |^$/)!==null){
        s=s.slice(0,s.length-1);
    }
    var arr=[],regFrom=/^\/\*\! CSS Used from: /;
    for (var i = 0; i < s.length; i++) {
        if( (s[i].match(regFrom)!==null) && ( i+1===s.length || ( s[i+1].match(regFrom)!==null ) )){
            continue;
        }else{
            arr.push(s[i]);
        }
    }
    s=arr.join('\n');
    s = s.replace(/(['"']?)微软雅黑\1/,'"Microsoft Yahei"')
    .replace(/(['"']?)宋体\1/,' simsun ');

    return s;
}

function traversalCSSRuleList(styleSheet){
    var promises = [];

    var objCss={
        normRule:[],
        keyFram:[],
        fontFace:[]
    };

    var CSSRuleList=styleSheet.cssRules;

    return new Promise(function (resolve, reject) {
        if(CSSRuleList===null){
            resolve(objCss);
        }else if(CSSRuleList.length>0){ // annotion where the CSS rule from
            if(styleSheet._href){
                objCss.normRule.push('/*! CSS Used from: '+styleSheet._href+' */');
            }else if(styleSheet.ownerNode){
                objCss.normRule.push('/*! CSS Used from: Embedded */');
            }
        }

        for (var i = 0; i < CSSRuleList.length; i++) {
            (function(CSSRuleListItem){
                promises.push(new Promise(function (res, rej){

                    var _objCss={
                        normRule:[],
                        keyFram:[],
                        fontFace:[]
                    };
                    
                    if (CSSRuleListItem.type === 7) { // CSSKeyframesRule
                        _objCss.keyFram.push(CSSRuleListItem);
                        res(_objCss);
                    }else if (CSSRuleListItem.type === 5) { // CSSFontFaceRule
                        _objCss.fontFace.push(CSSRuleListItem);
                        res(_objCss);
                    }else if (CSSRuleListItem.type === 4) { // CSSMediaRule
                        traversalCSSRuleList(CSSRuleListItem).then(function(obj){
                            _objCss.normRule.push('\n@media ' + CSSRuleListItem.conditionText + '{\n');
                            helper.mergeobjCss(_objCss, obj );
                            _objCss.normRule.push('}\n');
                            res(_objCss);
                        });
                    }else if (CSSRuleListItem.type === 3) { // CSSImportRule
                        let href=CSSRuleListItem.href;
                        if(href){
                            if(externalCssCache[href] !== undefined ){
                                let item=externalCssCache[href];
                                traversalCSSRuleList(item.CSSStyleSheet).then(function(obj){
                                    _objCss.normRule.push('/*! ' + CSSRuleListItem.cssText + ' */');
                                    helper.mergeobjCss(_objCss, obj );
                                    res(_objCss);
                                })
                            }else{
                                convLinkToText([href]).then(function(result){
                                    if( Object.prototype.toString.call( result ) === '[object Array]' ){
                                        let item=result[0];
                                        item.CSSStyleSheet=convTextToRules(item.cssraw);
                                        externalCssCache[item.url] = item;
                                        traversalCSSRuleList(item.CSSStyleSheet).then(function(obj){
                                            _objCss.normRule.push('/*! ' + CSSRuleListItem.cssText + ' */');
                                            helper.mergeobjCss(_objCss, obj );
                                            res(_objCss);
                                        })
                                    }
                                })
                            }
                        }else{
                            res(_objCss);
                        }
                    }else if (!CSSRuleListItem.selectorText) {
                        res(_objCss);
                    }else{ // the normal "CSSStyleRule"
                        _objCss.normRule.push(CSSRuleListItem)
                        res(_objCss);
                    };
                }));
            })(CSSRuleList[i])
        };

        Promise.all(promises).then(function(result) {
            result.forEach(function(ele){
                helper.mergeobjCss(objCss, ele );
            })
            resolve(objCss);
        }).catch(function(err) {
            reject(err);
        });
    });
}

function makeRequest(url) {
    var result={};
    result.url=url;
    chrome.runtime.sendMessage({
        status: 'Getting : '+url
    });
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
                resolve(result);
                chrome.runtime.sendMessage({
                    status: 'Parsing : '+url
                });
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
            Promise.all(promises).then(function(result) {
                resolve(result);
            }).catch(function(err) {
                reject(err);
            });
        }
    });
}

function convTextToRules(styleContent,href) {
    //document.implementation.createHTMLDocument(""),
    var styleElement = doc.createElement("style"),
        resultCssRules;
    styleElement.innerText = styleContent;
    // the style will only be parsed once it is added to a Document
    doc.body.appendChild(styleElement);
    resultCssRules = styleElement.sheet;
    doc.body.removeChild(styleElement);
    if(href){
        resultCssRules._href=href;
    };
    return resultCssRules;
}

function convUrlToAbs(baseURI, url) {
    var quote = /^['"]*(.*?)['"]*$/;
    baseURI = baseURI.replace(quote, '$1');
    url = url.replace(quote, '$1');
    var _baseURI = new URI(baseURI),
        _url = new URI(url);

    if(_url.is('absolute')){
        return url
    }else{
        return _url.absoluteTo(baseURI)._string
    }
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
