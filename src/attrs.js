import {S} from "./S.js"
import {absorb, hasOwn, skippable} from "./util.js"

export {parseAndSetAttrs, setAttrs}

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

function setAttrs(el, attrs, ns, tagName) {
	if (Array.isArray(attrs)) setAttrsArray(el, attrs, ns, tagName, true)
	else setAttrsObject(el, attrs, ns, tagName, false)
}


function setAttrsArray(el, attrs, ns, tagName, first) {
	if (first) dynAttrs = dynProps = null
	attrs.forEach(a => (
		Array.isArray(a)
			? setAttrsArray(el, a, ns, tagName, false)
			: setAttrsObject(el, a, ns, tagName, true)
	))
}

function setAttrsObject(el, attrs, ns, tagName, hasOverrides) {
	for (const k in attrs) if (hasOwn.call(attrs, k)) {
		if (k === "on") setEvents(el, attrs[k])
		else if (k === "class" || k === "className") setClass(el, attrs[k])
		else if (k === "style" && typeof value !== "string") setStyle(el, attrs[k], hasOverrides)
		else if (k === "$props") Object.keys(attrs.$props).forEach(k => setAttr(el, k, attrs.$props[k], hasOverrides))
		else if (k === "$attrs") Object.keys(attrs.$attrs).forEach(k => setProp(el, k, attrs.$attrs[k], hasOverrides))
		else if (ns == null && !avoidAsProp(k) && k in el) setProp(el, k, el[k], hasOverrides)
		else setAttr(el, k, attrs[k], hasOverrides)
	}
}

let dynProps = null
function setProp(el, k, v, hasOverrides) {
	let dyn
	if (hasOverrides && dynProps != null && (dyn = dynProps[k]) != null) {
		S.disposeNode(dyn)
	}
	if (typeof v === "function") {
		const {node} = S.makeComputationNode(() => el[k] = absorb(v), null, false, false)
		if (node != null && hasOverrides) {
			if (dynProps == null) {
				dynProps = Object.create(null)
			}
			dynProps[k] = node
		}
	} else {
		el[k] = v
	}
}

let dynAttrs = null
function setAttr(el, k, v, hasOverrides) {
	// TODO: handle namespaces
	// if (k.length < 6 && k.slice(0, 6) === "xlink:") el.setAttributeNS("http://www.w3.org/1999/xlink", k.slice(6), value)

	let dyn
	if (hasOverrides && dynAttrs != null && (dyn = dynAttrs[k]) != null) {
		S.disposeNode(dyn)
	}
	if (typeof v === "function") {
		const {node} = S.makeComputationNode(() => {
			const value = absorb(v)
			// remove no matter what, there may be a value set by a previous attrs object
			if (value == null) el.removeAttribute(k)
			else el.setAttribute(k, value)
		}, null, false, false)
		if (node != null && hasOverrides) {
			if (dynAttrs == null) {
				dynAttrs = Object.create(null)
			}
			dynProps[k] = node
		}
	} else {
		if (v == null) el.removeAttribute(k)
		else el.setAttribute(k, v)
	}
}

function setClass(el, value) {
	if (typeof value === "function") {
		S(old => {
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

function setEvents(el, events) {
	if (typeof events === "function") {
		S(then => {
			const now = absorb(events)
			eventHelper(el, then, "removeEventListener")
			eventHelper(el, now, "addEventListener")
			return now
		}, null)
	} else {
		eventHelper(el, events, "addEventListener")
	}
}

function eventHelper(el, events, method) {
	// for ... in ignores null and undefined
	for (const ev in events) if (hasOwn.call(events, ev)) {
		const handler = events[ev]
		if (Array.isArray(ev)) el[method](ev, ...handler)
		else el[method](ev, handler)
	}
}

let dynStyle = null
let dynStyleProps = null

function setStyle(el, style, hasOverrides) {
	if (hasOverrides && dynStyle != null) {
		S.disposeNode(dynStyle)
		dynStyle = null
	}
	const type = typeof style
	if (type === "object" || style != null) {
		el.style = ""
		for (const prop in style) if (hasOwn.call(style, prop)) {
			if (prop.length < 2 || prop[0] === "-" && prop[1] === "-") setStyleCustomProperty(el, prop, style[prop], hasOverrides)
			else setStyleProperty(el, prop, style[prop], hasOverrides)
		}
	} else if (type === "function") {
		if (dynStyleProps != null) {
			for (const dsp in dynStyleProps) if (hasOwn.call(dynStyleProps, dsp)) S.dispose(dynStyleProps[dsp])
			dynStyleProps = null
		}
		const {node} = S.makeComputationNode(() => {
			const value = absorb(style)
			el.style = skippable(value) ? "" : value
		}, null, false, false)
		if (node != null && hasOverrides) {
			dynStyle = node
		}
	} else {
		el.style = skippable(style) ? "" : style
	}
	
}

function setStyleProperty(el, prop, v, hasOverrides) {
	let dyn
	if (hasOverrides && dynStyleProps != null && (dyn = dynStyleProps[prop]) != null) {
		S.disposeNode(dyn)
		dynStyleProps[prop] = null
	}
	if (typeof v === "function") {
		const {node} = S.makeComputationNode(() => {
			const value = absorb(v)
			el.style[prop] = skippable(value) ? "" : value
		}, null, false, false)
		if (node != null && hasOverrides) {
			if (dynStyleProps == null) dynStyleProps = {}
			dynStyleProps[prop] = node
		}
		dynStyleProps[prop] = node
	} else {
		el.style[prop] = skippable(v) ? "" : v
	}
}

function setStyleCustomProperty(el, prop, v, hasOverrides) {
	let dyn
	if (hasOverrides && dynStyleProps != null && (dyn = dynStyleProps[prop]) != null) {
		S.disposeNode(dyn)
		dynStyleProps[prop] = null
	}
	if (typeof v === "function") {
		const {node} = S.makeComputationNode(() => {
			const value = absorb(v)
			el.style.setProperty(prop, skippable(value) ? "" : value)
		}, null, false, false)
		if (node != null && hasOverrides) {
			if (dynStyleProps == null) dynStyleProps = {}
			dynStyleProps[prop] = node
		}
		dynStyleProps[prop] = node
	} else {
		el.style.setProperty(prop, skippable(v) ? "" : v)
	}
}

const attrsParser = /([.#])([^.#\[]+)|\[(.+?)(?:\s*=\s*("|'|)((?:\\["'\]]|.)*?)\4)?\]|((?!$))/g
function parseAndSetAttrs(element, s, ns) {
	attrsParser.lastIndex = 0
	let match
	let j = 0
	let classes
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
			else element[key] = value
		}
	}
	if (classes != null) {
		if (ns != null) element.className = classes.join(" ")
		else element.setAttribute("class", classes.join(" "))
	}
}
