import convUrlToAbs from './convUrlToAbs'

function makeTagReg(tagName:string){
  return new RegExp('<'+tagName+'[\\s\\S]*?>[\\s\\S]*?<\/'+tagName+'>','gi')
}

export default function (dirty: string, doc: Document): string {
  return dirty
    .replace(makeTagReg('script'), '')
    .replace(makeTagReg('style'), '')
    .replace(/<link[\s\S]*?>/gi, '')
    .replace(/ on\w+=".*?"/gi, "")
    .replace(/(<img[^>]+src=(['"]))(.*?)(\2.*?>)/g, function () {
      var src = convUrlToAbs(doc.location.href, arguments[3])
      return arguments[1] + src + arguments[4]
    })
    .replace(/(<img[^>]+srcset=(['"]))(.*?)(\2.*?>)/g, function () {
      var srcset = arguments[3].split(/,\s*/)
      srcset.forEach(function (ele, index) {
        var src = ele.replace(/([^ ]*)(.*)/, function () {
          var _src = convUrlToAbs(doc.location.href, arguments[1])
          return _src + ' ' + arguments[2]
        })
        srcset[index] = src
      })
      return arguments[1] + srcset.join(',') + arguments[4]
    })
}
