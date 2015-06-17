# CSS-Used-ChromeExt

Get all css rules used by the selected DOM and its children.

[CSS Used on Chrome Web Store](https://chrome.google.com/webstore/detail/css-used/cdopjfddjlonogibjahpnmjpoangjfff)

## Overview

Get all css rules used by the selected DOM and its children. Used to extrac only the used CSS. So the unused css will be left out.

If the selected DOM is the body, the result will be all the used css by the whole page curently.

## Usage

![How to use](http://ww3.sinaimg.cn/large/4e71f332gw1et7fclsja6g20ku0ime81.gif)
F12 open the Developer Tools, select the dom and active the "CSS Used" pannel. The used CSS rules of the Selected dom and its children's will be listed in the right textare.

You can click "Preview" to see the selected part with clean style rules.

## Known Limit

As for the CSS rule like `.wrap p{...}`, if only `<p>` is selected, the result `.wrap p{...}` may not apply directly to `<p>`.

Either changing this rule's selector to `p{...}` or giving the `<p>` a `.wrap` parent in the final HTML.

## To Do

When the selected dom is not in the main frame.