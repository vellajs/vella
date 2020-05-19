export {doc, nodeProto, tagCache, win, setWindow}
export {isFF, isChrome}

let doc
let win
let nodeProto
let tagCache

function setWindow(w) {
	doc = w.document
	nodeProto = w.Node.prototype
	tagCache = {"": {}, "http://www.w3.org/2000/svg": {}, "http://www.w3.org/1998/Math/MathML": {}}
	win = w
}

/* c8 ignore next 3*/
if (typeof window != "undefined") setWindow(window)
const isFF = win != null && typeof sidebar != "undefined"
const isChrome = win != null && !!win.chrome