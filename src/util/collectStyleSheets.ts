// Collecte toutes les feuilles CSS atteignables depuis un document et,
// optionnellement, depuis un élément sélectionné :
// - doc.styleSheets et doc.adoptedStyleSheets
// - les shadow roots hébergeant l'élément (chaîne des racines, vers le haut)
// - les shadow roots du document et de leurs descendants (récursivement)
// Les feuilles cross-origin sont aussi retournées : c'est l'accès à cssRules
// qui échouera et déclenchera les fallbacks (fetch / devtools getResources).

export interface shadowContext {
    root: ShadowRoot
    host: Element
}

function pushRootSheets(
    root: Document | ShadowRoot,
    seen: Set<CSSStyleSheet>,
    sheets: CSSStyleSheet[]
) {
    for (let i = 0; i < root.styleSheets.length; i++) {
        const sheet = root.styleSheets[i]
        if (!seen.has(sheet)) {
            seen.add(sheet)
            sheets.push(sheet)
        }
    }
    const adopted = root.adoptedStyleSheets
    if (adopted) {
        for (const sheet of adopted) {
            if (!seen.has(sheet)) {
                seen.add(sheet)
                sheets.push(sheet)
            }
        }
    }
}

export function collectStyleSheets(
    doc: Document,
    ele?: Element
): CSSStyleSheet[] {
    const sheets: CSSStyleSheet[] = []
    const seen = new Set<CSSStyleSheet>()
    pushRootSheets(doc, seen, sheets)
    if (ele) {
        // shadow roots au-dessus de l'élément : elles ne sont pas couvertes
        // par le parcours du document (ViewEncapsulation.ShadowDom, etc.)
        let root: Node = ele.getRootNode()
        while (root instanceof ShadowRoot) {
            pushRootSheets(root, seen, sheets)
            root = root.host.getRootNode()
        }
    }
    // shadow roots du document, récursivement (nested shadow DOM)
    const walk = (root: Document | ShadowRoot) => {
        const all = root.querySelectorAll('*')
        for (let i = 0; i < all.length; i++) {
            const el = all[i]
            if (el.shadowRoot) {
                pushRootSheets(el.shadowRoot, seen, sheets)
                walk(el.shadowRoot)
            }
        }
    }
    walk(doc)
    return sheets
}

// Contextes shadow DOM pertinents pour le filtrage des sélecteurs :
// shadow roots de l'élément (chaîne vers le haut) et de ses descendants
// (récursivement). Sert à tester les sélecteurs dans chaque racine et
// les sélecteurs :host / :host-context contre les éléments hôtes.
export function collectShadowContexts(ele: Element): shadowContext[] {
    const contexts: shadowContext[] = []
    const seen = new Set<ShadowRoot>()
    const push = (root: ShadowRoot) => {
        if (!seen.has(root)) {
            seen.add(root)
            contexts.push({ root, host: root.host })
        }
    }
    // chaîne des racines au-dessus de l'élément
    let root: Node = ele.getRootNode()
    while (root instanceof ShadowRoot) {
        push(root)
        root = root.host.getRootNode()
    }
    // l'élément lui-même, puis ses descendants (light DOM), récursivement
    const walk = (el: Element) => {
        const shadowRoot = el.shadowRoot
        if (shadowRoot) {
            push(shadowRoot)
            const all = shadowRoot.querySelectorAll('*')
            for (let i = 0; i < all.length; i++) {
                walk(all[i])
            }
        }
    }
    walk(ele)
    const all = ele.querySelectorAll('*')
    for (let i = 0; i < all.length; i++) {
        walk(all[i])
    }
    return contexts
}
