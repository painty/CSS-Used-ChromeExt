import postcss from 'postcss'
import safe from 'postcss-safe-parser'

async function convTextToRules(styleContent: string, href?: string) {
  const processor = postcss()
  // console.log('processor',processor);
  const result = await processor.process(styleContent, {
    from: href || 'cssFromUnknown',
    parser: safe,
  })
  type cssNodeObj = {
    nodes: typeof result.root.nodes
    href?: string
    parentHref?: string
    media?: MediaList
  }
  const returnObj: cssNodeObj = {
    nodes: result.root.nodes,
    href,
  }
  return returnObj
}

export default convTextToRules
