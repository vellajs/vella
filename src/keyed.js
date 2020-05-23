/* eslint-disable arrow-parens */
// /* global p */
// import S from "s-js"
import {component} from "./constants.js"
import {getErrorMessage} from "./errors.js"
import {doc} from "./env.js"
import {DOM, DOMRef, Range, emitWithNodeRange, forEachNode, insert, remove, setRange, syncParents, withRef} from "./render.js"
// TODO use V
import {S} from "./S.js"

//hooks

let globalHooks

function Hooks(){
	return {
		beforeUpdating:null, afterUpdated: null, rendered: null, reflowed: null, updating: null, updated: null, removing: null
	}
}

const life = {}

void ["beforeUpdating", "afterUpdated", "rendered", "reflowed", "updating", "updated", "removing"].forEach((name) => {
	life[name] = function(cb) {
		if (globalHooks[name] == null) globalHooks[name] = []
		globalHooks[name].push(cb)
	}
})

function normalize(renderer) {
	if (renderer == null) throw new TypeError(getErrorMessage("A006"))
	const type = typeof renderer
	if (type === "function") return {render: renderer, hooks: null}

	return renderer
}

export function keyed(keys, hooks) {
	return component(Keyed, keys, normalize(hooks))
}

function Keyed(keys, {hooks, render}) {
	if (typeof hooks === "function") {
		globalHooks = Hooks()
		hooks({...life})
		hooks = globalHooks
	}
	const parentDOMRange = Range
	const {parent: parentNode} = DOM
	const placeHolderComment = doc.createComment("")
	const hasIndices = render.length > 1
  
	let final
  
	S(last => {
		final = false
		S.cleanup(() => {
			final = true
			Promise.resolve().then(() => {
				if (final && last != null) last.refs.forEach((ref) => {ref.dispose()})
			})
		})
		if (last === null) {
			return create(keys(), render, placeHolderComment, hasIndices)
		} else {
			const nextSibling = last.refs.length === 0
				? placeHolderComment
				: last.refs[last.refs.length - 1].range.lastNode.nextSibling
			if (hooks != null && hooks.beforeUpdating != null) hooks.beforeUpdating.forEach(cb => {try {cb()}finally{/**/}})
			last = update(keys(), last, render, hooks, parentDOMRange, parentNode, nextSibling, placeHolderComment, hasIndices)
			if (hooks != null && hooks.afterUpdated != null) hooks.afterUpdated.forEach(cb => {try {cb()}finally{/**/}})
			return last
		}
	}, null)
}

const remover = (ref) => {remove(ref.range); ref.dispose()}

function moveNodes(parent, nextSibling, range) {
	if (range.firstNode === range.lastNode) {
		parent.insertBefore(range.firstNode, nextSibling)
	} else {
		const last = range.lastNode
		let node = range.firstNode, next
		// eslint-disable-next-line no-constant-condition
		while (true) {
			next = node.nextSibling
			parent.insertBefore(node, nextSibling)
			if (next === last) {
				parent.insertBefore(last, nextSibling)
				break
			}
			node = next
		}
	}
}

// const first = x => x.range.firstNode.textContent

function createMap(keys) {
	if (keys.length === 0) return null
	const type = typeof keys[0]
	if (type === "string" || type === "number") return {
		kind: "object",
		map: keys.reduce((acc, k, i) => {
			if (acc[k]) throw new Error(`duplicate key: ${k}`)
			acc[k] = i
			return acc
		}, Object.create(null))
	}
	else return {
		kind: "map",
		map: keys.reduce((acc, k, i) => {
			if (acc.has(k)) {
				console.error(k)
				throw new Error("duplicate key (see above)")
			}
			acc.set(k, i)
			return acc
		}, new Map)
	}
}


function create(keys, render, placeHolderComment, hasIndices) {
	if (keys.length === 0) {
		insert(placeHolderComment)
		return {keys: [], refs: []}
	} else {
		keys = [...keys]
		const refs = Array(keys.length)
		keys.forEach((key, i) => {
			const index = hasIndices ? S.value(i) : null
			S.root((dispose) => { refs[i] = {dispose, range: emitWithNodeRange(render(key, index)), index} })
		})
		return {refs, keys}
	}
}

