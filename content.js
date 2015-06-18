function getC($0) {

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

        styleElement.textContent = styleContent;
        // the style will only be parsed once it is added to a document
        doc.body.appendChild(styleElement);
        resultCssRules=styleElement.sheet;
        doc.body.removeChild(styleElement);
        return resultCssRules;
    }

    function convUrlToAbs(baseURI,url){
        var _baseURI=new URI(baseURI),
            _url=new URI(url);
        if(url.match(/^\//)){
            return _baseURI.protocol()+'://'+_baseURI.hostname()+url;
        };
        if(_url.is('relative')){
            return _baseURI.protocol()+'://'+_baseURI.hostname()+_baseURI.directory()+'/'+url;
        };
        if(_url.is('absolute')){
            return url;
        };
    }

    function getCssTxt(ele){
        var _ele, arr = [], arrCss=[], arrSel, arrSelMatched, domlist=[],
            rules, keyFram=[], keyFramUsed=[],
            baseURI,
            x, i, j, k;

        // collect all the selected element and its children
        domlist.push(ele);
        Array.prototype.forEach.call(ele.querySelectorAll('*'),function(e){
            domlist.push(e);
        });

        // check every css rule
        for (x = 0; x < document.styleSheets.length; x++) {
            baseURI=document.styleSheets[x].ownerNode.href || document.styleSheets[x].ownerNode.baseURI;
            rules = (document.styleSheets[x].ownerNode.ajaxRules && document.styleSheets[x].ownerNode.ajaxRules.cssRules) || document.styleSheets[x].cssRules;
            if (rules === null) {
                arrCss.push('/* rules null of stylesheet'+(x+1)+'/'+document.styleSheets.length+'*/\n');
                continue;
            };

            // annotion where the CSS rule from
            arrCss.push('\n/*stylesheet '+(x+1)+'/'+document.styleSheets.length +' | '+ (document.styleSheets[x].ownerNode.href ? document.styleSheets[x].ownerNode.href:'inline') +'*/\n');

            for (i = 0; i < rules.length; i++) {

                // CSSKeyframesRule
                if(rules[i].name){
                    keyFram.push(rules[i]);
                    continue;
                };

                if(!rules[i].selectorText) continue;

                arrSel=rules[i].selectorText.split(', ');
                arrSelMatched=[];
                for(j = 0, length2 = arrSel.length; j < length2; j++){
                    for(k = 0, length3 = domlist.length; k < length3; k++){
                        _ele=domlist[k];
                        if(arrSel[j].match(/^:(active|visited)$/)){
                            arrSelMatched.push(arrSel[j]);
                        }else {
                            try{
                                if ( _ele.matches(arrSel[j].replace(/::?(hover|after|before|active|link)/g, '')) ){
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
                                // .replace(/url\((.*?)\)/g,function(a,p1){
                                //     return 'url('+convUrlToAbs(baseURI,p1)+')';
                                // })
                                +'\n');
                    if(rules[i].style.animationName){
                        keyFramUsed.push(rules[i].style.animationName.split(', '));
                    };
                };
            }
        }

        // find used keyframe defination
        for (var i = 0; i < keyFram.length; i++) {
            for (j = 0; j < keyFramUsed.length; j++) {
                for (k = 0; k < keyFramUsed[j].length; k++) {
                    if(keyFram[i].name===keyFramUsed[j][k]){
                        arrCss.push(keyFram[i].cssText);
                    };
                };
            };
        };

        return arrCss;
    }

    // color  rgb→hex
    function handleCssTxt() {
        var arr = getCssTxt($0),
            obj = {},
            s = '';
        for (var x = 0; x < arr.length; x++) {
            obj[arr[x]] = true;
        };
        for (i in obj) {
            s += i;
        }
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