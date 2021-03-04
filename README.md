# CSS-Used

![CSS Used](http://ww1.sinaimg.cn/large/4e71f332gw1et7h243kgqj203k03ka9v.jpg)

Get all css rules used by the selected DOM and its children.

Get it at the Chrome Web Store : [CSS Used >>](https://chrome.google.com/webstore/detail/css-used/cdopjfddjlonogibjahpnmjpoangjfff)

## Overview

Get all css rules used by the selected DOM and its children. Used to extrac only the used CSS. So the unused css will be left out.

If the selected DOM is the body, the result will be all the used css by the whole page curently.

## Usage

![CSS-Used](https://user-images.githubusercontent.com/5387771/47267284-41b36a80-d574-11e8-9b83-c7896d428827.jpg)

F12 open the Developer Tools, select the dom and active the "CSS Used" pannel. The used CSS rules of the Selected dom and its children's will be listed in the right textare.

You can click "Preview" to see the selected part with clean style rules.

## FAQ

1. Permission to read my browsing history

    See https://github.com/painty/CSS-Used-ChromeExt/wiki/Permission-to-read-my-browsing-history%3F

1. Local preview not right

    As for the CSS rule like `.wrap p{...}`, if only `<p>` is selected, the result `.wrap p{...}` may not apply directly to `<p>`.
    Either changing this rule's selector to `p{...}` or giving the `<p>` a `.wrap` parent in the final HTML.

1. Not all the CSS is got

    The result is generated based on the CURRENT HTML DOM. If a div doesn't exist in the document unless a specific user interaction, the result may miss out the style rules for the newly born div.
    
1. Always says to fresh the page

   First check whether it's Chrome Web Store pages, which is `https://chrome.google.com/webstore/....`, which won't allow content script injection. If it's a normal webpage , please create an issue.

## Changelog

Go to [releases](https://github.com/painty/CSS-Used-ChromeExt/releases)

For older version infomation:
Go to the [Changelog page](CHANGELOG.md)

## Dev

 1. `npm install` to install all the dependencies
 2. `npm run build` gernerate `/build/asset/js/content.js`. Drag the `build` folder to `chrome://extensions/`, remember to turn on the dev mode on the top right of the page.
 3. `npm test` will start a local `http://localhost:1234` server. Visiting the test page and check the console.