// Pilfered from Mithril v2
export function update(
	keys,
	// data from the last render
	{keys: old, refs: oldRefs},
	//hooks
	render, hooks,
	// DOM context
	parentNodeRange, parentNode, nextSibling, placeHolderComment,
	hasIndices
) {
	keys = [...keys]
	const refs = Array(keys.length)
	if (hooks != null && hooks.updating != null) {
		const lastKeyIndex = old.length
		old.forEach((key, i) => {
			hooks.updating.forEach(hook => {
				const cb = hook.length > 1 ? (node, md) => hook(node, {...md, key, keyIndex: i, lastKeyIndex}) : node => hook(node)
				forEachNode(refs[i].range, cb)
			})
		})
	}
	if (old.length === 0) {
		if (keys.length > 0) {
			const range = Range
			setRange(parentNodeRange)
			withRef(DOMRef(parentNode, nextSibling), () => {
				keys.forEach((key, i) => {
					const index = hasIndices ? S.value(i) : null
					S.root((dispose) => {refs[i] = {dispose, range: emitWithNodeRange(render(key, index)), index} })
				})
			})
			setRange(range)
			parentNode.removeChild(placeHolderComment)
			syncParents(parentNodeRange, "firstNode", placeHolderComment, refs[0].range.firstNode)
			syncParents(parentNodeRange, "lastNode", placeHolderComment, refs[refs.length - 1].range.lastNode)
		}
	} else if (keys.length === 0) {
		oldRefs.forEach((ref, i) => remover(ref, old[i]))
		withRef(DOMRef(parentNode, nextSibling), () => {
			insert(placeHolderComment)
		})
		syncParents(parentNodeRange, "firstNode", oldRefs[0].range.firstNode, placeHolderComment)
		syncParents(parentNodeRange, "lastNode", oldRefs[oldRefs.length - 1].range.lastNode, placeHolderComment)
	} else {
		let os = 0, ks = 0, oe = old.length - 1, ke = keys.length - 1
		// bottom-up
		while (oe >= os && ke >= ks && old[oe] === keys[ke]) {
			refs[ke] = oldRefs[oe]
			if (hasIndices) refs[ke].index(ke)
			nextSibling = refs[ke].range.firstNode
			oe--, ke--
		}
		// top-down
		while (oe >= os && ke >= ks && old[os] === keys[ks]) {
			refs[ks] = oldRefs[os]
			if (hasIndices) refs[ks].index(ks)
			os++, ks++
		}
		// swaps and list reversals
		while (oe >= os && ke >= ks) {
			if (ks === ke) {
				if (hasIndices) refs[ks].index(ks)
				break
			}
			if (old[os] !== keys[ke] || old[oe] !== keys[ks]) break
			refs[ks] = oldRefs[oe]
			refs[ke] = oldRefs[os]
			if (hasIndices) {
				refs[ks].index(ks)
				refs[ke].index(ke)
			}
			moveNodes(parentNode, oldRefs[os].range.firstNode, oldRefs[oe].range)
			if (++ks <= --ke) moveNodes(parentNode, nextSibling, oldRefs[os].range)
			nextSibling = oldRefs[os].range.firstNode
			os++; oe--
		}
		// bottom up once again
		while (oe >= os && ke >= ks && old[oe] === keys[ke]) {
			if (old[oe] === keys[ke]) break
			nextSibling = oldRefs[oe].range.firstNode
			oe--, ke--
		}
		if (ks > ke) for (let i = os; i <= oe; i++) remover(oldRefs[i])
		else if (os > oe) {
			// p("adding", parentNode, nextSibling)
			const range = Range
			setRange(parentNodeRange)
			withRef(DOMRef(parentNode, nextSibling), () => {
				for (let i = ks; i <= ke; i++) S.root((dispose) => { refs[i] = {dispose, range: emitWithNodeRange(render(keys[i]))} })
			})
			setRange(range)
		} else {
			// inspired by ivi https://github.com/ivijs/ivi/ by Boris Kaul
			const oldMap = createMap(old)
			const winLength = ke - ks + 1, oldIndices = new Array(winLength)
			for (let i = 0; i < winLength; i++) oldIndices[i] = -1 // -1 signals a new node

			let li=0, i=0, positionSoFar = 2147483647, matched = 0, lisIndices

			for (i = ke; i >= ks; i--) {
				
				const oi = oldMap.kind === "object" ? oldMap.map[keys[i]] : oldMap.map.get(keys[i])
				if (oi != null) {
					positionSoFar = (oi < positionSoFar) ? oi : -1 // becomes -1 if nodes were re-ordered
					oldIndices[i - ks] = oi
					old[oi] = null
					refs[i] = oldRefs[oi]
					matched++
				}
			}
			if (matched !== oe - os + 1) {
				// p("remove", {old})
				for (let i = os; i <= oe; i++) if (old[i] != null) remover(oldRefs[i])
			}
			const range = Range
			setRange(parentNodeRange)
			withRef(DOMRef(parentNode, nextSibling), () => {
				if (matched === 0) {
					// p("just adding")
					for (let i = ks; i <= ke; i++) S.root((dispose) => { refs[i] = {dispose, range: emitWithNodeRange(render(keys[i]))} })
				} else {
					// p("going LIS", JSON.stringify({pos: positionSoFar, matched, oldIndices, refs: refs.map(first), oldRefs: oldRefs.map(first), oldMap: oldMap.map}))
          
					// some nodes are out of order, we need the LIS for optimal moves
					if (positionSoFar === -1) {
						// p("out of order")
						// the indices of the indices of the items that are part of the
						// longest increasing subsequence in the oldIndices list
						lisIndices = makeLisIndices(oldIndices)
						// p({lisIndices})
						li = 0
						for (i = ks; i <= ke; i++) {
							const oi = i - ks
							if (oldIndices[oi] === -1) {
								// p("new node")
								// p({bns: globalDOM.nextSibling.textContent, li})
									
								DOM.nextSibling = li < lisIndices.length ? oldRefs[oldIndices[lisIndices[li]]].range.firstNode : nextSibling

								// p({ans: globalDOM.nextSibling.textContent})
								S.root((dispose) => {
									const index = hasIndices ? S.value(i) : null
									refs[i] = {dispose, range: emitWithNodeRange(render(keys[i], index)), index}
								})
								// p(JSON.stringify({i, li, ks, oi, oldIndices}))
							} else {
								// p("old node")
								// p(JSON.stringify({i, li, ks, oi, oldIndices}))
								if (hasIndices) refs[i].index(i)
								if (li < lisIndices.length && lisIndices[li] === oi) {
									li++
								}
								else {
									oldIndices[oi] = -1
									// p({bns: globalDOM.nextSibling.textContent})

									DOM.nextSibling = li < lisIndices.length ? oldRefs[oldIndices[lisIndices[li]]].range.firstNode : nextSibling
									// p({ans: globalDOM.nextSibling.textContent})
									moveNodes(DOM.parent, DOM.nextSibling, refs[i].range)
								}
							}
						}
					} else {
						// p("in order", {ks, ke})
						let oIi = -1
						for (i = ks; i <= ke; i++) {
							const oi = i - ks
							os = oldIndices[oi]
							// p({oi, os, oldIndices, map, keys, old})
							if (os === -1) {
								// p("os === -1", {oIi, oi})
								if (oIi != null && oIi < oi) {
									oIi = findNext(oldIndices, oi)
									// p("set NS", {oi, oIi, oldIndices})
									DOM.nextSibling = oIi == null ? nextSibling : oldRefs[oldIndices[oIi]].range.firstNode
								}

								S.root((dispose) => {
									const index = hasIndices ? S.value(i) : null
									refs[i] = {dispose, range: emitWithNodeRange(render(keys[i], index)), index}
								})
							} else {
								if (hasIndices) refs[i].index(i)
							}
						}
					}
				}
			})
			setRange(range)
		}
		syncParents(parentNodeRange, "firstNode", oldRefs[0].range.firstNode, refs[0].range.firstNode)
		syncParents(parentNodeRange, "lastNode", oldRefs[oldRefs.length - 1].range.lastNode, refs[refs.length - 1].range.lastNode)
	}
	return {refs, keys}
}

