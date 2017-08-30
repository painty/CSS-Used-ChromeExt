// chrome.runtime.sendMessage=function(){};
var debugMode=false;
var globalCount = 0;
var externalCssCache = {};
var toList=[]; //store testDomMatch timers
var doc=document;

// may match accoding to interaction
var pseudocls = '((-(webkit|moz|ms|o)-)?(full-screen|fullscreen))|-o-prefocus|active|checked|disabled|empty|enabled|focus|hover|in-range|invalid|link|out-of-range|target|valid|visited',
    pseudoele = '((-(webkit|moz|ms|o)-)?(focus-inner|input-placeholder|placeholder|selection))|-ms-clear|-ms-reveal|-ms-expand|-moz-focusring|after|before|first-letter|first-line';

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
        // if href==='' , ele.getAttribute('href') !== ele.href
        if(ele.getAttribute('href') && (externalCssCache[ele.href] === undefined) ){
            links.push(ele.href);
        }
    });
    convLinkToText(links).then(function(result) {
        var promises=[];
        for (var i = 0; i < result.length; i++) {
            let ele=result[i], idx=i;
            promises.push(convTextToRules(ele.cssraw,links[idx]));
        }
        return Promise.all(promises);
    }).catch(function(err) {
        chrome.runtime.sendMessage({
            err: JSON.stringify(err)
        });
    }).then(function(result){
        result.forEach(function(ele){
            externalCssCache[ele.href] = ele;
        });
    })
    .then(generateRulesAll)
    .then(function(objCss){ // {fontFace : Array, keyFram : Array, normRule : Array}
        debugMode&&console.log(objCss,externalCssCache);
        return testDomMatch($0,objCss,globalCount);
    }).then(function(data){
        return cleanCSS(data)
    }).then(function(data){
        chrome.runtime.sendMessage({
            css: postFixCss(data),
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
                        var arrSel=rule.selectors.filter(function(v, i, self) {
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
                                let count=[];
                                let replacedSel=sel.replace(new RegExp('( |^)(:(' + pseudocls + ')|::?(' + pseudoele + '))+( |$)', 'ig'), ' * ');
                                replacedSel=replacedSel.replace(new RegExp('\\((:(' + pseudocls + ')|::?(' + pseudoele + '))+\\)', 'ig'), '(*)');
                                replacedSel=replacedSel.replace(new RegExp('(:(' + pseudocls + ')|::?(' + pseudoele + '))+', 'ig'), '');
                                try{
                                    if($0.matches(sel)||$0.querySelectorAll(sel).length!==0){
                                        selMatched.push(sel);
                                    }
                                }catch(e){
                                    count.push(sel);
                                    count.push(e);
                                }
                                try{
                                    if($0.matches(replacedSel)||$0.querySelectorAll(replacedSel).length!==0){
                                        selMatched.push(sel);
                                    }
                                }catch(e){
                                    count.push(replacedSel);
                                    count.push(e);
                                }
                                if(count.length===4&&debugMode){
                                    if(count[2]===count[0]){
                                        count=count.slice(0,2);
                                    }
                                    console.log(count);
                                }
                            }
                        });
                        if(selMatched.length!==0){
                            var cssText=selMatched.filter(function(v, i, self) {
                                return self.indexOf(v) === i;
                            }).join(',');
                            cssText+=('{'+helper.normRuleNodeToText(rule)+'}');
                            res(cssText);
                            rule.nodes.forEach(function(ele,idx){
                                if (ele.prop&&ele.prop.match(/^(-(webkit|moz|ms|o)-)?animation(-name)?$/i)!==null) {
                                    keyFramUsed=keyFramUsed.concat(ele.value.split(/ *, */).map(function(ele) {
                                        return ele.split(' ')[0];
                                    }));
                                };
                            });
                            fontfamilyOfRule=helper.textToCss(cssText);
                            if(fontfamilyOfRule.cssRules[0]&&fontfamilyOfRule.cssRules[0].style.fontFamily){
                                fontFaceUsed=fontFaceUsed.concat(fontfamilyOfRule.cssRules[0].style.fontFamily.split(', '));
                            }
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
                // typeof ele:string
                if(ele.length>0){
                    matched.push(ele);
                }
            });
            var frameCommentMarkUsed=false;
            keyFramUsed.forEach(function(ele){
                objCss.keyFram.forEach(function(e){
                    if(ele===e.params){
                        if(!frameCommentMarkUsed){
                            matched.push('/*! CSS Used keyframes */');
                            frameCommentMarkUsed=true;
                        }
                        matched.push(helper.keyFramNodeToText(e));
                    }
                })
            });
            var fontCommentMarkUsed=false;
            fontFaceUsed.forEach(function(ele){
                objCss.fontFace.forEach(function(e){
                    e.nodes.forEach(function(n){
                        if(n.prop==='font-family' && ele.replace(/^(['"])?(.*)\1$/,'$2')===n.value.replace(/^(['"])?(.*)\1$/,'$2')){
                            if(!fontCommentMarkUsed){
                                matched.push('/*! CSS Used fontfaces */');
                                fontCommentMarkUsed=true;
                            }
                            matched.push(helper.fontFaceNodeToText(e));
                        }
                    })
                    
                })
            });
            resolve(matched);
        }).catch(function(err) {
            reject(err);
        });
    });
}

