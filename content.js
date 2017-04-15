function getC($0) {
    // console.log('Now get');
    var domlist=[];
    domlist.push($0);
    Array.prototype.forEach.call($0.querySelectorAll('*'),function(e){
        domlist.push(e);
    });

    function convertLink(callback) {
        var links = document.querySelectorAll('link[rel="stylesheet"][href]:not([ajaxRulesByCssUsed])');
        var loadedExternalCss = 0;
        if (links.length === 0) {
            callback();
        } else {
            for (var i = 0; i < links.length; i++) {
                (function(i) {
                    var x = new XMLHttpRequest();
                    x.responseType = 'arraybuffer';
                    x.onreadystatechange = function() {
                        // var href,cssel;
                        if (x.readyState === 4) {
                            var decoder;
                            if (isutf8(new Uint8Array(x.response))) {
                                decoder = new TextDecoder('UTF-8');
                            } else {
                                decoder = new TextDecoder('gbk');
                            };
                            // href=links[i].href;
                            // links[i].removeAttribute('href');
                            // links[i].setAttribute('hrefbak', href);
                            // cssel=document.createElement('style');
                            // cssel.innerText=decoder.decode(x.response);
                            // links[i].parentNode.insertBefore(cssel, links[i].nextSibling);
                            // cssel.href=href;
                            links[i].ajaxRules = rulesForCssText(
                                                    decoder.decode(x.response)
                                                    .replace(/url\((.*?)\)/g,function(a,p1){
                                                        return 'url('+convUrlToAbs(links[i].href,p1)+')';
                                                    })
                                                 );
                            links[i].setAttribute('ajaxRulesByCssUsed','loaded');
                            loadedExternalCss++;
                            chrome.runtime.sendMessage({
                                cssloading:loadedExternalCss+'/'+links.length,
                            });
                            if (loadedExternalCss === links.length) {
                                callback();
                            }
                        }
                    }
                    x.open('GET', links[i].href, true);
                    x.send();
                })(i)
            };
        }
    }

    function rulesForCssText(styleContent) {
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

    function convUrlToAbs(baseURI,url){
        var quote=/^['"]*(.*?)['"]*$/;
        baseURI=baseURI.replace(quote,'$1');
        url=url.replace(quote,'$1');
        var _baseURI=new URI(baseURI),
            _url=new URI(url);
        if(url.match(/^\/\//)){
            return '"'+_baseURI.protocol()+':'+url+'"';
        };
        if(url.match(/^\//)){
            return '"'+_baseURI.protocol()+'://'+_baseURI.hostname()+url+'"';
        };
        if(_url.is('relative')){
            return '"'+_baseURI.protocol()+'://'+_baseURI.hostname()+_baseURI.directory()+'/'+url+'"';
        };
        if(_url.is('absolute')){
            return '"'+url+'"';
        };
    }

    // cssText won't show background-size
    // even it is in the css file
    // but -webkit-background-size do
    function chromeBugFix(rule){
        var bas=rule.style.backgroundSize;
        if(bas!=="initial" && bas!==""){
            return 'background-size:'+bas+';}';
        }else{
            return '}';
        }
    }

    function getCssTxt(rules,nowSheet){
        if(rules===null) return [];
        var _ele, arrCss=[], arrSel, arrSelMatched,
            rules, keyFram=[], keyFramUsed=[],font=[], fontUsed=[],
            // baseURI,
            childRules='',
            i, j, k;

        // may match accoding to interaction
        var pseudocls='active|checked|disabled|empty|enabled|focus|hover|in-range|invalid|link|out-of-range|target|valid|visited',
            pseudoele='after|before|first-letter|first-line|selection';
        // collect all the selected element and its children
        

        for (i = 0; i < rules.length; i++) {

            chrome.runtime.sendMessage({
                dom:domlist.length-1,
                rule:i,
                sheet:nowSheet
            });

            // CSSKeyframesRule
            if(rules[i].type===7){
                keyFram.push(rules[i]);
                continue;
            };

            // CSSFontFaceRule
            if(rules[i].type===5){
                font.push(rules[i]);
                continue;
            };

            // CSSMediaRule
            if(rules[i].type===4){
                childRules=getCssTxt(rules[i].cssRules,nowSheet);
                if(childRules.length>0){
                    arrCss.push('\n@media '+rules[i].conditionText+'{\n');
                    arrCss=arrCss.concat(childRules);
                    arrCss.push('}\n');
                }
                continue;
            };

            // CSSImportRule
            if(rules[i].type===3){
                if(rules[i].styleSheet&&rules[i].styleSheet.cssRules){
                    childRules=getCssTxt(rules[i].styleSheet.cssRules,nowSheet);
                    if(childRules.length>0){
                        arrCss=arrCss.concat(childRules);
                    }
                }
                continue;
            };

            if(!rules[i].selectorText) continue;
            // the normal "CSSStyleRule"

            arrSel=rules[i].selectorText.split(', ');
            arrSelMatched=[];
            for(j = 0, length2 = arrSel.length; j < length2; j++){
                for(k = 0, length3 = domlist.length; k < length3; k++){
                    _ele=domlist[k];

                    // these pseudo class/elements can apply to any ele
                    // but wont apply now 
                    // eg. :active{xxx}
                    // only works when clicked on and actived
                    if(arrSel[j].match(new RegExp('^:(('+pseudocls+')|(:?'+pseudoele+'))*$',''))){
                        arrSelMatched.push(arrSel[j]);
                    }else {
                        try{
                            if ( _ele.matches(arrSel[j].replace(new RegExp(':(('+pseudocls+')|(:?'+pseudoele+'))*','g'), '')) ){
                                arrSelMatched.push(arrSel[j]);
                            }
                        }catch(e){
                            // console.log(e);
                        }
                    }
                }
            }

            // remove duplicate selector
            arrSelMatched=arrSelMatched.filter(function(v,i,self){
                return self.indexOf(v)===i;
            });

            if(arrSelMatched.length>0){
                arrCss.push(rules[i].cssText
                            .replace(rules[i].selectorText, arrSelMatched.join(','))
                            .replace(/\}$/,function(){
                                return chromeBugFix(rules[i])
                            })
                            +'\n');
                if(rules[i].style.animationName){
                    keyFramUsed.push(rules[i].style.animationName.split(', '));
                };
                if(rules[i].style.fontFamily){
                    fontUsed.push(rules[i].style.fontFamily.split(', '));
                };
            };
        }

        // find used keyframe defination
        for (i = 0; i < keyFram.length; i++) {
            for (j = 0; j < keyFramUsed.length; j++) {
                for (k = 0; k < keyFramUsed[j].length; k++) {
                    if(keyFram[i].name===keyFramUsed[j][k]){
                        arrCss.push('\n'+keyFram[i].cssText+'\n');
                    };
                };
            };
        };

        // find used fontface defination
        for (i = 0; i < font.length; i++) {
            for (j = 0; j < fontUsed.length; j++) {
                for (k = 0; k < fontUsed[j].length; k++) {
                    if(font[i].style.fontFamily===fontUsed[j][k]){
                        arrCss.push('\n'+font[i].cssText+'\n');
                    };
                };
            };
        };
        return arrCss;
    }

    // color  rgb→hex
    function handleCssTxt() {
        var arr = [],arrtemp=[],
            // obj = {},
            s = '',
            x,i,rules;

        // check every css rule
        for (x = 0; x < document.styleSheets.length; x++) {
            // baseURI=document.styleSheets[x].ownerNode.href || document.styleSheets[x].ownerNode.baseURI;
            rules = (document.styleSheets[x].ownerNode.ajaxRules && document.styleSheets[x].ownerNode.ajaxRules.cssRules) || document.styleSheets[x].cssRules;
            if (rules === null) {
                arr.push('/* rules null of stylesheet'+(x+1)+'/'+document.styleSheets.length+'*/\n');
                continue;
            };

            arrtemp=getCssTxt(rules,x+'/'+document.styleSheets.length);
            if(arrtemp.length>0){
                // annotion where the CSS rule from
                arr.push('\n/*stylesheet '+(x+1)+'/'+document.styleSheets.length +' | '+ (document.styleSheets[x].ownerNode.href ? document.styleSheets[x].ownerNode.href:'inline') +'*/\n');
                arr=arr.concat(arrtemp);
            }
        };

        /*
        //remove duplicate rules,not necessary
        for (x = 0; x < arr.length; x++) {
            obj[arr[x]] = true;
        };
        for (i in obj) {
            s += i;
        }
        */
        s=arr.join('');
        s = s.replace(/ rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)/g, function(a, p1, p2, p3) {
            function to2w(n){
                var s=(n * 1).toString(16);
                if(n<16){
                    return '0'+s;
                }
                return s;
            }
            return ' #' + ( to2w(p1) + to2w(p2) + to2w(p3) ).replace(/((.)\2)((.)\4)((.)\6)/,'$2$4$6');
        }).replace(/(['"']?)微软雅黑\1/,'"Microsoft Yahei"')
        .replace(/(['"']?)宋体\1/,' simsun ');
        chrome.runtime.sendMessage({
            css: s,
            html: $0.outerHTML.replace(/<script>[\s\S]*?<\/script>/g,'')
        });
    }

    convertLink(handleCssTxt);
}