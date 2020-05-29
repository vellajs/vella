declare var sidebar: unknown

export {doc, nodeProto, tagCache, win, setWindow}
export {isFF, isChrome}

type SelectorCache = {
	[x: string]: {delay: number, el: Element|null}
}

let doc: Document
let win: Window
let nodeProto: typeof Node.prototype
let tagCache: {
	"": SelectorCache,
	"http://www.w3.org/2000/svg": SelectorCache,
	"http://www.w3.org/1998/Math/MathML": SelectorCache
}

export type NameSpace = keyof typeof tagCache

function setWindow(w: Window & typeof globalThis) {
	doc = w.document
	nodeProto = w.Node.prototype
	tagCache = {"": {}, "http://www.w3.org/2000/svg": {}, "http://www.w3.org/1998/Math/MathML": {}}
	win = w
}

/* c8 ignore next 3*/
if (typeof window != "undefined") setWindow(window)
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const isFF = win! != null && typeof sidebar != "undefined"
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion
const isChrome = win! != null && !!(win as any).chrome