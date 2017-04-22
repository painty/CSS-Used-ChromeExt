var working = false;
var externalCssCache = {};

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

    var links=[];
    Array.prototype.forEach.call(document.querySelectorAll('link[rel="stylesheet"][href]'), function(ele) {
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
        // handleCssTxt();
    }).then(function(objCss){ // {fontFace : Array, keyFram : Array, normRule : Array}
        return testDomMatch(domlist,objCss);
    }).then(function(a){
        chrome.runtime.sendMessage({
            css: postFixCss(a),
            html: $0.outerHTML.replace(/<script>[\s\S]*?<\/script>/g,'')
        });
    });
}

function testDomMatch(domlist,objCss){
    var promises = [];
    var x,y;
    var matched=[];
    var keyFramUsed = [];
    var fontFaceUsed = [];

    return new Promise(function (resolve, reject) {
        // loop every dom
        objCss.normRule.forEach(function(rule,idx){
            domlist.forEach(function(element,index){
                promises.push(new Promise(function (res, rej){
                    setTimeout(function(){
                        if(typeof rule === 'string'){
                            if(index===0){
                                res(rule);
                            }else{
                                res([]);
                            }
                        }else{
                            var selMatched=[];
                            var arrSel=rule.selectorText.split(', ').filter(function(v, i, self) {
                                return self.indexOf(v) === i;
                            });
                            arrSel.forEach(function(sel,i){
                                // these pseudo class/elements can apply to any ele
                                // but wont apply now 
                                // eg. :active{xxx}
                                // only works when clicked on and actived
                                if (sel.match(new RegExp('^(:(' + pseudocls + ')|::?(' + pseudoele + '))+$', ''))) {
                                    if(selMatched.indexOf(sel)===-1){
                                        selMatched.push(sel);
                                    }
                                } else {
                                    try{
                                        let replacedSel=sel.replace(new RegExp('(:(' + pseudocls + ')|::?(' + pseudoele + '))+', 'g'), '');
                                        if(element.matches(sel)){
                                            selMatched.push(sel);
                                        }else if(replacedSel.match(/:not\(\)/)===null && element.matches(replacedSel)){
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
                            }else{
                                res([]);
                            }
                        }
                    },0);
                }));
            });
        });

        Promise.all(promises).then(function(result) {
            keyFramUsed=keyFramUsed.filter(function(v, i, self) {
                return self.indexOf(v) === i;
            });
            fontFaceUsed=fontFaceUsed.filter(function(v, i, self) {
                return self.indexOf(v) === i;
            });
            result.forEach(function(ele){
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
        for (x = 0; x < document.styleSheets.length; x++) {
            promises.push(new Promise(function (res, rej){
                // baseURI=document.styleSheets[x].ownerNode.href || document.styleSheets[x].ownerNode.baseURI;
                var cssHref=document.styleSheets[x].ownerNode.href;
                styleSheet = (externalCssCache[cssHref]&&externalCssCache[cssHref].CSSStyleSheet) || document.styleSheets[x];
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

helper={
    mergeobjCss:function(a,b){
        ['normRule','fontFace','keyFram'].forEach(function(ele){
            if(!a[ele]||!b[ele]){
                // console.log('NO '+ele);
            }
            a[ele]=a[ele].concat(b[ele])
        });
    }
}

function postFixCss(s){
    var arr=[],regFrom=/^\/\*\! CSS Used from: /;
    for (var i = 0; i < s.length; i++) {
        if(typeof s[i] === 'string'){
            if( (s[i].match(regFrom)!==null) && ( i+1===s.length || ( (typeof s[i+1] === 'string')&&(s[i+1].match(regFrom)!==null)) )){
                continue;
            }else{
                arr.push(s[i]);
            }
        }else{
            arr.push(s[i]);
        }
    }
    s=s.join('');
    s = s.replace(/(['"']?)微软雅黑\1/,'"Microsoft Yahei"')
    .replace(/(['"']?)宋体\1/,' simsun ');

    var options = {
        format: {
            breaks: { // controls where to insert breaks
                afterAtRule: true, // controls if a line break comes after an at-rule; e.g. `@charset`; defaults to `false`
                afterBlockBegins: true, // controls if a line break comes after a block begins; e.g. `@media`; defaults to `false`
                afterBlockEnds: true, // controls if a line break comes after a block ends, defaults to `false`
                afterComment: true, // controls if a line break comes after a comment; defaults to `false`
                afterProperty: true, // controls if a line break comes after a property; defaults to `false`
                afterRuleBegins: true, // controls if a line break comes after a rule begins; defaults to `false`
                afterRuleEnds: true, // controls if a line break comes after a rule ends; defaults to `false`
                beforeBlockEnds: true, // controls if a line break comes before a block ends; defaults to `false`
                betweenSelectors: false // controls if a line break comes between selectors; defaults to `false`
            },
            indentBy: 4, // controls number of characters to indent with; defaults to `0`
            indentWith: 'space', // controls a character to indent with, can be `'space'` or `'tab'`; defaults to `'space'`
            spaces: { // controls where to insert spaces
                aroundSelectorRelation: false, // controls if spaces come around selector relations; e.g. `div > a`; defaults to `false`
                beforeBlockBegins: false, // controls if a space comes before a block begins; e.g. `.block {`; defaults to `false`
                beforeValue: false // controls if a space comes before a value; e.g. `width: 1rem`; defaults to `false`
            },
            wrapAt: false // controls maximum line length; defaults to `false`
        }
    };
    var s = new CleanCSS(options).minify(s);

    return s.styles;
}

function traversalCSSRuleList(styleSheet){
    var promises = [];

    var objCss={};
    objCss.normRule=[];
    objCss.keyFram=[];
    objCss.fontFace=[];

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
                    
                    if (CSSRuleListItem.type === 7) { // CSSKeyframesRule
                        res({
                            normRule:[],
                            keyFram:[CSSRuleListItem],
                            fontFace:[],
                        });
                    }else if (CSSRuleListItem.type === 5) { // CSSFontFaceRule
                        res({
                            normRule:[],
                            keyFram:[],
                            fontFace:[CSSRuleListItem],
                        });
                    }else if (CSSRuleListItem.type === 4) { // CSSMediaRule
                        traversalCSSRuleList(CSSRuleListItem).then(function(obj){
                            var _obj={
                                normRule:[],
                                keyFram:[],
                                fontFace:[],
                            };
                            _obj.normRule.push('\n@media ' + CSSRuleListItem.conditionText + '{\n');
                            helper.mergeobjCss(_obj, obj );
                            _obj.normRule.push('}\n');
                            res(_obj);
                        });
                    }else if (CSSRuleListItem.type === 3) { // CSSImportRule
                        let href=CSSRuleListItem.href;
                        if(href){
                            convLinkToText([href]).then(function(result){
                                if( Object.prototype.toString.call( result ) === '[object Array]' ){
                                    let item=result[0];
                                    item.CSSStyleSheet=convTextToRules(item.cssraw);
                                    externalCssCache[item.url] = item;
                                    traversalCSSRuleList(item.CSSStyleSheet).then(function(obj){
                                        var _obj={
                                            normRule:[],
                                            keyFram:[],
                                            fontFace:[],
                                        };
                                        _obj.normRule.push('/*! ' + CSSRuleListItem.cssText + ' */');
                                        helper.mergeobjCss(_obj, obj );
                                        res(_obj);
                                    })
                                }
                            })
                        };
                    }else if (!CSSRuleListItem.selectorText) {
                        res({
                            normRule:[],
                            keyFram:[],
                            fontFace:[],
                        });
                    }else{ // the normal "CSSStyleRule"
                        res({
                            normRule:[CSSRuleListItem],
                            keyFram:[],
                            fontFace:[],
                        })
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
            Promise.all(promises).then(function(result) {
                resolve(result);
            }).catch(function(err) {
                reject(err);
            });
        }
    });
}

function convTextToRules(styleContent,href) {
    var doc = document, //.implementation.createHTMLDocument(""),
        styleElement = document.createElement("style"),
        resultCssRules;
    styleElement.innerText = styleContent;
    // the style will only be parsed once it is added to a document
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
