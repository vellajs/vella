import {parseAndSetAttrs, setAttrs} from "./attrs.js"
import {component} from "./constants.js"
import {DOMRef, withRef, withoutRange} from "./dom-utils.js"
import {doc, tagCache} from "./env.js"
import {emit} from "./render.js"
import {getProto, objProto, skippable} from "./util.js"

export {MATH, SVG, V}
export {math, svg, v}
export {cacheDelay, setCacheDelay}

let NS = ""

function makeElement(selector, ns) {
	const end = selector.match(/[ \.#\[]|$/).index
	const hasAttrs = end !== selector.length
	const tagName = hasAttrs ? selector.slice(0, end) : selector
	const element = ns === "" ? doc.createElement(tagName || "div") : doc.createElementNS(ns, tagName)
	if (hasAttrs) parseAndSetAttrs(element, selector.slice(end), ns)
	return element
}

// create the element from scratch twice before caching/cloning.
let cacheDelay = 1
function setCacheDelay(n) {
	cacheDelay = n
}

function getOrMakeElement(selector, ns) {
	const cached = tagCache[ns][selector] || (tagCache[ns][selector] = {delay: cacheDelay, el: null})
	if (cached.delay-- <= 0) return (cached.el || (cached.el = makeElement(selector, ns))).cloneNode()
	return makeElement(selector, ns)
}

const isPOJO = x => !skippable(x) && getProto(x) === objProto

function svg(...args) {
	NS = "http://www.w3.org/2000/svg"
	try {
		return v(...args)
	} finally {
		NS = null
	}
}

function math(...args) {
	NS = "http://www.w3.org/1998/Math/MathML"
	try {
		return v(...args)
	} finally {
		NS = null
	}
}

function v(tagName, attrs, ...children) {
	const kind = typeof tagName
	// eslint-disable-next-line no-constant-condition
	let candidateType
	if (kind === "function") {
		return isPOJO(attrs)
			? component(tagName, attrs, children)
			: component(tagName, {}, [attrs, ...children])
			
	} else if (kind === "string") {
		let candidate = attrs
		let l = -1
		while (Array.isArray(candidate) && (l = candidate.length) > 0) candidate = candidate[0]
		return (
			l === 0
			|| skippable(candidate)
			|| (candidateType = typeof candidate) === "string"
			|| candidateType === "number"
			|| candidateType === "function"
			|| "nodeType" in candidate
		)
			? element(tagName, null, [attrs, children])
			: element(tagName, attrs, children)
	
	} else {
		throw new RangeError("string or function expected as tagName, got " + typeof tagName)
	}
}

function SVG(...args) {
	NS = "http://www.w3.org/2000/svg"
	try {
		return V(...args)
	} finally {
		NS = null
	}
}

function MATH(...args) {
	NS = "http://www.w3.org/1998/Math/MathML"
	try {
		return V(...args)
	} finally {
		NS = null
	}
}

function V(tagName, attrs, children) {
	if (typeof tagName === "function") {
		// Attrs must be a POJO, not a null-prototyped object.
		return component(tagName, isPOJO(attrs) ? attrs : {}, children)
	}
	else if (typeof tagName === "string") return element(tagName, attrs, children)
	else throw new RangeError("string or function expected as tagName, got " + typeof tagName)
}

function element(tagName, attrs, children) {
	const el = getOrMakeElement(tagName, NS)
	if (attrs != null) setAttrs(el, attrs, NS, tagName)
	withRef(DOMRef(el, null), () => {
		withoutRange(() => {
			emit(children)
		})
	})
	return el
}
