import S from "s-js"

import {doc, nodeProto, tagCache, win} from "./env.js"
import {postpone} from "./postpone.js"
import {absorb, hasOwn, isProto} from "./util.js"

export {
	forEach, toList,

	boot, v, V,
	beforeRemove, onRender, onReflow,
	withNS, Value,

	emit, emitWithDOMRange, remove,
	globalDOM, globalRange, DOMRef,
	withRange, withRef,

	S_ as S,
}


// stack-managed state
// currently as decorators (training wheels)
// once the patterns are established, bugs are
// ironed out of the core and I'm confident with
// the tests, they'll be inlined

function map(cb) {
	if (typeof cb !== "function") console.log(cb)
	return S_(() => cb(this()))
}

function toJSON() {
	return S.sample(this)
}

function decorateS(f) {
	return (...args) => {
		const res = f(...args)
		// p({name})
		res.map = map
		res.toJSON = toJSON
		return res
	}
}

const S_ = decorateS(S, "main")
Object.keys(S).forEach((m) => {
	S_[m] = (m === "cleanup" || m === "sample" || m === "root") ? S[m] : decorateS(S[m])
})

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

function DOMRange({parentNode, parentDOMRange, firstNode, lastNode, removed} = {}) {
	if (removed) console.error("rendering a node that's been removed")
	// if (hooks != null && hooks.cache != null) hooks = Hooks(hooks.cache)
	if (parentNode == null) parentNode = globalDOM.parent
	return {parentNode, parentDOMRange, firstNode, lastNode, removed: false, asArray: null}
}

function fromOld({parentNode, parentDOMRange, removed}) {
	return DOMRange({parentNode, parentDOMRange, removed})
}

function fromParent(parentDOMRange) {
	const {parentNode} = parentDOMRange || {}
	return DOMRange({parentNode, parentDOMRange})
  
}

function skippable(node) {
	return node == null || node === true || node === false
}

function emit(node) {
	if (skippable(node)) return
	if (Array.isArray(node)) node.forEach((n) => { emit(n) })
	else if (typeof node === "function") emitDynamic(node)
	else if (node instanceof Cmp) emit(node.tagName(node.attrs, ...node.children));
	else {
		//TODO: actual DOM fragments
		if (node instanceof win.Node) insert(node)
		else insert(doc.createTextNode(String(node)))
	}
}

function emitDynamic(fn) {
	let removed = true, rendering = false
	let oldDOMRange, placeHolderComment, remover
	S(() => {
		// Not sure this is needed given how S.js works.
		// It would be nice to let users set a recursion limit.
		if (rendering) throw new Error("Don't update the model while rendering")
		rendering = true
		const rng = oldDOMRange == null ? fromParent(globalRange) : fromOld(oldDOMRange)
		const nextSibling = oldDOMRange != null ? oldDOMRange.lastNode.nextSibling : globalDOM.nextSibling
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
		if (oldDOMRange != null) {
			syncParents(rng.parentDOMRange, "firstNode", oldDOMRange.firstNode, rng.firstNode)
			syncParents(rng.parentDOMRange, "lastNode", oldDOMRange.lastNode, rng.lastNode)
		}
		oldDOMRange = rng
		S.cleanup(() => {
			const wasRemoved = removed
			remover = () => { //(removed) => {
				// don't remove twice in a row, the placeholder is cached and reused.
				if (wasRemoved) return
				const {beforeRemove: hook} = getOrMakeHooks(oldDOMRange)
				if (hook != null) {
					oldDOMRange.asArray = toList(oldDOMRange)
					hook(oldDOMRange.asArray, {remove: remove.bind(null, oldDOMRange)})
				} else {
					remove(oldDOMRange)
				}
			}
		})
	})
}

// function printRanges(r, l = 0) {
// 	p(l, r)
// 	if (r.parentDOMRange) printRanges(r.parentDOMRange, l + 1)
// }

function emitWithDOMRange (node) {
	const dr = DOMRange(globalRange)
	withRange(dr, () => {emit(node)})
	return dr
}

