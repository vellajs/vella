import {componentEarmark} from "./constants.js"
import {getErrorMessage} from "./errors.js"
import {doc, win} from "./env.js"
import {postpone} from "./hooks.js"
import {S} from "./S.js"
import {absorb, hasOwn, skippable} from "./util.js"
// public API
export {
	forEachNode, toList,
	boot,
	beforeRemove,
	onRender, onReflow,
}
// private exports
export {
	emit, emitWithNodeRange, remove,
	globalDOM, globalRange, globalZone, DOMRef, NodeRange,
	setRange, withRangeForInsertion, withRef,

	withoutRange
}


// stack-managed state
// currently as decorators (training wheels)
// once the patterns are established, bugs are
// ironed out of the core and I'm confident with
// the tests, they'll be inlined

let globalZone
let globalDOM
let globalRange
let globalFirstInserted
let globalLastInserted

function withoutRange(fn) {
	const previous = globalRange
	const previousFirstInserted = globalFirstInserted
	globalRange = globalFirstInserted = null
	try {
		fn()
	} finally {
		globalRange = previous
		globalFirstInserted = previousFirstInserted
	
	}
}

function withRangeForInsertion(dr, fn) {
	const previous = globalRange
	const firstInserted = globalFirstInserted
	globalRange = dr
	globalFirstInserted = null
	try {
		fn()
	} finally {
		dr.firstNode = globalFirstInserted
		dr.lastNode = globalLastInserted
		if (firstInserted != null) globalFirstInserted = firstInserted
		globalRange = previous
	}
}

function setRange(nr) {
	globalRange = nr
}

function withRef(dom, fn) {
	const previous = globalDOM
	globalDOM = dom
	try {
		return fn()
	} finally {
		globalDOM = previous
	}
}

// helpers

function forEachNode(dR, fn, includingComments = false) {
	S.freeze(() => {
		const {firstNode, lastNode} = dR
		const boundary = lastNode.nextSibling
		let node = firstNode
		let i = 0
		do {
			const next = node.nextSibling
			if (includingComments || node.nodeType !== 8) try {fn(node, i++)} finally {/**/}
			node = next
		} while (node !== boundary)
	
	})
}

function toList(rng) {
	const res = []
	forEachNode(rng, el => res.push(el))
	return res
}

// hooks

const hooks = new WeakMap()

function getOrMakeHooks(r) {
	if (r == null) throw new Error("hooks must be defined from a live zone")
	const res = hooks.get(r)
	if (res != null) return res
	const h = Hooks()
	hooks.set(r, h)
	return h
}

function Hooks () {
	return {beforeRemove: null}
}

function beforeRemove(fn) {
	const hooks = getOrMakeHooks(globalRange)
	if (hooks.beforeRemove != null) throw new RangeError("beforeRemove has already been set here")
	hooks.beforeRemove = fn
}

function onRender(fn) {
	postpone("post-render", fn)
}

function onReflow(fn) {
	postpone("post-reflow", fn)
}

// constructors

function DOMRef(parent, nextSibling) {
	return {parent, nextSibling}
}

function NodeRange({parentNode, parentNodeRange, firstNode, lastNode, removed} = {}) {
	if (removed) console.error("rendering a node that's been removed")
	// if (hooks != null && hooks.cache != null) hooks = Hooks(hooks.cache)
	if (parentNode == null) parentNode = globalDOM.parent
	const res = {parentNode, parentNodeRange, firstNode, lastNode, removed: false, asArray: null}
	// Object.defineProperties(res, {
	// 	firstNode: {
	// 		set(x){this._fN = x; console.log("SET fN", x); console.trace()},
	// 		get() {return this._fN}
	// 	},
	// 	lastNode: {
	// 		set(x){this._lN = x; console.log("SET lN", x); console.trace()},
	// 		get() {return this._lN}
	// 	},
	// })
	return res
}

function fromOld({parentNode, parentNodeRange, removed}) {
	return NodeRange({parentNode, parentNodeRange, removed})
}

function fromParent(parentNodeRange) {
	const {parentNode} = parentNodeRange || {}
	return NodeRange({parentNode, parentNodeRange})
  
}

function emit(node) {
	if (skippable(node)) return
	if (Array.isArray(node)) node.forEach((n) => { emit(n) })
	else if (typeof node === "function") {
		if (hasOwn.call(node, componentEarmark)) emit(node())
		else emitDynamic(node)
	} else {
		//TODO: actual DOM fragments
		if (node instanceof win.Node) insert(node)
		else insert(doc.createTextNode(String(node)))
	}
}

