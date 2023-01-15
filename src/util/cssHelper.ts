export type cssObj = {
  normRule: string[]
  keyFram: string[]
  fontFace: string[]
}

import convTextToRules from './convTextToRules'

const cssHelper = {
  mergeobjCss: function (a: cssObj, b: cssObj) {
    ['normRule', 'fontFace', 'keyFram'].forEach(function (ele) {
      if (!a[ele] || !b[ele]) {
        // console.log('NO '+ele);
      }
      a[ele] = a[ele].concat(b[ele]).filter(e=>e)
    })
  },
  normRuleNodeToText: function (node) {
    var s = ''
    node.nodes.forEach(function (ele) {
      if (ele.prop && ele.value) {
        var before = ele.raws.before.replace(/[\s]*/, '')
        s +=
          before +
          ele.prop +
          ':' +
          ele.value +
          (ele.important ? '!important;' : ';')
      }
    })
    return s
  },
  keyFramNodeToText: function (node) {
    var s = '@' + node.name + ' ' + node.params + '{'
    node.nodes.forEach(function (_node) {
      s += _node.selector + '{' + cssHelper.normRuleNodeToText(_node) + '}'
    })
    s += '}'
    return s
  },
  fontFaceNodeToText: function (node) {
    var s = '@' + node.name + '{'
    s += cssHelper.normRuleNodeToText(node)
    s += '}'
    return s
  },
  textToCss: async function (styleContent: string) {
    const parsedCss = await convTextToRules(styleContent)
    return parsedCss
  },
}

export { cssHelper }
