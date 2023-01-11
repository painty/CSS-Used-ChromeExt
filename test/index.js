import expected from './expected.js'
import getCssUsed from '../src/main.ts'

window.chrome = {
  runtime: {
    sendMessage: function (obj) {
      console.log('sendMessage: ',obj);
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
