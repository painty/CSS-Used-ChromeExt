# CSS-Used-ChromeExt
Get all css rules used by the selected DOM and its children.

## Overview
Get all css rules used by the selected DOM and its children. Used to extrac only the used CSS. So the unused css will be left out.

If the selected DOM is the body, the result will be all the used css by the whole page curently.

## Known Limit
for the CSS rule like ".wrap p{...}" and if only p is selected, the result ".wrap p{...}" may not apply directly to p. Either edit the filtered result to "p{...}" or give the "p" a ".wrap " parent in the final HTML.
