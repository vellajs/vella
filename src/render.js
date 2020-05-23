import {componentEarmark} from "./constants.js"
import {getErrorMessage} from "./errors.js"
import {doc} from "./env.js"
import {S} from "./S.js"
import {hasOwn, skippable} from "./util.js"
// public API
export {
	boot,
}
// private exports
export {
	emit, emitWithNodeRange,

	withoutRange,
	Range, Zone, forEachNode, fromParent, setRange, setZone, withRange,
	DOM, DOMRef, insert, remove, syncParents, withRef
}

let DOM
let Range
let Zone

let NodeCount
let FirstInserted
let LastInserted

const setRange = nr => (Range = nr)
const setZone = zn => (Zone = zn)

function withoutRange(cb) {
	const range = Range
	const firstInserted = FirstInserted
	const nodeCount = NodeCount
	Range = FirstInserted = null
	try {
		cb()
	} finally {
		Range = range
		FirstInserted = firstInserted
		NodeCount = nodeCount
	}
}

function withRange(nr, cb) {
	if (nr == null) return withoutRange(cb)
	// console.trace("wrfi")
	const range = Range
	const firstInserted = FirstInserted
	const nodeCount = NodeCount

	Range = nr
	FirstInserted = null
	NodeCount = 0
	try {
		cb()
	} finally {
		nr.firstNode = FirstInserted
		nr.lastNode = LastInserted
		nr.nodeCount = NodeCount
		if (firstInserted != null) FirstInserted = firstInserted
		Range = range
		NodeCount += nodeCount
	}
}

function withRef(ref, cb) {
	const dom = DOM
	DOM = ref
	try {
		return cb()
	} finally {
		DOM = dom
	}
}

// helpers

function forEachNode(nr, cb, includingComments = false, result = null) {
	const needsMetadata = cb.length > 1
	const lastFragmentIndex = nr.nodeCount - 1
	if (lastFragmentIndex === -1) return
	S.freeze(() => {
		const {firstNode, lastNode} = nr
		const boundary = lastNode.nextSibling
		let node = firstNode
		let fragmentIndex = 0
		do {
			const next = node.nextSibling
			if (includingComments || node.nodeType !== 8) try {
				const x = needsMetadata
					? cb(node, {fragmentIndex, lastFragmentIndex})
					: cb(node)
				if (result != null) result.push(x)
			} finally {/**/}
			fragmentIndex++
			node = next
		} while (node !== boundary)
	})
}

// constructors

function DOMRef(parent, nextSibling) {
	return {parent, nextSibling}
}

function NodeRange({parentNode, parentNodeRange} = {}) {
	// eslint-disable-next-line no-bitwise
	// eslint-disable-next-line no-bitwise
	if (parentNode == null) parentNode = DOM.parent
	const res = {parentNode, parentNodeRange, firstNode: null, lastNode: null, nodeCount: null, removeHooks: null}
	// Object.defineProperties(res, {
	// 	firstNode: {
	// 		set(x){
	// 			this._fN = x;
	// 			console.trace("SET fN", x && x.textContent)
	// 		},
	// 		get() {return this._fN}
	// 	},
	// 	lastNode: {
	// 		set(x){this._lN = x; console.trace("SET lN", x && x.textContent)},
	// 		get() {return this._lN}
	// 	},
	// })
	return res
}

function fromOld({parentNode, parentNodeRange, state}) {
	return NodeRange({parentNode, parentNodeRange, state})
}

function fromParent(parentNodeRange) {
	const {parentNode} = parentNodeRange || {}
	return NodeRange({parentNode, parentNodeRange})
  
}
function insert(node) {
	if (DOM.nextSibling != null) DOM.parent.insertBefore(node, DOM.nextSibling)
	else DOM.parent.appendChild(node)
	if (Range != null) {
		if (FirstInserted == null) FirstInserted = node
		NodeCount++
		LastInserted = node
	}
}

function remove(nr) {
	const {parentNode, parentNodeRange} = nr
	nr.removed = true
	if (parentNodeRange != null && parentNodeRange.removed) return
	if (nr.firstNode != nr.lastNode && parentNode.firstChild === nr.firstNode && parentNode.lastChild === nr.lastNode) {
		parentNode.textContent = ""
		return
	}
	forEachNode(nr, node => {
		if (node.parentNode != null) parentNode.removeChild(node)
	}, true)
}

function syncParents(nr, key, old, current) {
	if (nr != null && nr[key] === old) {
		nr[key] = current
		syncParents(nr.parentNodeRange, key, old, current)
	}
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

	const lastNodes = new Set()
	let lastNr, placeHolderComment, remover
	S(() => {
		// Not sure this is needed given how S.js works.
		// It would be nice to let users set a recursion limit.
		const nr = setZone(lastNr == null ? fromParent(Range) : fromOld(lastNr))
		const nextSibling = lastNr != null ? lastNr.firstNode : DOM.nextSibling
		const {parentNode} = nr
		withRange(nr, () =>
			withRef(DOMRef(parentNode, nextSibling), () => {
				try {
					emit(cb())
				} finally {
					const empty = FirstInserted == null
					const wasEmpty = lastNr != null && lastNr.firstNode === placeHolderComment

					// insert even if it was already present to keep the nodeRanges in sync
					if (empty) {
						if (placeHolderComment == null) placeHolderComment = doc.createComment("")
						insert(placeHolderComment)
					}

					// sync parent on redraw. LastNode is sinced when `remove` happens (either sync or async)
					if (lastNr != null) syncParents(nr.parentNodeRange, "firstNode", lastNr.firstNode, FirstInserted)

					// Node removal can be racy if there are several concurrent `removing` phases that overlap, and
					// if an earlier `removing` phase resolves after one that started later.
					// When nodes are removed, It is important that a parent live zone is updated correctly if present.
					// Since on update, the new nodes are inserted before the old ones, we can keep a stack of `lastNodes`
					// on insertion, then, on removal, remove the one of the NodeRange that is being removed, and sync
					// the parent with the oldest remaining `lastNode`.
					lastNodes.add(LastInserted)

					if (remover != null && !(empty && wasEmpty)) remover()

					S.cleanup(() => {
						remover = () => {
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
								lastNodes.delete(nr.lastNode)
								const lastNode = lastNodes[Symbol.iterator]().next().value

								remove(nr)
								syncParents(nr.parentNodeRange, "lastNode", nr.lastNode, lastNode)
							}
						}
					})
					lastNr = nr
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
	if (typeof main !== "function" || hasOwn.call(main, componentEarmark)) throw new TypeError(getErrorMessage("A003"))

	return S.root(dispose => {
		const range = withRef(DOMRef(parentNode, nextSibling), () => emitWithNodeRange(main))
		return () => {
			dispose(); remove(range)
		}
	})
}