function emitDynamic(fn) {
	let removed = true, rendering = false
	let oldNodeRange, placeHolderComment, remover
	S(() => {
		// Not sure this is needed given how S.js works.
		// It would be nice to let users set a recursion limit.
		if (rendering) throw new Error("Don't update the model while rendering")
		rendering = true
		const rng = oldNodeRange == null ? fromParent(globalRange) : fromOld(oldNodeRange)
		const nextSibling = oldNodeRange != null ? oldNodeRange.lastNode.nextSibling : globalDOM.nextSibling
		const {parentNode} = rng
		withRangeForInsertion(rng, () => {
			withRef(DOMRef(parentNode, nextSibling), () => {
				emit(absorb(fn))
				const wasRemoved = removed
				removed = globalFirstInserted == null

				// console.log({removed, wasRemoved, placeHolderComment})
				// insert even if it was already present to keep the nodeRanges in sync
				if (removed) {
					if (placeHolderComment == null) placeHolderComment = doc.createComment("")
					insert(placeHolderComment)
				}

				if (remover != null && !(removed && wasRemoved)) remover()
			})
		})

		// printRanges(rng)
		rendering = false
		if (oldNodeRange != null) {
			syncParents(rng.parentNodeRange, "firstNode", oldNodeRange.firstNode, rng.firstNode)
			syncParents(rng.parentNodeRange, "lastNode", oldNodeRange.lastNode, rng.lastNode)
		}
		oldNodeRange = rng
		S.cleanup(() => {
			remover = () => {
				const {beforeRemove: hook} = getOrMakeHooks(oldNodeRange)
				// console.log({hook})
				if (hook != null) {
					oldNodeRange.asArray = toList(oldNodeRange)
					hook(oldNodeRange.asArray, {remove: remove.bind(null, oldNodeRange)})
				} else {
					remove(oldNodeRange)
				}
			}
		})
	})
}

// function printRanges(r, l = 0) {
// 	p(l, r)
// 	if (r.parentNodeRange) printRanges(r.parentNodeRange, l + 1)
// }

function emitWithNodeRange (node) {
	const dr = NodeRange(globalRange)
	withRangeForInsertion(dr, () => {emit(node)})
	return dr
}

function syncParents(dR, key, old, current) {
	if (dR != null && dR[key] === old) {
		dR[key] = current
		syncParents(dR.parentNodeRange, key, old, current)
	}
}

function insert(node) {
	if (globalDOM.nextSibling != null) globalDOM.parent.insertBefore(node, globalDOM.nextSibling)
	else globalDOM.parent.appendChild(node)
	if (globalRange != null) {
		if (globalFirstInserted == null) globalFirstInserted = node
		globalLastInserted = node
	}
}

function remove(dR) {
	const {parentNode, parentNodeRange} = dR
	dR.removed = true
	if (parentNodeRange != null && parentNodeRange.removed) return
	if (dR.firstNode != dR.lastNode && parentNode.firstChild === dR.firstNode && parentNode.lastChild === dR.lastNode) {
		parentNode.textContent = ""
		return
	}
	if (dR.asArray != null) {
		dR.asArray.forEach((node) => {if (node.parentNode != null) parentNode.removeChild(node)})
	} else {
		forEachNode(dR, (node) => {
			// console.log({node})
			if (node.parentNode != null) parentNode.removeChild(node)
		}, true)
	}
}

function boot(parentNode, main) {
	if (parentNode == null) throw new TypeError(getErrorMessage("A002"))
	let nextSibling
	if (Object.getPrototypeOf(parentNode) === Object.prototype && parentNode.nextSibling != null) {
		nextSibling = parentNode.nextSibling
		parentNode = nextSibling.parentNode
	}
	if (
		String(parentNode.nodeType)[0] !== "1"
		|| nextSibling != null && typeof nextSibling.nodeType !== "number"
	) throw TypeError(getErrorMessage("A002"))
	if (typeof main !== "function" || main[componentEarmark]) throw new TypeError(getErrorMessage("A003"))

	return S.root((dispose) => {
		const range = withRef(DOMRef(parentNode, nextSibling), () => emitWithNodeRange(main))
		return () => {
			dispose(); remove(range)
		}
	})
}
