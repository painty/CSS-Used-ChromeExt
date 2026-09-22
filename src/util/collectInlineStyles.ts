import { collectShadowContexts } from './collectStyleSheets'

// Sélecteur indicatif pour un élément : #id si présent, sinon tag.classes
function selectorFor(el: Element): string {
    if (el.id) {
        return '#' + el.id
    }
    let sel = el.tagName.toLowerCase()
    for (let i = 0; i < el.classList.length && i < 2; i++) {
        sel += '.' + el.classList[i]
    }
    return sel
}

// P5 : collecte les styles inline (attribut style="...") de l'élément et
// de ses descendants — light DOM et shadow roots atteignables — sous
// forme de règles CSS. Massivement utilisé par Angular ([style.x],
// style bindings) et le CSS-in-JS.
export function collectInlineStyles(ele: Element): string[] {
    const result: string[] = []
    const seen = new Set<Element>()
    const push = (el: Element) => {
        if (seen.has(el)) {
            return
        }
        seen.add(el)
        const style = (el as HTMLElement).style
        if (style && style.length > 0) {
            const cssText = style.cssText.replace(/\s+/g, ' ').trim()
            if (cssText !== '') {
                result.push(selectorFor(el) + '{' + cssText + '}')
            }
        }
    }
    push(ele)
    const all = ele.querySelectorAll('*')
    for (let i = 0; i < all.length; i++) {
        push(all[i])
    }
    // shadow roots atteignables (contenu interne des composants)
    for (const ctx of collectShadowContexts(ele)) {
        push(ctx.host)
        const shadowAll = ctx.root.querySelectorAll('*')
        for (let i = 0; i < shadowAll.length; i++) {
            push(shadowAll[i])
        }
    }
    return result
}

export default collectInlineStyles
