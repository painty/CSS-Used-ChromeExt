function clean(s) {
  s = s.map(function (ele) {
    return ele.replace(/[\n\r]/g, ' ');
  });
  s = s.join('\n');
  // empty rules
  var reg1 = /^[^{}\n]*{\s*}/gm;
  // multiple empty lines
  var reg2 = /\n\n/g;
  // no import rule used
  var reg3 = /\/\*! @import.*\n\/\*! end @import \*\//g;

  while (s.match(reg1) !== null || s.match(reg2) !== null || s.match(reg3) !== null) {
    s = s.replace(reg1, '');
    s = s.replace(reg2, '\n');
    s = s.replace(reg3, '');
  }
  //trim heading white space
  s = s.replace(/^\s*/mg, '');
  return (s);
}

function fix(s) {

  s = clean(s);

  s = s.split(/\n+/);

  // remove the last comments line
  // which have no rules
  // endOfRuleLine:the end of the lastRule line number
  var endOfRuleLine = s.length;
  var fontFacePosition = s.indexOf('/*! CSS Used fontfaces */');
  var keyFramsPosition = s.indexOf('/*! CSS Used keyframes */');
  if (keyFramsPosition !== -1) {
    endOfRuleLine = keyFramsPosition;
  } else if (fontFacePosition !== -1) {
    endOfRuleLine = fontFacePosition;
  }
  while (s.length > 0 && s[endOfRuleLine - 1].match(/^\/\*! |^$/) !== null) {
    s.splice(endOfRuleLine - 1, 1);
    endOfRuleLine--;
  }
  var arr = [],
    regFrom = /^\/\*! CSS Used from: /;
  for (var i = 0; i < endOfRuleLine; i++) {
    if ((s[i].match(regFrom) !== null) && (i + 1 === endOfRuleLine || (s[i + 1].match(regFrom) !== null))) {
      continue;
    } else {
      arr.push(s[i]);
    }
  }
  // concat the latter fontface and keyframs part
  arr = arr.concat(s.slice(endOfRuleLine));

  return arr.join('\n').replace(/(['"']?)微软雅黑\1/, '"Microsoft Yahei"'); //.replace(/(['"']?)宋体\1/,' simsun ');
}

export default fix