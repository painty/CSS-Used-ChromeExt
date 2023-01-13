import './app.css'
import './panel.css'
import Panel from './Panel.svelte'

const app = new Panel({
  target: document.getElementById('app'),
})

export default app
