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