function findNext(list, index) {
	for (; index < list.length; index++) {if (list[index] !== -1) return index}
}


// Lifted from ivi https://github.com/ivijs/ivi/
// takes a list of unique numbers (-1 is special and can
// occur multiple times) and returns an array with the indices
// of the items that are part of the longest increasing
// subsequece
// https://github.com/localvoid/ivi/blob/87794c0f45995d3368afa119560fc78825c5efb8/packages/ivi/src/vdom/reconciler.ts#L951

function makeLisIndices(a) {
	const p = a.slice();
	// result is instantiated as an empty array to prevent instantiation with CoW backing store.
	const result = [];
	let n = 0;
	let i = 0;
	let u;
	let v;
	let j;

	result[0] = 0;
	for (; i < a.length; ++i) {
		const k = a[i];
		if (k > -1) {
			j = result[n];
			if (a[j] < k) {
				p[i] = j;
				result[++n] = i;
			} else {
				u = 0;
				v = n;

				while (u < v) {
					// eslint-disable-next-line no-bitwise
					j = (u + v) >> 1;
					if (a[result[j]] < k) {
						u = j + 1;
					} else {
						v = j;
					}
				}

				if (k < a[result[u]]) {
					if (u > 0) {
						p[i] = result[u - 1];
					}
					result[u] = i;
				}
			}
		}
	}

	v = result[n];

	while (n >= 0) {
		result[n--] = v;
		v = p[v];
	}
	
	if(a[0] === -1) result.shift()
	
	return result;
}