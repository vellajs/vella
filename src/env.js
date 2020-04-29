export let doc
export let win
export let nodeProto
export let tagCache

export function setWindow(w) {
	win = w
	nodeProto = win.Node.prototype
	doc = w.document
	tagCache = {}
}

if (typeof window != "undefined") setWindow(window)

export const isFF = win != null && typeof sidebar != "undefined"
// eslint-disable-next-line no-implicit-coercion
export const isChrome = win != null && !!win.chrome