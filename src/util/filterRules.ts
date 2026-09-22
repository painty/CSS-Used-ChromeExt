// this module is used to filter rules
// by testing the dom and its descendants one by one.
// each testing is wrapped by a settimeout timmer to make it async
// because the testing can be a long time if too many.

import debugMode from '../const/debugMode'
import { cssHelper } from './cssHelper'
import { collectShadowContexts } from './collectStyleSheets'

// may match accoding to interaction
const PseudoClass =
  'active|checked|disabled|empty|enabled|focus|hover|in-range|invalid|link|out-of-range|target|valid|visited|focus-within|focus-visible|fullscreen',
  PseudoElement =
    '((-(webkit|moz)-)?(scrollbar(-(button|thumb|corner|track(-piece)?))?))|-webkit-(details-marker|resizer)|after|before|first-letter|first-line|placeholder|selection|backdrop|marker|file-selector-button|details-content|view-transition(-[a-z]+)*',
  MaxPossiblePseudoLength = 30,
  REG0 = new RegExp(
    '^(:(' + PseudoClass + ')|::?(' + PseudoElement + '))+$',
    ''
  ),
  REG1 = new RegExp(
    '( |^)(:(' + PseudoClass + ')|::?(' + PseudoElement + '))+( |$)',
    'ig'
  ),
  REG2 = new RegExp(
    '\\((:(' + PseudoClass + ')|::?(' + PseudoElement + '))+\\)',
    'ig'
  ),
  REG3 = new RegExp(
    '(:(' + PseudoClass + ')|::?(' + PseudoElement + '))+',
    'ig'
  )

// propriétés héritées — les règles de base html/:root/body qui les
// déclarent s'appliquent à tout élément par héritage, même si leur
// sélecteur ne matche pas $0 (ex : html{color:var(--color-text);font-size:10px})
const InheritedPropReg =
  /^(font|font-family|font-size|font-weight|font-style|font-variant|font-feature-settings|line-height|letter-spacing|word-spacing|color|text-align|text-transform|text-indent|text-decoration-line|white-space|word-break|overflow-wrap|hyphens|tab-size|direction|visibility|color-scheme)$/

