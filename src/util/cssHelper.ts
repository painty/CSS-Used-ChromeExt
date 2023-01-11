var helper = {
  mergeobjCss: function (a, b) {
    ['normRule', 'fontFace', 'keyFram'].forEach(function (ele) {
      if (!a[ele] || !b[ele]) {
        // console.log('NO '+ele);
      }
      a[ele] = a[ele].concat(b[ele])
    });
  },
  normRuleNodeToText: function (node) {
    var s = "";
    node.nodes.forEach(function (ele, idx) {
      if (ele.prop && ele.value) {
        var before = ele.raws.before.replace(/[\s]*/, '');
        s += (before + ele.prop + ':' + ele.value + (ele.important ? '!important;' : ';'));
      }
    });
    return s
  },
  keyFramNodeToText: function (node) {
    var s = '@' + node.name + ' ' + node.params + '{';
    node.nodes.forEach(function (_node) {
      s += (_node.selector + '{' + helper.normRuleNodeToText(_node) + '}')
    });
    s += '}';
    return s
  },
  fontFaceNodeToText: function (node) {
    var s = '@' + node.name + '{';
    s += helper.normRuleNodeToText(node);
    s += '}';
    return s
  },
  textToCss: function (styleContent) {
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
}

export default helper;