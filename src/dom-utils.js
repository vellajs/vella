import {S} from "./S.js"

export {
	DOMRef, forEachNode, fromOld, fromParent,
	DOM, FirstInserted, LastInserted , Range, Zone, insert, NodeRange,
	remove,
	setRange, setZone, syncParents, withRange, withRef,
	
	withoutRange
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

const REMOVED = 1
const HAS_NEXT_TICK_HOOK = 2

function NodeRange({parentNode, parentNodeRange, state = 0} = {}) {
	// eslint-disable-next-line no-bitwise
	state &= REMOVED
	// eslint-disable-next-line no-bitwise
	if (state !== 0) console.trace("rendering a node that's been removed")
	if (parentNode == null) parentNode = DOM.parent
	const res = {parentNode, parentNodeRange, firstNode: null, lastNode: null, nodeCount: null, state: 0, removeHooks: null}
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

