export type cssObj = {
  normRule: string[];
  keyFram: string[];
  fontFace: string[];
};

const docOffline = document.implementation.createHTMLDocument("");

const cssHelper = {
  mergeobjCss: function (a: cssObj, b: cssObj) {
    ["normRule", "fontFace", "keyFram"].forEach(function (ele) {
      if (!a[ele] || !b[ele]) {
        // console.log('NO '+ele);
      }
      a[ele] = a[ele].concat(b[ele]);
    });
  },
  normRuleNodeToText: function (node) {
    var s = "";
    node.nodes.forEach(function (ele) {
      if (ele.prop && ele.value) {
        var before = ele.raws.before.replace(/[\s]*/, "");
        s +=
          before +
          ele.prop +
          ":" +
          ele.value +
          (ele.important ? "!important;" : ";");
      }
    });
    return s;
  },
  keyFramNodeToText: function (node) {
    var s = "@" + node.name + " " + node.params + "{";
    node.nodes.forEach(function (_node) {
      s += _node.selector + "{" + cssHelper.normRuleNodeToText(_node) + "}";
    });
    s += "}";
    return s;
  },
  fontFaceNodeToText: function (node) {
    var s = "@" + node.name + "{";
    s += cssHelper.normRuleNodeToText(node);
    s += "}";
    return s;
  },
  textToCss: function (styleContent: string) {
    const styleElement = document.createElement("style");
    styleElement.innerText = styleContent;
    // the style will only be parsed once it is added to a document
    docOffline.body.appendChild(styleElement);
    const resultCssRules = styleElement.sheet;
    docOffline.body.removeChild(styleElement);
    return resultCssRules;
  },
};

export {cssHelper}
