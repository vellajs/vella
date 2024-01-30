/* eslint-disable @typescript-eslint/no-explicit-any */
import {DataSignal, S} from "./S.js"
import {Skippable, hasOwn, skippable} from "./util.js"
import type {NameSpace} from "./env.js"
import type {Node} from "../vendor/s-js/src/S"
import {Nullish} from "./types.js"

export {AttrsItem, ElementAttrs, parseAndSetAttrs, setAttrs}

interface Event {
	[x: string]: EventListenerOrEventListenerObject | [EventListenerOrEventListenerObject] | [EventListenerOrEventListenerObject, AddEventListenerOptions | boolean]
}


type EventOrStreamThereof = Event | (() => Event) | DataSignal<Event>
type AttrsItem = {
	on?: EventOrStreamThereof
	$attrs?: {[x: string]: any}
	$props?: {[x: string]: any}
	[x: string]: any
}

type ElementAttrs = AttrsItem | AttrsItem[]


const avoidAsProp = (attr: string) =>
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

function setAttrs(el: HTMLElement | SVGElement, attrs: ElementAttrs, ns: NameSpace, tagName: string) {
	if (Array.isArray(attrs)) setAttrsArray(el, attrs, ns, tagName, true)
	else setAttrsObject(el, attrs, ns, tagName, false)
}


function setAttrsArray(el: HTMLElement | SVGElement, attrs: AttrsItem[], ns: NameSpace, tagName: string, first: boolean) {
	if (first) dynAttrs = dynProps = null
	attrs.forEach(a => (
		Array.isArray(a)
			? setAttrsArray(el, a, ns, tagName, false)
			: setAttrsObject(el, a, ns, tagName, true)
	))
}

function setAttrsObject(el: HTMLElement | SVGElement, attrs: AttrsItem, ns: NameSpace, tagName: string, hasOverrides: boolean) {
	for (const k in attrs) if (hasOwn.call(attrs, k)) {
		if (k === "on") setEvents(el, attrs[k] as EventOrStreamThereof)
		else if (k === "class" || k === "className") setClass(el, attrs[k])
		else if (k === "style") setStyle(el, attrs[k], hasOverrides)
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		else if (k === "$props") Object.keys(attrs.$props!).forEach(k => setAttr(el, k, attrs.$props![k], hasOverrides))
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		else if (k === "$attrs") Object.keys(attrs.$attrs!).forEach(k => setProp(el, k, attrs.$attrs![k], hasOverrides))
		else if (ns === "" && !avoidAsProp(k) && k in el) setProp(el, k, attrs[k], hasOverrides)
		else setAttr(el, k, attrs[k], hasOverrides)
	}
}

let dynProps: {[x:string]: Node<any>} | Nullish
function setProp(el: HTMLElement | SVGElement, k: string, v: unknown, hasOverrides: boolean) {
	let dyn
	if (hasOverrides && dynProps != null && (dyn = dynProps[k]) != null) {
		S.disposeNode(dyn)
	}
	if (typeof v === "function") {
		const {node} = S.makeComputationNode(() => (el as any)[k] = v(), null, false, false)
		if (node != null && hasOverrides) {
			if (dynProps == null) {
				dynProps = Object.create(null)
			}
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			dynProps![k] = node
		}
	} else {
		(el as any)[k] = v
	}
}

let dynAttrs: {[x:string]: Node<any>} | Nullish
function setAttr(el: HTMLElement | SVGElement, k: string, v: unknown, hasOverrides: boolean) {
	// TODO: handle namespaces
	// if (k.length < 6 && k.slice(0, 6) === "xlink:") el.setAttributeNS("http://www.w3.org/1999/xlink", k.slice(6), value)

	let dyn
	if (hasOverrides && dynAttrs != null && (dyn = dynAttrs[k]) != null) {
		S.disposeNode(dyn)
	}
	if (typeof v === "function") {
		const {node} = S.makeComputationNode(() => {
			const value = v()
			// remove no matter what, there may be a value set by a previous attrs object
			if (value == null) el.removeAttribute(k)
			else el.setAttribute(k, value)
		}, null, false, false)
		if (node != null && hasOverrides) {
			if (dynAttrs == null) {
				dynAttrs = Object.create(null)
			}
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			dynAttrs![k] = node
		}
	} else {
		if (v == null) el.removeAttribute(k)
		else el.setAttribute(k, String(v))
	}
}

function setClass(el: HTMLElement | SVGElement, value: string | Skippable | (() => string | Skippable)) {
	if (typeof value === "function") {
		S((old: string | Skippable) => {
			if (!skippable(old)) el.classList.remove(old)
			const current = value()
			if (!skippable(current)) el.classList.add(current)
			return current
		}, null)
	}
	else {
		if (!skippable(value)) el.classList.add(value)
	}
}

function setEvents(el: HTMLElement | SVGElement, events: EventOrStreamThereof) {
	if (typeof events === "function") {
		S((then: Event | null) => {
			const now = events()
			eventHelper(el, then, "removeEventListener")
			eventHelper(el, now, "addEventListener")
			return now
		}, null)
	} else {
		eventHelper(el, events, "addEventListener")
	}
}

