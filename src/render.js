import {componentEarmark} from "./constants.js"
import {
	DOM,
	DOMRef, FirstInserted, LastInserted, Range,
	fromOld, fromParent,
	insert, remove, setZone, syncParents, withRange, withRef,
} from "./dom-utils.js"

import {getErrorMessage} from "./errors.js"
import {doc} from "./env.js"
import {S} from "./S.js"
import {absorb, hasOwn, skippable} from "./util.js"
// public API
export {
	boot,
}
// private exports
export {
	emit, emitWithNodeRange,
}

function emit(node) {
	if (skippable(node)) return
	if (Array.isArray(node)) node.forEach(n => { emit(n) })
	else if (typeof node === "function") {
		if (hasOwn.call(node, componentEarmark)) emit(node())
		else emitDynamic(node)
	} else {
		//TODO: workaround for making actual DOM fragments permanent
		if (node.nodeType) insert(node)
		else insert(doc.createTextNode(String(node)))
	}
}


//stubs

function emitDynamic(cb) {
	let lastNodes
	let removed = true, rendering = false
	let lastNr, placeHolderComment, remover
	S(() => {
		// Not sure this is needed given how S.js works.
		// It would be nice to let users set a recursion limit.
		if (rendering) throw new Error("Don't update the model while rendering")
		rendering = true
		const nr = setZone(lastNr == null ? fromParent(Range) : fromOld(lastNr))
		const nextSibling = lastNr != null ? lastNr.firstNode : DOM.nextSibling
		const {parentNode} = nr
		withRange(nr, () =>
			withRef(DOMRef(parentNode, nextSibling), () => {
				try {
					emit(absorb(cb))
				} finally {
					const wasRemoved = removed
					removed = FirstInserted == null
	
					// console.log({removed, wasRemoved, placeHolderComment, cb})
					// insert even if it was already present to keep the nodeRanges in sync
					if (removed) {
						if (placeHolderComment == null) placeHolderComment = doc.createComment("")
						insert(placeHolderComment)
					}
					if (nr.removeHooks != null && lastNodes == null) lastNodes = new Set()
					if (lastNodes != null) lastNodes.add(LastInserted)
					if (lastNr != null) syncParents(nr.parentNodeRange, "firstNode", lastNr.firstNode, FirstInserted)
					if (remover != null && !(removed && wasRemoved)) remover(LastInserted)
					// Node removal can be racy if there are several concurrent `removing` phases that overlap, and if an earlier
					// `removing` phase resolves after one that started later.
					// When nodes are removed, It is important that a parent live zone is updated correctly if present.
					// Since on update, the new nodes are inserted before the old ones, we can keep a stack of `lastNodes` on insertion,
					// then, on removal, remove the one of the NodeRange that is being removed, and sync the parent with the oldest
					// remaining `lastNode`.
					// the lastNodes set is created lazily when needed.
					S.cleanup(() => {
						remover = currentLast => {
							if (nr.removeHooks != null) {
								const results = []
								nr.removeHooks.hooks.forEach(x => x(results))
								void (nr.removeHooks.manager || Promise.all.bind(Promise))(results).finally(() => {
									lastNodes.delete(nr.lastNode)
									const lastNode = lastNodes[Symbol.iterator]().next().value
									remove(nr)
									syncParents(nr.parentNodeRange, "lastNode", nr.lastNode, lastNode)
								})
							} else {
								const lastNode = lastNodes == null
									? currentLast
									: (lastNodes.delete(nr.lastNode), lastNodes[Symbol.iterator]().next().value)

								remove(nr)
								syncParents(nr.parentNodeRange, "lastNode", nr.lastNode, lastNode)
							}
						}
					})
					lastNr = nr
					rendering = false
				}
			})
		)
	})
}

function emitWithNodeRange (node) {
	const dr = fromParent(Range)
	withRange(dr, () => {emit(node)})
	return dr
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

	return S.root(dispose => {
		const range = withRef(DOMRef(parentNode, nextSibling), () => emitWithNodeRange(main))
		return () => {
			dispose(); remove(range)
		}
	})
}
