// /* global p */
// import S from "s-js"
import {DOMRef, S, emitWithDOMRange, globalDOM, globalRange, onRender, remove, toList, v, withRange, withRef} from "./render.js"
import {doc} from "./env.js"

const sentinel = {keys: [], refs: []}

function normalizeHooks(hooks) {
	const {beforeUpdate, beforeRemove, onUpdate, render} =
		(typeof hooks === "function")	? {render: hooks} : hooks
	return {beforeUpdate, beforeRemove, onUpdate, render}

}
export const List = (keys, hooks) => _List(keys, normalizeHooks(hooks))

export function list(hooks, keys) {
	// validate only the first time
	if (this !== list) hooks = normalizeHooks(hooks)
	if (arguments.length === 1) return list.bind(list, hooks)
	return v(_List, keys, hooks)
}

function _List(keys, {beforeUpdate, beforeRemove, onUpdate, render}) {
	const parentDOMRange = globalRange
	const {parent: parentNode, nextSibling: initialNextSibling} = globalDOM
	const placeHolderComment = doc.createComment("")
	const hasIndices = render.length > 1
	const removeRef = (ref) => {remove(ref.range); ref.dispose()}
	const remover = beforeRemove != null
		// TODO: FIX beforeRemove not to rely on toList
		? (ref, key) => beforeRemove(key, toList(ref.range), {remove: removeRef.bind(null, ref)})
		: removeRef
  
	let last = sentinel
	let final
  
	return S(() => {
		final = false
		S.cleanup(() => {
			final = true
			onRender(() => {
				if (final) last.refs.forEach((ref) => {ref.dispose()})
			})
		})
		const isUpdate = last !== sentinel
		const nextSibling = isUpdate
			? (
				last.refs.length === 0
					? placeHolderComment
					: last.refs[last.refs.length - 1].range.lastNode.nextSibling
			)
			: initialNextSibling
      
		if (isUpdate && beforeUpdate != null) try { beforeUpdate(last) } catch(e) { console.error(e) }
		last = update(keys(), last, render, remover, parentDOMRange, parentNode, nextSibling, placeHolderComment, hasIndices)
		if (isUpdate && onUpdate != null) try { onUpdate(last) } catch(e) { console.error(e) }
	})
}

function insert(parent, nextSibling, node) {
	if (nextSibling == null) parent.appendChild(node)
	else parent.insertBefore(node, nextSibling)
}

function moveNodes(parent, nextSibling, range) {
	if (range.firstNode === range.lastNode) {
		insert(parent, nextSibling, range.firstNode)
	} else {
		const last = range.lastNode
		let node = range.firstNode, next
		// eslint-disable-next-line no-constant-condition
		while (true) {
			next = node.nextSibling
			insert(parent, nextSibling, node)
			if (next === last) {
				insert(parent, nextSibling, last)
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

// Pilfered from Mithril v2
export function update(
	keys,
	// data from the last render
	{keys: old, refs: oldRefs, map: oldMap},
	//hooks
	render, remove,
	// DOM context
	parentDOMRange, parentNode, nextSibling, placeHolderComment,
	hasIndices
) {
	keys = [...keys]
	const refs = Array(keys.length)
	const map = createMap(keys)
	if (old.length === 0) {
		const phParent = placeHolderComment.parentNode
		if (keys.length === 0 && phParent == null) insert(parentNode, nextSibling, placeHolderComment)
		if (keys.length > 0) {
			if (phParent == null) {
				// first render, no need to set the stack context.
				keys.forEach((key, i) => {
					const index = hasIndices ? S.value(i) : null
					S.root((dispose) => { refs[i] = {dispose, range: emitWithDOMRange(render(key, index)), index} })
				})
			} else {
				withRange(parentDOMRange, () => {
					withRef(DOMRef(parentNode, nextSibling), () => {
						keys.forEach((key, i) => {
							const index = hasIndices ? S.value(i) : null
							S.root((dispose) => {refs[i] = {dispose, range: emitWithDOMRange(render(key, index)), index} })
						})
					})
				})
				parentNode.removeChild(placeHolderComment)
			// TODO: sync REFS
			}
		}
	} else if (keys.length === 0) {
		oldRefs.forEach((ref, i) => remove(ref, old[i]))
		insert(parentNode, nextSibling, placeHolderComment)
		// TODO: sync REFS
	} else {
		const oldFirstNode = oldRefs[0].range.firstNode
		const oldLastNode = oldRefs[oldRefs.length - 1].range.lastNode
		let nextSibling = oldLastNode.nextSibling
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
		if (ks > ke) for (let i = os; i <= oe; i++) remove(oldRefs[i])
		else if (os > oe) {
			// p("adding", parentNode, nextSibling)
			withRange(parentDOMRange, () => {
				withRef(DOMRef(parentNode, nextSibling), () => {
					for (let i = ks; i <= ke; i++) S.root((dispose) => { refs[i] = {dispose, range: emitWithDOMRange(render(keys[i]))} })
				})
			})
		} else {
			// p("match and build old")
			// inspired by ivi https://github.com/ivijs/ivi/ by Boris Kaul
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
				for (let i = os; i <= oe; i++) if (old[i] != null) remove(oldRefs[i])
			}
			withRange(parentDOMRange, () => {
				withRef(DOMRef(parentNode, nextSibling), () => {
					if (matched === 0) {
						// p("just adding")
						for (let i = ks; i <= ke; i++) S.root((dispose) => { refs[i] = {dispose, range: emitWithDOMRange(render(keys[i]))} })
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
									
									globalDOM.nextSibling = li < lisIndices.length ? oldRefs[oldIndices[lisIndices[li]]].range.firstNode : nextSibling

									// p({ans: globalDOM.nextSibling.textContent})
									S.root((dispose) => {
										const index = hasIndices ? S.value(i) : null
										refs[i] = {dispose, range: emitWithDOMRange(render(keys[i], index)), index}
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

										globalDOM.nextSibling = li < lisIndices.length ? oldRefs[oldIndices[lisIndices[li]]].range.firstNode : nextSibling
										// p({ans: globalDOM.nextSibling.textContent})
										moveNodes(globalDOM.parent, globalDOM.nextSibling, refs[i].range)
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
										globalDOM.nextSibling = oIi == null ? nextSibling : oldRefs[oldIndices[oIi]].range.firstNode
									}

									S.root((dispose) => {
										const index = hasIndices ? S.value(i) : null
										refs[i] = {dispose, range: emitWithDOMRange(render(keys[i], index)), index}
									})
								} else {
									if (hasIndices) refs[i].index(i)
								}
							}
						}
					}
				})})
		}
		const firstNode = refs[0].firstNode
		const lastNode = refs[refs.length -1].lastNode
		if (firstNode !== oldFirstNode) syncParents(refs[0].parentRef, "firstNode", oldFirstNode, refs[0].firstNode)
		if (lastNode !== oldLastNode) syncParents(refs[0].parentRef, "lastNode", oldLastNode, refs[refs.length -1].lastNode)
	}
	
	return {refs, keys, map}
}

function syncParents(ref, key, old, current) {
	if (ref != null && ref[key] === old) {
		ref.parentRef[key] = current
		syncParents(ref.parentRef, key, old, current)
	}
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