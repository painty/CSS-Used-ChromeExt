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

## Known Limit

1. As for the CSS rule like `.wrap p{...}`, if only `<p>` is selected, the result `.wrap p{...}` may not apply directly to `<p>`.

    Either changing this rule's selector to `p{...}` or giving the `<p>` a `.wrap` parent in the final HTML.
1. The result is generated based on the CURRENT HTML DOM. If a div doesn't exist in the document unless a specific user interaction, the result may miss out the style rules for the newly born div.

1. Won't work on Chrome Web Store pages, which is `https://chrome.google.com/webstore/....`

## Changelog

Go to the [Changelog page](CHANGELOG.md)

## To Do

 --
