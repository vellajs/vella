import {componentEarmark} from "./constants.js"
import {doc, markAsObserving, observingRoot, win} from "./env.js"
import {postpone} from "./postpone.js"
import {S} from "./S.js"
import {absorb, hasOwn, skippable} from "./util.js"
// public API
export {
	forEach, toList,
	connected,
	boot,
	beforeRemove, onRender, onReflow,
}
// private exports
export {
	emit, emitWithNodeRange, remove,
	globalDOM, globalRange, DOMRef,
	withRange, withRef,

	withoutRange
}


// stack-managed state
// currently as decorators (training wheels)
// once the patterns are established, bugs are
// ironed out of the core and I'm confident with
// the tests, they'll be inlined

let globalDOM
let globalRange
let globalFirstInserted
let globalLastInserted

function withoutRange(fn) {
	const previous = globalRange
	const previousFirstInserted = globalFirstInserted
	globalRange = globalFirstInserted = null
	fn()
	globalRange = previous
	globalFirstInserted = previousFirstInserted
}

function withRange(dr, fn) {
	const previous = globalRange
	const firstInserted = globalFirstInserted
	globalRange = dr
	globalFirstInserted = null
	fn()
	dr.firstNode = globalFirstInserted
	dr.lastNode = globalLastInserted
	if (firstInserted != null) globalFirstInserted = firstInserted
	globalRange = previous
}

function withRef(dom, fn) {
	const previous = globalDOM
	globalDOM = dom
	const res = fn()
	globalDOM = previous
	return res
}

// helpers

function forEach(dR, fn) {
	const {firstNode, lastNode} = dR
	const boundary = lastNode.nextSibling
	let node = firstNode
	let i = 0
	do {
		const next = node.nextSibling
		fn(node, i++)
		node = next
	} while (node !== boundary)
}

function toList(rng) {
	const res = []
	forEach(rng, el => res.push(el))
	return res
}

// Connected

const pendingConnection = new WeakMap


function connected() {
	if (win == null) return false
	if (!observingRoot) {
		markAsObserving()
		new win.MutationObserver((mutations) => {
			mutations.forEach(record => [].forEach.call(record.addedNodes, (node) => {
				const signal = pendingConnection.get(node)
				if (signal != null) {
					signal(true)
					// only trigger the signal once, and let future nodes detect the
					// connected status of their parent.
					pendingConnection.delete(node)
				}
			}))
		}).observe(doc.documentElement, {childList: true, subtree: true})
	}
	if (globalRange == null) throw new Error("connected can only be called from a vella DOM context")
	if (doc.documentElement.contains(globalRange.parentNode) || doc.documentElement === globalRange.parentNode) return true
	else {
		const stream = pendingConnection.get(globalRange.parentNode) || S.data(false)
		pendingConnection.set(globalRange.parentNode, stream)
		return stream()
	}
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
	return {parentNode, parentNodeRange, firstNode, lastNode, removed: false, asArray: null}
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
		// if (parentNode.tagName === "UL") console.log("PN1:", parentNode.outerHTML)
		withRange(rng, () => {
			withRef(DOMRef(parentNode, nextSibling), () => {
				emit(absorb(fn))
				// if (parentNode.tagName === "UL") console.log("PN2:", parentNode.outerHTML)
				removed = (globalFirstInserted == null)
				if (remover != null) remover(removed)
				if (removed) {
					if (placeHolderComment == null) placeHolderComment = doc.createComment("")
					insert(placeHolderComment)
				}
			})
		})
		// if (!removed && rng.firstNode.tagName === "LI") p("LI:", rng, rng.firstNode.parentNode)

		// printRanges(rng)
		rendering = false
		if (oldNodeRange != null) {
			syncParents(rng.parentNodeRange, "firstNode", oldNodeRange.firstNode, rng.firstNode)
			syncParents(rng.parentNodeRange, "lastNode", oldNodeRange.lastNode, rng.lastNode)
		}
		oldNodeRange = rng
		S.cleanup(() => {
			const wasRemoved = removed
			remover = () => { //(removed) => {
				// don't remove twice in a row, the placeholder is cached and reused.
				if (wasRemoved) return
				const {beforeRemove: hook} = getOrMakeHooks(oldNodeRange)
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
	withRange(dr, () => {emit(node)})
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
		if (globalFirstInserted === null) globalFirstInserted = node
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
		forEach(dR, (node) => {
			if (node.parentNode != null) parentNode.removeChild(node)
		})
	}
}

function boot(parentNode, main) {
	let nextSibling
	if (Object.getPrototypeOf(parentNode) === Object.prototype) {
		nextSibling = parentNode.nextSibling
		parentNode = nextSibling.parentNode
	}
	return S.root((dispose) => {
		const range = withRef(DOMRef(parentNode, nextSibling), () => emitWithNodeRange(main))
		return () => {
			dispose(); remove(range)
		}
	})
}