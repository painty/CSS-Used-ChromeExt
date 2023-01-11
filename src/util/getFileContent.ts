import isutf8 from 'is-utf8';

const parser = (data: ArrayBuffer) => {
  var decoder: TextDecoder;
  if (isutf8(new Uint8Array(data))) {
    decoder = new TextDecoder('UTF-8');
  } else {
    decoder = new TextDecoder('gbk');
  }
  return decoder.decode(data);
};

const getByFetch = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    fetch(url, {
      method: 'GET',
      mode: 'no-cors',
    })
      .then((resonse) => resonse.arrayBuffer())
      .then((data) => {
        resolve(parser(data));
      })
      .catch((error) => reject(error));
  });
};

// const getByXHR = (url: string): Promise<string> => {
//   return new Promise((resolve, reject) => {
//     const xhr = new XMLHttpRequest();
//     xhr.responseType = "arraybuffer";
//     xhr.open("get", url);
//     xhr.onload = function () {
//       resolve(parser(xhr.response));
//       // console.log('this.status',this.status);
//       // if (
//       //   (this.status >= 200 && this.status < 300)
//       //   ||
//       //   url.match(/^file:\/\/\//) !== null
//       // ) {
//       //   resolve(parser(xhr.response));
//       // }
//     };
//     xhr.onerror = function () {
//       reject("xhr error");
//     };
//     xhr.send();
//   });
// };

export function getFileContent(url: string) {
  if (url.match(/^file:\/\/\//) !== null) {
    // return getByXHR(url);
    // console.log(location);
    // fetch(url).then(t=>t.text()).then(console.log)
    console.warn('CSS-Used: Cannot get content for file:// protocol', url);
    return Promise.resolve('');
  }
  return getByFetch(url);
}