function filterRules($0: HTMLElement, objCss, taskTimerRecord) {
  var matched = []
  var keyFramUsed = []
  var fontFaceUsed = []
  // custom properties utilisées (déclarations --x et références var(--x))
  // pour filtrer les @property correspondants
  var customPropUsed = []
  // définitions de custom properties trouvées dans les règles NON retenues
  // (ex : :root{--x:...}) — incluses ensuite si utilisées (cas des sites
  // définissant toutes leurs variables sur :root/[data-mode], ex : space-toggle)
  var customPropDefs: { [prop: string]: any[] } = {}
  // règles de base (html/:root/body) portant des propriétés héritées
  // (typographie, couleur…) — incluses car elles s'appliquent à $0 par
  // héritage même si leur sélecteur ne le matche pas (ex :
  // html{color:var(--color-text);font-size:10px}, body,html{line-height:1.3})
  var baseRulesArr: any[] = []
  // déduplication des règles émises (feuilles dupliquées : critical CSS
  // inline + feuille externe, astuce media="print" + fallback)
  var emittedRuleTexts = new Set()

  const descendantsCount = $0.querySelectorAll('*').length
  // contextes shadow DOM atteignables depuis $0 :
  // racines au-dessus de $0 + racines de ses descendants (récursivement)
  const arrShadowCtx = collectShadowContexts($0)

  // P7 : traitement par lots — une seule promesse et un seul timer par
  // lot (au lieu d'un par règle), en rendant la main au thread UI entre
  // les lots. Les timers de lots sont enregistrés dans taskTimerRecord
  // pour rester annulables par content.ts.
  const rules = objCss.normRule
  const CHUNK_SIZE = 200

  return new Promise(function (resolve) {
    let idx = 0

    function processRule(rule, idx) {
      if (idx % 1000 === 0) {
        let nRule = rules.length
        chrome.runtime.sendMessage({
          action: 'inform',
          info: `The selected dom has ${descendantsCount} descendants.\nPage rules are about ${nRule}.\nTraversing the ${idx}th rule...`,
        })
      }

      if (typeof rule === 'string') {
        if (rule.length > 0) {
          matched.push(rule)
        }
        return
      } else {
        var selMatched = []
        var arrSel = rule.selectors.filter(function (v, i, self) {
          return self.indexOf(v) === i
        })
        arrSel.forEach(function (sel) {
          if (selMatched.indexOf(sel) !== -1) {
            return
          }
          // these pseudo class/elements can apply to any ele
          // but wont apply now
          // eg. :active{xxx}
          // only works when clicked on and actived
          if (sel.length < MaxPossiblePseudoLength && sel.match(REG0)) {
            selMatched.push(sel)
          } else if (sel.indexOf(':host') !== -1) {
            // :host / :host-context (shadow DOM — Angular
            // ViewEncapsulation.ShadowDom, web components) :
            // réécrire et tester contre les éléments hôtes
            const hostSel = sel
              // les arguments peuvent contenir des parenthèses imbriquées
              // (ex : :host(.is-desktop:not(.is-mobile))) ;
              // :host(X) → :scopeX (sélecteur composé, :scope n'est pas fonctionnel)
              .replace(
                /:host-context\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g,
                '$1 *'
              )
              .replace(
                /:host\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g,
                ':scope$1'
              )
              .replace(/:host/g, ':scope')
              .replace(
                /::slotted\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g,
                '$1'
              )
              .replace(/::part\([^()]*\)/g, '')
              .trim()
            if (hostSel !== '') {
              for (const ctx of arrShadowCtx) {
                try {
                  if (ctx.host.matches(hostSel)) {
                    selMatched.push(sel)
                    break
                  }
                } catch (e) {
                  // sélecteur toujours invalide : ignoré
                }
              }
            }
          } else {
            let errorArray = []
            let replacedSel = sel
              // pseudo-éléments modernes avec arguments (P4) :
              // ::slotted(X) → X (contenu slotté = light DOM de l'hôte),
              // ::part(...) / ::view-transition-*(...) → retirés
              .replace(
                /::slotted\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g,
                '$1'
              )
              .replace(
                /::(part|view-transition[a-z-]*)\([^()]*\)/g,
                ''
              )
              .replace(REG1, ' * ')
              .replace(REG2, '(*)')
              .replace(REG3, '')
              .replace(/:not\(\*\)/ig, '')
              .trim()

            if (replacedSel !== '') {
              try {
                let isMatched =
                  $0.matches(replacedSel) ||
                  $0.querySelectorAll(replacedSel).length !== 0
                if (!isMatched) {
                  // shadow DOM : tester aussi dans les shadow roots
                  // atteignables ($0.querySelectorAll ne les traverse pas)
                  for (const ctx of arrShadowCtx) {
                    if (ctx.root.querySelector(replacedSel) !== null) {
                      isMatched = true
                      break
                    }
                  }
                }
                if (isMatched) {
                  selMatched.push(sel)
                }
              } catch (e) {
                errorArray.push({
                  selector: replacedSel,
                  error: e,
                })
              }
              if (debugMode) {
                console.warn('selector match error: ', errorArray)
              }
            }
          }
        })
        if (selMatched.length !== 0) {
          // remove duplicate selector
          var cssText = selMatched
            .filter(function (v, i, self) {
              return self.indexOf(v) === i
            })
            .join(',')
          cssText += '{' + cssHelper.normRuleNodeToText(rule) + '}'
          if (!emittedRuleTexts.has(cssText)) {
            emittedRuleTexts.add(cssText)
            matched.push(cssText)
          }
          rule.nodes.forEach(function (ele) {
            if (
              ele.prop &&
              ele.prop.match(/^(-(webkit|moz)-)?animation(-name)?$/i) !==
              null
            ) {
              keyFramUsed = keyFramUsed.concat(
                ele.value.split(/ *, */).map(function (ele) {
                  return ele.split(' ')[0]
                })
              )
            }
          })

          // collecte des custom properties utilisées :
          // définitions (--x: ...) et références var(--x)
          rule.nodes.forEach(function (ele) {
            if (ele.prop && ele.prop.indexOf('--') === 0) {
              customPropUsed.push(ele.prop)
            }
            if (ele.value) {
              var arrVar =
                ele.value.match(/var\(\s*(--[^\s,)]+)/g) || []
              arrVar.forEach(function (v) {
                customPropUsed.push(v.replace(/^var\(\s*/, ''))
              })
            }
          })

          if (rule && rule.nodes) {
            for (let index = 0; index < rule.nodes.length; index++) {
              const declaration = rule.nodes[index]
              if (declaration && declaration.prop === 'font-family') {
                fontFaceUsed = [
                  ...fontFaceUsed,
                  ...declaration.value
                    .split(/ *, */)
                    .filter((e: string) => !!e),
                ]
              }
            }
          }
          return
        }
        // règle non retenue : retenir ses définitions de custom properties
        // pour inclusion différée si l'une d'elles est utilisée
        if (rule.nodes) {
          rule.nodes.forEach(function (ele) {
            if (ele.prop && ele.prop.indexOf('--') === 0) {
              if (!customPropDefs[ele.prop]) {
                customPropDefs[ele.prop] = []
              }
              customPropDefs[ele.prop].push(rule)
            }
          })
        }
        // règle de base (html/:root/body) avec propriétés héritées :
        // s'applique à $0 par héritage → à inclure
        if (
          rule.selectors &&
          rule.selectors.every(function (s) {
            var t = s.trim()
            // seulement l'élément de base lui-même (éventuellement avec
            // pseudo/attribut/classe), sans combinateur descendant —
            // les sélecteurs comme « body .o-footer a » passent par le
            // matching normal
            return /^(html|:root|body)([^\w-]|$)/.test(t) && !/\s/.test(t)
          }) &&
          rule.nodes &&
          rule.nodes.some(function (ele) {
            return ele.prop && InheritedPropReg.test(ele.prop)
          })
        ) {
          baseRulesArr.push(rule)
        }
      }
    }

    // keyframes / font-faces / @property effectivement utilisés
    function finalize() {
      keyFramUsed = keyFramUsed.filter(function (v, i, self) {
        return self.indexOf(v) === i
      })
      fontFaceUsed = fontFaceUsed.filter(function (v, i, self) {
        return self.indexOf(v) === i
      })
      var frameCommentMarkUsed = false
      keyFramUsed.forEach(function (ele) {
        objCss.keyFram.forEach(function (e) {
          if (ele === e.params) {
            if (!frameCommentMarkUsed) {
              matched.push('/*! CSS Used keyframes */')
              frameCommentMarkUsed = true
            }
            matched.push(cssHelper.keyFramNodeToText(e))
          }
        })
      })
      var fontCommentMarkUsed = false
      fontFaceUsed.forEach(function (ele) {
        objCss.fontFace.forEach(function (e) {
          e.nodes.forEach(function (n) {
            if (
              n.prop === 'font-family' &&
              ele.replace(/^(['"])?(.*)\1$/, '$2') ===
              n.value.replace(/^(['"])?(.*)\1$/, '$2')
            ) {
              if (!fontCommentMarkUsed) {
                matched.push('/*! CSS Used fontfaces */')
                fontCommentMarkUsed = true
              }
              matched.push(cssHelper.fontFaceNodeToText(e))
            }
          })
        })
      })
      // @property : inclus uniquement si la custom property
      // correspondante est utilisée par les règles retenues
      var propCommentMarkUsed = false
        ; (objCss.propRule || []).forEach(function (e) {
          var name = (e.params || '').replace(/^["']|["']$/g, '')
          if (customPropUsed.indexOf(name) !== -1) {
            if (!propCommentMarkUsed) {
              matched.push('/*! CSS Used @property */')
              propCommentMarkUsed = true
            }
            matched.push(cssHelper.fontFaceNodeToText(e))
          }
        })

      // styles de base hérités (html/:root/body) : émettre les déclarations
      // héritées et nourrir la fermeture des custom properties avec leurs
      // références var(--...) (ex : html{color:var(--color-text)})
      var baseCommentMarkUsed = false
      var emittedBase = new Set()
      baseRulesArr.forEach(function (baseRule) {
        var decls = ''
        baseRule.nodes.forEach(function (n) {
          if (n.prop && InheritedPropReg.test(n.prop)) {
            decls +=
              n.prop +
              ':' +
              n.value +
              (n.important ? '!important;' : ';')
            if (n.value) {
              var arrVar = n.value.match(/var\(\s*(--[^\s,)]+)/g) || []
              arrVar.forEach(function (v) {
                customPropUsed.push(v.replace(/^var\(\s*/, ''))
              })
            }
          }
        })
        if (decls !== '') {
          var baseSelText = baseRule.selectors
            .filter(function (v, i, self) {
              return self.indexOf(v) === i
            })
            .join(',')
          var baseText = baseSelText + '{' + decls + '}'
          if (!emittedBase.has(baseText)) {
            emittedBase.add(baseText)
            if (!baseCommentMarkUsed) {
              matched.push('/*! CSS Used base styles */')
              baseCommentMarkUsed = true
            }
            matched.push(baseText)
          }
        }
      })

      // custom properties utilisées : inclure leurs définitions même si
      // le sélecteur ne matche pas $0 (ex : :root{--x:...} — sites avec
      // space-toggle / thème par variables sur :root), avec fermeture
      // transitive des références var(--...) (ex : --light → var(--ON))
      var neededProps: { [prop: string]: boolean } = {}
      var frontier: string[] = customPropUsed.slice()
      customPropUsed.forEach(function (p) {
        neededProps[p] = true
      })
      while (frontier.length > 0) {
        var prop = frontier.pop()
        var defs = customPropDefs[prop] || []
        defs.forEach(function (defRule) {
          defRule.nodes.forEach(function (n) {
            // scanner toutes les déclarations de la règle (pas seulement
            // la définition de prop) : les déclarations normales conservées
            // à l'émission (ex : background:var(--x)) doivent aussi voir
            // leurs dépendances satisfaites
            if (n.value) {
              var arrVar = n.value.match(/var\(\s*(--[^\s,)]+)/g) || []
              arrVar.forEach(function (v) {
                var name = v.replace(/^var\(\s*/, '')
                if (!neededProps[name]) {
                  neededProps[name] = true
                  frontier.push(name)
                }
              })
            }
          })
        })
      }
      // regrouper par règle pour ne pas réémettre la même règle
      // une fois par propriété
      var defRules = new Map()
      Object.keys(neededProps).forEach(function (prop) {
        ; (customPropDefs[prop] || []).forEach(function (defRule) {
          if (!defRules.has(defRule)) {
            defRules.set(defRule, { rule: defRule, props: new Set() })
          }
          defRules.get(defRule).props.add(prop)
        })
      })
      var propDefCommentMarkUsed = false
      var emittedDefs = new Set()
      defRules.forEach(function (entry) {
        var decls = ''
        entry.rule.nodes.forEach(function (n) {
          if (n.prop) {
            var isCustom = n.prop.indexOf('--') === 0
            // propriétés custom : seulement celles utilisées ;
            // déclarations normales (ex : color-scheme) : conservées
            if (!isCustom || entry.props.has(n.prop)) {
              decls +=
                n.prop +
                ':' +
                n.value +
                (n.important ? '!important;' : ';')
            }
          }
        })
        if (decls !== '') {
          var selText = entry.rule.selectors
            .filter(function (v, i, self) {
              return self.indexOf(v) === i
            })
            .join(',')
          var defText = selText + '{' + decls + '}'
          if (!emittedDefs.has(defText)) {
            emittedDefs.add(defText)
            if (!propDefCommentMarkUsed) {
              matched.push('/*! CSS Used custom properties */')
              propDefCommentMarkUsed = true
            }
            matched.push(defText)
          }
        }
      })
    }

    function processChunk() {
      const end = Math.min(idx + CHUNK_SIZE, rules.length)
      for (; idx < end; idx++) {
        processRule(rules[idx], idx)
      }
      if (idx < rules.length) {
        // rend la main au thread UI entre les lots ; reste annulable
        // via taskTimerRecord (clearTimeout côté content.ts)
        const timer = setTimeout(processChunk, 0)
        taskTimerRecord.push(timer)
      } else {
        finalize()
        resolve(matched)
      }
    }

    processChunk()
  })
}

export default filterRules
