import expected from './expected.js'
import getCssUsed from '../src/main.js'

window.chrome = {
  runtime: {
    sendMessage: function (obj) {
      if(obj.css){
        if(obj.css===expected(location.port)){
          console.log('Test Passed.');
        }else{
          console.log('Test fail.')
          console.dir({
            expect:expected(location.port),
            acture:obj.css
          })
        }
      }
    }
  }
}
getCssUsed(document.documentElement);

let wSocket = new WebSocket('ws://' + 'localhost' + ':' + '12345' + '');

wSocket.onopen = function() {
  // console.log("Primary Socket Connected.");
};

wSocket.onmessage = function(evt) {
  // console.log(evt);
  location.reload();
}

wSocket.onclose = function() {
  console.log("Primary Socket Closed.");
  wSocket = null;
};

wSocket.onerror = function(evt) {
  console.error(evt);
}