/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {ElementAttrs, parseAndSetAttrs, setAttrs} from "./attrs.js"
import {NameSpace, doc, tagCache} from "./env.js"
import {ComponentResult ,DOMRef, Emitable, component, emit, withRef, withoutRange} from "./render.js"
import {getProto, objProto, skippable} from "./util.js"

export {SVG, V}
export {svg, v}
export {cacheDelay, setCacheDelay}

let NS: NameSpace = ""

function makeElement(selector: string, ns: NameSpace): HTMLElement | SVGElement {
	const end = selector.match(/[ \.#\[]|$/)!.index
	const hasAttrs = end !== selector.length
	const tagName = hasAttrs ? selector.slice(0, end) : selector
	const element = (ns === "" ? doc.createElement(tagName || "div") : doc.createElementNS(ns, tagName)) as HTMLElement | SVGElement
	if (hasAttrs) parseAndSetAttrs(element, selector.slice(end), ns)
	return element
}

// create the element from scratch twice before caching/cloning.
let cacheDelay = 1
function setCacheDelay(n: number) {
	cacheDelay = n
}

function getOrMakeElement(selector: string, ns: NameSpace): HTMLElement | SVGElement {
	const cached = tagCache[ns][selector] || (tagCache[ns][selector] = {delay: cacheDelay, el: null})
	if (cached.delay-- <= 0) return <HTMLElement | SVGElement>(cached.el || (cached.el = makeElement(selector, ns))).cloneNode()
	return makeElement(selector, ns)
}

type POJO = {__proto__: typeof Object.prototype}

const isPOJO: (x: any)=> boolean = x => !skippable(x) && getProto(x) === objProto

function svg(selector: string): SVGElement
function svg(selector: string, ...children: Emitable[]): SVGElement
function svg(selector: string, attrs: ElementAttrs):SVGElement
function svg(selector: string, attrs: ElementAttrs | null | undefined, ...children: Emitable[]): SVGElement

function svg(selector: string, ...args: any[]): SVGElement {
	NS = "http://www.w3.org/2000/svg"
	try {
		return v(selector, ...(args)) as any as SVGElement
	} finally {
		NS = ""
	}
}

function v(component: () => Emitable):ComponentResult
function v(component: (children: Emitable) => Emitable, ...children: Emitable[]):ComponentResult
function v<T>(component: (attrs: T) => Emitable, attrs: T):ComponentResult
function v<T>(component: (attrs: T, children: Emitable) => Emitable, attrs: T, ...children:Emitable[]):ComponentResult

function v(selector: string): HTMLElement
function v(selector: string, ...children: Emitable[]): HTMLElement
function v(selector: string, attrs: ElementAttrs):HTMLElement
function v(selector: string, attrs: ElementAttrs | null | undefined, ...children: Emitable[]): HTMLElement

// eslint-disable-next-line @typescript-eslint/ban-types
function v(tagName: string|Function, attrs?: ElementAttrs|Emitable , ...children: Emitable[]): Element| ComponentResult {
	const kind = typeof tagName
	// eslint-disable-next-line no-constant-condition
	let candidateType: string
	if (kind === "function") {
		return isPOJO(attrs)
			? component(tagName as any, attrs, children)
			: component(tagName as any, {}, [attrs, ...children])
			
	} else if (kind === "string") {
		let candidate = attrs
		let l = -1
		if (Array.isArray(candidate) && (l = candidate.length) > 0) candidate = candidate[0]
		return (
			l === 0
			|| skippable(candidate)
			|| (candidateType = typeof candidate) === "string"
			|| candidateType === "number"
			|| candidateType === "function"
			|| "nodeType" in (candidate as any)
		)
			? element(tagName as string, null, [attrs as Emitable, children])
			: element(tagName as string, attrs as ElementAttrs, children)
	} else {
		throw new RangeError("string or function expected as tagName, got " + kind)
	}
}

function SVG(selector: string): SVGElement
function SVG(selector: string, attrs: ElementAttrs):SVGElement
function SVG(selector: string, attrs: ElementAttrs | null | undefined, children: Emitable): SVGElement

function SVG(selector: string, ...args: []|[any]|[any, any]): SVGElement {
	NS = "http://www.w3.org/2000/svg"
	try {
		return V(selector, ...(args as [any, any])) as any as SVGElement
	} finally {
		NS = ""
	}
}

function V(component: () => Emitable):ComponentResult
function V<T>(component: (attrs: T) => Emitable, attrs: T):ComponentResult
function V<T>(component: (attrs: T, children: Emitable) => Emitable, attrs: T, children:Emitable):ComponentResult

function V(selector: string): HTMLElement
function V(selector: string, attrs: ElementAttrs):HTMLElement
function V(selector: string, attrs: ElementAttrs | null | undefined, children: Emitable): HTMLElement

// eslint-disable-next-line @typescript-eslint/ban-types
function V(tagName: string|Function, attrs?: any, children?: Emitable) : Element | ComponentResult {
	if (typeof tagName === "function") {
		// Attrs must be a POJO, not a null-prototyped object.
		return component(
			tagName as (_0: any, _1: Emitable) => Emitable,
			isPOJO(attrs) ? attrs : {},
			children
		)
	}
	else if (typeof tagName === "string") return element(tagName, attrs, children)
	else throw new RangeError("string or function expected as tagName, got " + typeof tagName)
}

function element(tagName: string, attrs: ElementAttrs | null, children: Emitable) {
	const el = getOrMakeElement(tagName, NS)
	if (attrs != null) setAttrs(el, attrs, NS, tagName)
	withRef(DOMRef(el, null), () => {
		withoutRange(() => {
			emit(children)
		})
	})
	return el
}
