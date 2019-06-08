const Bundler = require('parcel-bundler');
const Path = require('path');

const entryFiles = Path.join(__dirname, './index.js');

const options = {
  outDir: './test',
  outFile: 'index.build.js',
  scopeHoist: true, // Turn on experimental scope hoisting/tree shaking flag, for smaller production bundles
  hmrPort: 12345, // hmr socket port
};

(async function() {
  const bundler = new Bundler(entryFiles, options);

  const bundle = await bundler.bundle();
  const port=1234;
  bundler.serve(port); //.then(d=>console.log(bundle));
  // open in browser
  var urlToOpen = 'http://localhost:'+port+'/index.html';
  var start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
  require('child_process').exec(start + ' ' + urlToOpen);
})();