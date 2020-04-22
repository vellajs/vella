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
