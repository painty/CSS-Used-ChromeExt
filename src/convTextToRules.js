const postcss = require('postcss');
const safe = require('postcss-safe-parser');

function convTextToRules(styleContent, href) {
  return new Promise((resolve, reject) => {
    postcss().process(styleContent, {
      from: undefined,
      parser: safe
    }).then(result => {
      if (href) {
        result.root.nodes.href = href;
      };
      resolve(result.root.nodes);
    });
  });
}

module.exports = convTextToRules;