function generateRulesAll(){
    var x;

    var objCss={
        normRule:[],
        fontFace:[],
        keyFram:[]
    }

    var promises = [];

    return new Promise(function (resolve, reject) {
        // loop every styleSheets
        for (x = 0; x < doc.styleSheets.length; x++) {
            promises.push(new Promise(function (res, rej){
                var cssHref=doc.styleSheets[x].ownerNode.href;
                var cssNodeArr;
                if(cssHref){
                    cssNodeArr=externalCssCache[cssHref];
                    traversalCSSRuleList(cssNodeArr).then(function(obj){
                        res(obj);
                    })
                }else{
                    // style tag
                    // convert urls in style tag to abs
                    let html=doc.styleSheets[x].ownerNode.innerHTML.replace(/url\((['"]?)(.*?)\1\)/g, function(a, p1,p2) {
                        return 'url(' + convUrlToAbs(doc.location.href, p2) + ')';
                    });
                    convTextToRules(html,doc.location.href).then(function(cssNodeArr){
                        traversalCSSRuleList(cssNodeArr).then(function(obj){
                            res(obj);
                        })
                    })
                }
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

function traversalCSSRuleList(cssNodeArr){
    var promises = [];

    var objCss={
        normRule:[],
        keyFram:[],
        fontFace:[]
    };

    return new Promise(function (resolve, reject) {
        if(cssNodeArr===undefined||cssNodeArr.length===0){
            resolve(objCss);
        }else if(cssNodeArr.length>0){ // annotion where the CSS rule from
            if(cssNodeArr.href===doc.location.href){
                objCss.normRule.push('/*! CSS Used from: Embedded */');
            }else if(cssNodeArr.href&&!cssNodeArr.parentHref){
                objCss.normRule.push('/*! CSS Used from: '+cssNodeArr.href+' */');
            }
        }

        for (var i = 0; i < cssNodeArr.length; i++) {
            (function(CSSRuleListItem,i){
                promises.push(new Promise(function (res, rej){

                    var _objCss={
                        normRule:[],
                        keyFram:[],
                        fontFace:[]
                    };
                    if (CSSRuleListItem.type === 'atrule' && CSSRuleListItem.name.match(/^(-(webkit|moz|ms|o)-)?keyframes$/)) { // CSSKeyframesRule
                        _objCss.keyFram.push(CSSRuleListItem);
                        res(_objCss);
                    }else if (CSSRuleListItem.type === 'atrule' && CSSRuleListItem.name==='font-face') { // CSSFontFaceRule
                        _objCss.fontFace.push(CSSRuleListItem);
                        res(_objCss);
                    }else if (CSSRuleListItem.type === 'atrule' && CSSRuleListItem.name==="media") { // CSSMediaRule
                        traversalCSSRuleList(CSSRuleListItem.nodes).then(function(obj){
                            _objCss.normRule.push('\n@media ' + CSSRuleListItem.params + '{');
                            helper.mergeobjCss(_objCss, obj );
                            _objCss.normRule.push('}');
                            res(_objCss);
                        });
                    }else if (CSSRuleListItem.type === "atrule" && CSSRuleListItem.name==="import") { // CSSImportRule
                        let isValidImport=true;
                        for (let j = 0; j < i; j++) {
                            let rule=cssNodeArr[j];
                            if((rule.type==='rule')||(rule.type==='atrule'&&rule.name.match(/^charset|import$/)===null)){
                                isValidImport=false;
                                break;
                            }
                        }
                        let href=CSSRuleListItem.params.match(/^(url\((['"]?)(.*?)\2\)|(['"])(.*?)\4)/);
                        href=href[3]||href[5]||'';
                        href=convUrlToAbs(cssNodeArr.href,href);
                        if(isValidImport&&href&&href!==cssNodeArr.parentHref){
                            new Promise((resolve, reject) => {
                                if(externalCssCache[href] !== undefined ){
                                    resolve(externalCssCache[href]);
                                }else{
                                    convLinkToText([href]).then(function(result){
                                        var res=result[0];
                                        return convTextToRules(result[0].cssraw)
                                    }).then(function(nodeArr){
                                        nodeArr.href=href;
                                        nodeArr.parentHref=cssNodeArr.href;
                                        externalCssCache[href] = nodeArr;
                                        resolve(nodeArr);
                                    });
                                }
                            }).then(traversalCSSRuleList)
                            .then(function(obj){
                                if(obj.normRule.length>0){
                                    _objCss.normRule.push('/*! @import ' + href + ' */');
                                    helper.mergeobjCss(_objCss, obj );
                                    _objCss.normRule.push('/*! end @import */');
                                }else{
                                    helper.mergeobjCss(_objCss, obj );
                                }
                                res(_objCss);
                            });
                        }else{
                            res(_objCss);
                        }
                    }else if (CSSRuleListItem.type === "rule" && CSSRuleListItem.selector!=='') { // the normal "CSSStyleRule"
                        _objCss.normRule.push(CSSRuleListItem);
                        res(_objCss);
                    }else{
                        res(_objCss);
                    };
                }));
            })(cssNodeArr[i],i)
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

var helper={
    mergeobjCss:function(a,b){
        ['normRule','fontFace','keyFram'].forEach(function(ele){
            if(!a[ele]||!b[ele]){
                // console.log('NO '+ele);
            }
            a[ele]=a[ele].concat(b[ele])
        });
    },
    normRuleNodeToText:function(node){
        var s="";
        node.nodes.forEach(function(ele,idx){
            if(ele.prop&&ele.value){
                var before=ele.raws.before.replace(/[\s]*/,'');
                s+=(before+ele.prop+':'+ele.value+(ele.important?'!important;':';'));
            }
        });
        return s
    },
    keyFramNodeToText:function(node){
        var s='@'+node.name+' '+node.params+'{';
        node.nodes.forEach(function(_node){
            s+=(_node.selector+'{'+helper.normRuleNodeToText(_node)+'}')
        });
        s+='}';
        return s
    },
    fontFaceNodeToText:function(node){
        var s='@'+node.name+'{';
        s+=helper.normRuleNodeToText(node);
        s+='}';
        return s
    },
    textToCss: function(styleContent) {
        var doc = document,//.implementation.createHTMLDocument(""),
            styleElement = document.createElement("style"),
            resultCssRules;
        styleElement.innerText = styleContent;
        // the style will only be parsed once it is added to a document
        doc.body.appendChild(styleElement);
        resultCssRules=styleElement.sheet;
        doc.body.removeChild(styleElement);
        return resultCssRules;
    }
}

function cleanCSS(s){
    s=s.join('\n');
    return new Promise((resolve, reject) => {
        while(s.match(/[^{}\n\r]*{\s*}/)!==null){
            s=s.replace(/[^{}\n\r]*{\s*}/g,'')
        }
        resolve(s);
    });
}

function postFixCss(s){
    s=s.split(/\n+/);

    // remove the last comments line
    // which have no rules
    // endOfRuleLine:the end of the lastRule line number
    var endOfRuleLine=s.length;
    var fontFacePosition=s.indexOf('/*! CSS Used fontfaces */');
    var keyFramsPosition=s.indexOf('/*! CSS Used keyframes */');
    if(keyFramsPosition!==-1){
        endOfRuleLine=keyFramsPosition;
    }else if(fontFacePosition!==-1){
        endOfRuleLine=fontFacePosition;
    }
    while(s.length>0&&s[endOfRuleLine-1].match(/^\/\*\! |^$/)!==null){
        s.splice(endOfRuleLine-1,1);
        endOfRuleLine--;
    }
    var arr=[],regFrom=/^\/\*\! CSS Used from: /;
    for (var i = 0; i < endOfRuleLine; i++) {
        if( (s[i].match(regFrom)!==null) && ( i+1===endOfRuleLine || ( s[i+1].match(regFrom)!==null ) )){
            continue;
        }else{
            arr.push(s[i]);
        }
    }
    // concat the latter fontface and keyframs part
    arr=arr.concat(s.slice(endOfRuleLine));

    return arr.join('\n').replace(/(['"']?)微软雅黑\1/,'"Microsoft Yahei"'); //.replace(/(['"']?)宋体\1/,' simsun ');
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
            if ( (this.status >= 200 && this.status < 300 )|| (url.match(/^file:\/\/\//)!==null)) {
                var decoder;
                if (isutf8(new Uint8Array(xhr.response))) {
                    decoder = new TextDecoder('UTF-8');
                } else {
                    decoder = new TextDecoder('gbk');
                };
                result.cssraw = decoder.decode(xhr.response)
                    .replace(/url\((['"]?)(.*?)\1\)/g, function(a, p1,p2) {
                        return 'url(' + convUrlToAbs(url, p2) + ')';
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
        xhr.onerror = function(e) {
            console.log('Fail to get: '+url);
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
            resolve([]);
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
    return new Promise((resolve, reject) => {
        bobfypostcss().process(styleContent,{parser:bobfysafe}).then(result=>{
            if(href){
                result.root.nodes.href=href;
            };
            resolve(result.root.nodes);
        });
    });
}

function convUrlToAbs(baseURI, url) {
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
