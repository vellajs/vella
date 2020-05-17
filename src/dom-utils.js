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

function withoutRange(fn) {
	const range = Range
	const firstInserted = FirstInserted
	const nodeCount = NodeCount
	Range = FirstInserted = null
	try {
		fn()
	} finally {
		Range = range
		FirstInserted = firstInserted
		NodeCount = nodeCount
	}
}

function withRange(dr, fn) {
	if (dr == null) return withoutRange(fn)
	// console.trace("wrfi")
	const range = Range
	const firstInserted = FirstInserted
	const nodeCount = NodeCount

	Range = dr
	FirstInserted = null
	NodeCount = 0
	try {
		fn()
	} finally {
		dr.firstNode = FirstInserted
		dr.lastNode = LastInserted
		dr.nodeCount = NodeCount
		if (firstInserted != null) FirstInserted = firstInserted
		Range = range
		NodeCount += nodeCount
	}
}

function withRef(ref, fn) {
	const dom = DOM
	DOM = ref
	try {
		return fn()
	} finally {
		DOM = dom
	}
}

// helpers

function forEachNode(nr, fn, includingComments = false, result = null) {
	const needsMetadata = fn.length > 1
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
					? fn(node, {fragmentIndex, lastFragmentIndex})
					: fn(node)
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

function NodeRange({parentNode, parentNodeRange, removed} = {}) {
	if (removed) console.trace("rendering a node that's been removed")
	if (parentNode == null) parentNode = DOM.parent
	const res = {parentNode, parentNodeRange, firstNode: null, lastNode: null, nodeCount: null, removed: false, removeHooks: null}
	// Object.defineProperties(res, {
	// 	firstNode: {
	// 		set(x){this._fN = x; console.trace("SET fN", x)},
	// 		get() {return this._fN}
	// 	},
	// 	lastNode: {
	// 		set(x){this._lN = x; console.trace("SET lN", x)},
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
	// console.log("removing", {nr})
	const {parentNode, parentNodeRange} = nr
	nr.removed = true
	if (parentNodeRange != null && parentNodeRange.removed) return
	if (nr.firstNode != nr.lastNode && parentNode.firstChild === nr.firstNode && parentNode.lastChild === nr.lastNode) {
		parentNode.textContent = ""
		return
	}
	forEachNode(nr, node => {
		// console.log({node})
		if (node.parentNode != null) parentNode.removeChild(node)
	}, true)
}

function syncParents(nr, key, old, current) {
	if (nr != null && nr[key] === old) {
		nr[key] = current
		syncParents(nr.parentNodeRange, key, old, current)
	}
}
