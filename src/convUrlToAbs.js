const URI = require('urijs');

function convUrlToAbs(baseURI, url) {
  var _baseURI = new URI(baseURI),
    _url = new URI(url);

  if (_url.is('absolute')) {
    return url
  } else {
    return _url.absoluteTo(baseURI).toString()
  }
}
module.exports = convUrlToAbs;