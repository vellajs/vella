export let doc
export let win
export let nodeProto
export let tagCache

export function setWindow(w) {
	doc = w.document
	nodeProto = w.Node.prototype
	tagCache = {"": {}, "http://www.w3.org/2000/svg": {}, "http://www.w3.org/1998/Math/MathML": {}}
	win = w
}

if (typeof window != "undefined") setWindow(window)

export const isFF = win != null && typeof sidebar != "undefined"
export const isChrome = win != null && !!win.chrome