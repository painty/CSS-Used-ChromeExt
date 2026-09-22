// Lit le texte CSS directement depuis le CSSOM du navigateur.
// C'est exactement le CSS que le navigateur applique — y compris les règles
// injectées dynamiquement (insertRule, CSS-in-JS) — sans dépendre d'un
// re-téléchargement (fetch / devtools getResources), fragile depuis Chrome 152+.
// Retourne null quand la feuille n'est pas accessible (cross-origin) ou vide,
// pour laisser les fallbacks prendre le relais.

export function getCssRulesText(sheet: CSSStyleSheet): string | null {
    try {
        const rules = sheet.cssRules
        if (!rules || rules.length === 0) {
            return null
        }
        let text = ''
        for (let i = 0; i < rules.length; i++) {
            text += rules[i].cssText + '\n'
        }
        return text
    } catch {
        // SecurityError : feuille cross-origin inaccessible depuis ce contexte
        return null
    }
}

// Trouve, dans le document courant, la feuille dont le href correspond
// (en ignorant query string et fragment) et retourne son texte CSSOM
// si elle est accessible. Résout null sinon.
export function getByCSSOM(url: string): Promise<string | null> {
    return new Promise((resolve) => {
        try {
            const sheets = document.styleSheets
            const strip = (u: string) => (u || '').split('#')[0].split('?')[0]
            let matched: CSSStyleSheet | undefined
            for (let i = 0; i < sheets.length; i++) {
                const sheet = sheets[i]
                if (
                    sheet.href === url ||
                    (sheet.href && strip(sheet.href) === strip(url))
                ) {
                    matched = sheet
                    break
                }
            }
            resolve(matched ? getCssRulesText(matched) : null)
        } catch {
            resolve(null)
        }
    })
}