function syncParents(dR, key, old, current) {
	if (dR != null && dR[key] === old) {
		dR[key] = current
		syncParents(dR.parentDOMRange, key, old, current)
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
	const {parentNode, parentDOMRange} = dR
	dR.removed = true
	if (parentDOMRange != null && parentDOMRange.removed) return
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

// const attrsSentinel = {}

function Value(x) {
	if (!(this instanceof Value)) return new Value(x)
	this.value = x
}

function setAttrs(el, attrs, ns, tagName) {
	// if (skippable(attrs)) return
	if (Array.isArray(attrs)) attrs.forEach(a => setAttrs(el, a, ns, tagName))
	else {
		for (const k in attrs) if (hasOwn.call(attrs, k)) {
			setAttrAndProps(el, k, attrs[k], ns, tagName)
		}
	}
}

const avoidAsProp = attr =>
	// as attr, they can take units, not as props.
	(attr === "width"
	|| attr === "height"
	// This was added between Mithril v0.2 and v1, without any explanation I could find
	|| attr === "href"
	// for form elements, the form property is read-only
	|| attr === "form"
	// input.list is read-only
	|| attr === "list"
	// so that we can remove it entirely rather than setting it to `undefined`
	|| attr === "id"
	)
		// if (value instanceof Value) value = value.value

function setAttrAndProps(el, k, value, ns, tagName) {
	if (/^on/.test(k)) el.addEventListener(k.slice(2), value)
	else if (k === "class" || k === "className") setClass(el, value)
	else {
    
		if (k.length < 6 && k.slice(0, 6) === "xlink:") el.setAttributeNS("http://www.w3.org/1999/xlink", k.slice(6), value)
		else if (ns == null && !avoidAsProp(k) && k in el) {
			// If you assign an input type that is not supported by IE 11 with an assignment expression, an error will occur.
			// also, setting the property doesn't update the attribute in some browsers, so it won't be picked up by CSS
			if (tagName === "input" && k === "type") el.setAttribute(k, value)
			else el[k] = value
		}
		else if (value != null) el.setAttribute(k, value)
	}
}

function setAttr(el, k, v, ns) {
	if (k.length < 6 && k.slice(0, 6) === "xlink:") el.setAttributeNS("http://www.w3.org/1999/xlink", k.slice(6), value)

}

function setProp(el, k, value, ns, tagName) {
	
}
function setClass(el, value) {
	if (typeof value === "function") {
		S((old) => {
			if (old != null) el.classList.remove(old)
			const current = absorb(value)
			el.classList.add(current)
			return current
		}, null)
	}
	else {
		el.classList.add(value)
	}
}


function Cmp(tagName, attrs, children) {
	this.tagName = tagName
	this.attrs = attrs
	this.children = children
}

let globalNS = null
const namespaces = {
	svg:"http://www.w3.org/2000/svg",
	math: "http://www.w3.org/1998/Math/MathML",
	mathml: "http://www.w3.org/1998/Math/MathML",
	html: null,
	xhtml: "http://www.w3.org/1999/xhtml"
}
function withNS(ns, fn) {
	ns = ns.toLowerCase()
	if (!hasOwn.call(namespaces, ns)) throw new RangeError("Unknown namespace: " + ns)
	const previous = globalNS
	globalNS = namespaces[ns]
	try {
		return fn()
	} finally {
		globalNS = previous
	}
}
const attrsParser = /([.#])([^.#\[]+)|\[(.+?)(?:\s*=\s*("|'|)((?:\\["'\]]|.)*?)\4)?\]|((?!$))/g

const defaultAttrsMap = new WeakMap

function parseAndSetAttrs(element, s, ns) {
	attrsParser.lastIndex = 0
	let match
	const attrs = Object.create(null)
	let j = 0
	let classes
	while(match = attrsParser.exec(s)) {
		if (j++ === 1000) {console.error("attrs parser bug");break}
		if (match[6]!= null) throw new RangeError(`unexpected attr: ${s.slice(match.index)}`)
		if (match[1] != null) {
			if (match[1] === ".") (classes || (classes=[])).push(match[2])
			else {
				element.setAttribute("id", attrs.id=match[2])
			}
		} else if (match[3] != null) {
			const key = match[3]
			const value = match[5] ? match[5].replace(/\\(["'])/g, "$1").replace(/\\\\/g, "\\") : ""
			if (key === "class") (classes || (classes=[])).push(value)
			else element.setAttribute(key, attrs[key]=value)
		}
	}
	if (classes != null) {
		classes = attrs.class = classes.join(" ")
		if (ns != null) element.className = classes
		else element.setAttribute("class", classes)
	}
	defaultAttrsMap.set(element, attrs)
}



function cacheTag(selector, ns) {
	const end = selector.match(/[ \.#\[]|$/).index
	const hasAttrs = end !== selector.length
	const tagName = hasAttrs ? selector.slice(0, end) : selector
	const element = tagCache[selector] = ns == null ? doc.createElement(tagName || "div") : doc.createElementNS(ns, tagName)
	if (hasAttrs) parseAndSetAttrs(element, selector.slice(end), ns)
	return element
}

function makeElement(tag, ns) {
	const tpl = tagCache[tag] || cacheTag(tag, ns)
	// console.log({tpl})
	return tpl.cloneNode()
}

const aStack = []
const iStack = []

export function vOpt(tagName, attrs, ...children) {
	let candidate = attrs
	let i = 0
	let is = 0
	// eslint-disable-next-line no-constant-condition
	if (Array.isArray(attrs)) while (true) {
		if (i === candidate.length) {
			if (is === 0) {
				candidate = null
				break
			}
			else {
				--is
				i = iStack[is]
				candidate = aStack[is]
			}
		}
		if (Array.isArray(candidate[i])) {
			iStack[is] = i + 1
			aStack[is] = candidate
			candidate = candidate[i]
			i = 0
			++is
		} else {
			candidate = candidate[i]
			break
		}
		++i
	}
	return (
		candidate == null
		|| typeof candidate === "string"
		|| isProto.call(nodeProto, candidate)
	)
		? V(tagName, null, attrs, ...children)
		: V(tagName, attrs, ...children)
}

const nodeSentinel = Symbol("Node sentinel")

export function vOptSentinel(tagName, attrs, ...children) {
	let candidate = attrs
	let i = 0
	let is = 0
	// eslint-disable-next-line no-constant-condition
	if (Array.isArray(attrs)) while (true) {
		if (i === candidate.length) {
			if (is === 0) {candidate = null; break}
			else {
				--is
				i = iStack[is]
				candidate = aStack[is]
			}
		}
		if (Array.isArray(candidate[i])) {
			iStack[is] = i + 1
			aStack[is] = candidate
			candidate = candidate[i]
			i = 0
			++is
		} else {
			candidate = candidate[i]
			break
		}
		++i
	}
	let type
	return (
		candidate == null
		|| (type = typeof candidate) === "string"
		|| type === "function"
		|| hasOwn.call(candidate, nodeSentinel)
		|| nodeProto.isPrototypeOf(candidate)
	)
		? V(tagName, null, attrs, ...children)
		: V(tagName, attrs, ...children)
}


export function vv(tagName, attrs, ...children) {
	if (attrs === v) return V(tagName, null, ...children)
	else return V(tagName, attrs, ...children)
}

function v(tagName, attrs, ...children) {
	return V(tagName, attrs, ...children)
}

export function vc(tagName, ...children) {
	return V(tagName, null, ...children)
}

const attrsSentinel = Symbol("Attrs sentinel")

export function va(tagName, attrs, ...children) {
	if (attrs == null || hasOwn.call(attrs, attrsSentinel)) return V(tagName, attrs, ...children)
	else return V(tagName, null, attrs, ...children)
}

export function a(attrs) {
	if (attrs != null) attrs[attrsSentinel] = true
	return attrs
}

function V(tagName, attrs, ...children) {
	// if (debug) debugger
	if (typeof tagName === "function") return new Cmp(tagName, attrs, children)
	else if (typeof tagName !== "string") throw new RangeError("string or function expected as tagName, got " + typeof tagName)
	const el = makeElement(tagName, globalNS)
	setAttrs(el, attrs, globalNS, tagName)
	withRef(DOMRef(el, null), () => {
		withoutRange(() => {
			emit(children)
		})
	})
	return el
}

function boot(parentNode, main) {
	let nextSibling
	if (Object.getPrototypeOf(parentNode) === Object.prototype) {
		nextSibling = parentNode.nextSibling
		parentNode = nextSibling.parentNode
	}
	return S.root((dispose) => {
		const range = withRef(DOMRef(parentNode, nextSibling), () => emitWithDOMRange(main))
		return () => {
			dispose(); remove(range)
		}
	})
}