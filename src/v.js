import {setAttrs} from "./attrs.js"
import {componentEarmark} from "./constants.js"
import {doc, isChrome, nodeProto, tagCache} from "./env.js"
import {DOMRef, emit, withRef, withoutRange} from "./render.js"
import {getProto, objProto, skippable} from "./util.js"

export {MATH, SVG, V}
export {math, svg, v}
export {cacheDelay, setCacheDelay}

const attrsParser = /([.#])([^.#\[]+)|\[(.+?)(?:\s*=\s*("|'|)((?:\\["'\]]|.)*?)\4)?\]|((?!$))/g
let globalNS = ""

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
}

function makeElement(selector, ns) {
	const end = selector.match(/[ \.#\[]|$/).index
	const hasAttrs = end !== selector.length
	const tagName = hasAttrs ? selector.slice(0, end) : selector
	const element = ns === "" ? doc.createElement(tagName || "div") : doc.createElementNS(ns, tagName)
	if (hasAttrs) parseAndSetAttrs(element, selector.slice(end), ns)
	return element
}

// create the element from scratch twice before caching/cloning.
let cacheDelay = 2
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
	globalNS = "http://www.w3.org/2000/svg"
	try {
		return v(...args)
	} finally {
		globalNS = null
	}
}

function math(...args) {
	globalNS = "http://www.w3.org/1998/Math/MathML"
	try {
		return v(...args)
	} finally {
		globalNS = null
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
	globalNS = "http://www.w3.org/2000/svg"
	try {
		return V(...args)
	} finally {
		globalNS = null
	}
}

function MATH(...args) {
	globalNS = "http://www.w3.org/1998/Math/MathML"
	try {
		return V(...args)
	} finally {
		globalNS = null
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

function component(tagName, attrs, children) {
	const cmp = tagName.bind(null, attrs, children)
	cmp[componentEarmark] = 1
	return cmp
}

function element(tagName, attrs, children) {
	const el = getOrMakeElement(tagName, globalNS)
	if (attrs != null) setAttrs(el, attrs, globalNS, tagName)
	withRef(DOMRef(el, null), () => {
		withoutRange(() => {
			emit(children)
		})
	})
	return el
}