function eventHelper(el: HTMLElement | SVGElement, events: Event | null, method: "addEventListener" | "removeEventListener") {
	// for ... in ignores null and undefined
	for (const ev in events) if (hasOwn.call(events, ev)) {
		const handler = events[ev]
		if (Array.isArray(ev)) el[method](ev, ...(handler as [EventListenerObject|EventListener, boolean|EventListenerOptions]))
		else el[method](ev, handler as EventListenerObject|EventListener)
	}
}

let dynStyle:Node<any> | Nullish
let dynStyleProps: {[x: string]: Node<any> | Nullish} | Nullish

function setStyle(
	el: HTMLElement | SVGElement,
	style: (
		{[x: string]: string|(()=>string)}
		| string
		| Skippable
		| (() => string | Skippable)
	),
	hasOverrides: boolean
) {
	if (hasOverrides && dynStyle != null) {
		S.disposeNode(dynStyle)
		dynStyle = null
	}
	const type = typeof style
	if (type === "object" && style != null) {
		el.style.cssText = ""
		for (const prop in style as any) if (hasOwn.call(style, prop)) {
			if (prop.length < 2 || prop[0] === "-" && prop[1] === "-") setStyleCustomProperty(el, prop, (style as any)[prop], hasOverrides)
			else setStyleProperty(el, prop, (style as any)[prop], hasOverrides)
		}
	} else if (type === "function") {
		if (dynStyleProps != null) {
			for (const dsp in dynStyleProps) if (hasOwn.call(dynStyleProps, dsp)) S.disposeNode(dynStyleProps[dsp]as Node<any>)
			dynStyleProps = null
		}
		const {node} = S.makeComputationNode(() => {
			const value = (style as ()=>string)()
			el.style.cssText = value
		}, null, false, false)
		if (node != null && hasOverrides) {
			dynStyle = node
		}
	} else {
		el.style.cssText = skippable(style) ? "" : (style as string)
	}
}

function setStyleProperty(
	el: HTMLElement | SVGElement ,
	prop: string,
	v: string|number|Nullish | (() => string|number|Nullish),
	hasOverrides: boolean) {
	let dyn
	if (hasOverrides && dynStyleProps != null && (dyn = dynStyleProps[prop]) != null) {
		S.disposeNode(dyn)
		dynStyleProps[prop] = null
	}
	if (typeof v === "function") {
		const {node} = S.makeComputationNode(() => {
			const value = v()
			el.style[prop as any] = skippable(value) ? "" : String(value)
		}, null, false, false)
		if (node != null && hasOverrides) {
			if (dynStyleProps == null) dynStyleProps = {}
			dynStyleProps[prop] = node
		}
	} else {
		el.style[prop as any] = skippable(v) ? "" : String(v)
	}
}

function setStyleCustomProperty(
	el: HTMLElement | SVGElement,
	prop: string,
	v: string|number|Nullish | (() => string|number|Nullish),
	hasOverrides: boolean) {
	let dyn
	if (hasOverrides && dynStyleProps != null && (dyn = dynStyleProps[prop]) != null) {
		S.disposeNode(dyn)
		dynStyleProps[prop] = null
	}
	if (typeof v === "function") {
		const {node} = S.makeComputationNode(() => {
			const value = v()
			el.style.setProperty(prop, skippable(value) ? "" : String(value))
		}, null, false, false)
		if (node != null && hasOverrides) {
			if (dynStyleProps == null) dynStyleProps = {}
			dynStyleProps[prop] = node
		}
	} else {
		el.style.setProperty(prop, skippable(v) ? "" : String(v))
	}
}

const attrsParser = /([.#])([^.#\[]+)|\[(.+?)(?:\s*=\s*("|'|)((?:\\["'\]]|.)*?)\4)?\]|((?!$))/g
function parseAndSetAttrs(element: HTMLElement | SVGElement, s: string, ns: NameSpace) {
	attrsParser.lastIndex = 0
	let match
	let j = 0
	let classes: string[] | Nullish
	while(match = attrsParser.exec(s)) {
		/* c8 ignore next */
		if (j++ === 1000) {console.error("attrs parser bug for " + s);break}
		if (match[6]!= null) throw new RangeError(`unexpected attr: ${s.slice(match.index)}`)
		if (match[1] != null) {
			if (match[1] === ".") (classes || (classes=[])).push(match[2])
			else {
				if (ns === "") element.id = match[2]
				else element.setAttribute("id", match[2])
			}
		} else if (match[3] != null) {
			const key = match[3]
			const value = match[5] ? match[5].replace(/\\(["'])/g, "$1").replace(/\\\\/g, "\\") : ""
			if (key === "class") (classes || (classes=[])).push(value)
			else if (avoidAsProp(key) || !(key in element)) element.setAttribute(key, value)
			else (element as any)[key] = value
		}
	}
	if (classes != null) {
		if (ns === "") (element as any).className = classes.join(" ")
		else element.setAttribute("class", classes.join(" "))
	}
}
