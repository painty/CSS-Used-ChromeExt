# CSS-Used

![CSS Used](http://ww1.sinaimg.cn/large/4e71f332gw1et7h243kgqj203k03ka9v.jpg)

Get all css rules used by the selected DOM and its descendants.

Get it at the Chrome Web Store : [CSS Used >>](https://chrome.google.com/webstore/detail/css-used/cdopjfddjlonogibjahpnmjpoangjfff)

## Overview

Get all css rules used by the selected DOM and its descendants. Used to extrac only the used CSS. So the unused css will be left out.

If the selected DOM is the body, the result will be all the used css by the whole page curently.

## Usage

![CSS-Used](https://user-images.githubusercontent.com/5387771/47267284-41b36a80-d574-11e8-9b83-c7896d428827.jpg)

F12 open the Developer Tools, select the dom and active the "CSS Used" panel. The used CSS rules of the Selected dom and its descendants will be listed.

You can click "Preview" to see the selected part with clean style rules.

## FAQ

1. No result

   1. Check whether it's Chrome Web Store pages, which is `https://chrome.google.com/webstore/....`, which won't allow content script injection.
   1. If it's a normal webpage, check site access permission https://github.com/painty/CSS-Used-ChromeExt/issues/13#issuecomment-687244215
   1. If it's a local file, chrome won't allow local file access by default. You can turn on the "Allow access to file URLs" in the extension management page.

1. Preview not right

    As for the CSS rule like `.wrap p{...}`, if only `<p>` is selected, the result `.wrap p{...}` may not apply directly to `<p>`.
    Either changing this rule's selector to `p{...}` or giving the `<p>` a `.wrap` parent in the final HTML.

1. Not all the CSS is got

    1. The result is generated based on the CURRENT HTML DOM. If a div doesn't exist in the document unless a specific user interaction, the result may miss out the style rules for the newly born div.
    1. CSS custom properties (variables) are partially supported. Not working for declarations defined by $0's ancestor. Thinking it as a inheritable CSS property, as this tool won't handle inherit style.

## Changelog

Go to the [Changelog page](CHANGELOG.md)
