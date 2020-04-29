import {S} from "./S.js"
import {absorb, hasOwn} from "./util.js"

export {setAttrs}

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

let hasDynAttrs = false
let dynAttrs = null
let hasDynProps = false
let dynProps = null

function setAttrs(el, attrs, ns, tagName) {
	if (Array.isArray(attrs)) setAttrsArray(el, attrs, ns, tagName, true)
	else setAttrsObject(el, attrs, ns, tagName, false)
}


function setAttrsArray(el, attrs, ns, tagName, first) {
	if (first) hasDynAttrs = hasDynProps = false
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
		else if (k === "style" && typeof value !== "string") setStyle(el, k, attrs[k])
		else if (k === "$props") Object.keys(attrs.$props).forEach(k => setAttr(el, k, attrs.$props[k], hasOverrides))
		else if (k === "$attrs") Object.keys(attrs.$attrs).forEach(k => setProp(el, k, attrs.$attrs[k], hasOverrides))
		else if (ns == null && !avoidAsProp(k) && k in el) setProp(el, k, el[k], hasOverrides)
		else setAttr(el, k, attrs[k], hasOverrides)
	}
}

function setProp(el, k, v, hasOverrides) {
	let dyn
	if (hasOverrides && hasDynProps && (dyn = dynProps[k]) != null) {
		S.disposeNode(dyn)
	}
	if (typeof v === "function") {
		const {node} = S.makeComputationNode(() => el[k] = absorb(v), null, false, false)
		if (node != null && hasOverrides) {
			if (!hasDynProps) {
				hasDynProps = true
				dynProps = Object.create(null)
			}
			dynProps[k] = node
		}
	} else {
		el[k] = v
	}
}

function setAttr(el, k, v, hasOverrides) {
	// TODO: handle namespaces
	// if (k.length < 6 && k.slice(0, 6) === "xlink:") el.setAttributeNS("http://www.w3.org/1999/xlink", k.slice(6), value)

	let dyn
	if (hasOverrides && hasDynAttrs && (dyn = dynAttrs[k]) != null) {
		S.disposeNode(dyn)
	}
	if (typeof v === "function") {
		const {node} = S.makeComputationNode(() => {
			const now = absorb(v)
			// remove no matter what, there may be a value set by a previous attrs object
			if (now == null) el.removeAttribute(k)
			else el.setAttribute(k, now)
		}, null, false, false)
		if (node != null && hasOverrides) {
			if (!hasDynAttrs) {
				hasDynAttrs = true
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

function setEvents(el, events) {
	if (typeof events === "function") {
		S((then) => {
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

function setStyle(el, style) {
	setStyleObject(el, style)
}
function setStyleObject(/*el, style*/) {
	// TODO
}