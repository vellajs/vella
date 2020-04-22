const hasOwn = ({}).hasOwnProperty

/**
 * const actual = v("a", {class: "foo"}, v("b", {}, "foo"))
 * const expected = e("a", {hasProps: {class: "foo"}}, [e("b", {lacksAttrs:["class"]}, ["foo"])])
 * o(actual).satisfies(matchDOM(expected))
 */


let $win
let dummy

export function setWindow(win) {
	$win = win
	dummy = $win.document.createElement("div")
}
if (typeof window !== "undefined") setWindow(window)

export function str(x) {
	if (x instanceof $win.Node) {
		const {parentNode, nextSibling} = x
		dummy.textContent = ""
		dummy.appendChild(x)
		const txt = dummy.innerHTML
		if (parentNode) {
			if (nextSibling) parentNode.insertBefore(x, nextSibling)
			else parentNode.appendChild(x)
		}
		return txt
	} else if (x === undefined) {
		return "undefined"
	} else if (typeof x === "function") {
		return x.toStirng()
	} else {
		return JSON.stringify(x)
	}
}
const defaultAttrs = {
	hasAttrs: null,
	lacksAttrs: null,
	hasProps: null,
	lacksProps: null,
	hasEvent: null,
	lacksEvent: null
}
export function e(tagName, attrs = {}, children = []) {
	if (!(this instanceof e)) return new e(tagName, attrs, children)
	if (typeof tagName !== "string" && tagName !== Comment) throw new TypeError("invalid tagName value")
	Object.keys(attrs).forEach((k) => {if (!hasOwn.call(defaultAttrs, k)) {
		throw new TypeError(`unexpected key in attrs position: ${str(k)}`)}
	})
	if (attrs.hasAttrs) {
		attrs.hasAttrs.forEach((a) => {
			if (a != null && typeof a === "object") {
				for (const [k, v] of Object.entries(a)) {
					if (typeof v !== "string") throw new TypeError(
						`string expected as a value for ${str(k)} in ${str(a)}`
					)
				}
			} else if (a == null || typeof a !== "string") {
				const kind = a === null ? "null" : typeof a
				throw new TypeError(`Expected string or object for hasAttrs, got ${kind}`)
			}
		})
	}
	children.forEach((ch) => {
		if (!(ch instanceof e) && typeof ch !== "string") {
			throw new Error("invalid child type: " + typeof ch)
		}
	})
	Object.assign(this, {tagName, children}, defaultAttrs, attrs)
}

const Comment = e.comment = (txt = "") => new e(Comment, {}, [String(txt)])


export const matchDOM = expected => (actual) => {
	if (!(expected instanceof e || typeof expected === "string")) {
		throw new Error("matchDOM expects an `e` instance or a string")
	}
	const messages = []
	function error(prefix, message) {
		messages.push(`${prefix}: ${message}`)
	}
	check(actual, expected, "", error)

	if (messages.length === 0) return {pass: true, message: ""}
	messages.unshift(str(actual), "")
	return {pass: false, message: messages.join("\n")}
}

function check(actual, expected, prefix, error) {
	if (typeof expected === "string") {
		if (!(actual instanceof $win.Text)) {
			error(prefix + "?", `Text node expected, got ${str(actual)}\n`)
		} else if (actual.data !== expected) {
			error(prefix + "''", `${str(expected)} expected, got ${str(actual.textContent)}\n`)
		}
    
	} else if (expected instanceof e) {
		if (expected.tagName === Comment) {
			if (!(actual instanceof $win.Comment)) {
				error(prefix + "?", `Comment expected, got ${str(actual)}\n`)
			} else {
				if (actual.data !== expected.children[0]) {
					error(prefix, `<-- ${expected.children[0]} --> expected, got ${str(actual)}\n`)
				}
			}
		} else if (!(actual instanceof $win.Element && actual.tagName === expected.tagName.toUpperCase())) {
			error(prefix + "?", `<${expected.tagName}> expected, got ${str(actual)}`)
		} else {
			checkElement(actual, expected, prefix === "" ? expected.tagName : prefix + expected.tagName, error)
		}

	} else {
		throw new TypeError("Invalid 'expected' got " + typeof expected)
	}
}

function checkElement(actual, expected, prefix, error) {
	for (const k in validators) if (expected[k] != null) validators[k](actual, expected[k], prefix, error)
	const chCount = {
		actual: actual.childNodes.length,
		expected: expected.children == null ? 0 : expected.children.length
	}
	const commonLength = Math.min(chCount.actual, chCount.expected)
	for (let i = 0; i < commonLength; i++) {
		check(actual.childNodes[i], expected.children[i], `${prefix} ${i}> `, error)
	}
	if (chCount.expected < chCount.actual) {
		error(prefix, `Too many children (${chCount.actual - chCount.expected} in excess)`)
		for (let i = chCount.expected; i < chCount.actual; i++) {
			const node = actual.childNodes[i]
			error(`${prefix} ${i}> ?`, `Unexpected ${str(node)}`)
		}
	}
	if (chCount.actual < chCount.expected) {
		error(prefix, `Missing ${chCount.expected - chCount.actual} child(ren)`)
		for (let i = chCount.actual; i < chCount.expected; i++) {
			const node = expected.children[i]
			error(`${prefix} ${i}> ?`, `Missing <${str(node.tagName)}>`)
		}
	}
}

function normalizeClass(c) {
	return String(c).split(" ").filter(x => x !== "").sort().join(" ")
}

function equal(a, b, k, kind) {
	if (kind === "attr" && k === "class" || kind === "prop" && k === "className") {
		return normalizeClass(a) === normalizeClass(b)
	} else {
		return a === b
	}
}

const validators = {
	hasAttrs: (element, hasAttrs, prefix, error) => {
		if (!Array.isArray(hasAttrs)) hasAttrs = [hasAttrs]
		hasAttrs.forEach((a) => {
			if (typeof a === "string" && !element.hasAttribute(a)) {
				error(prefix + `[${a}]`, "attribute expected, but not found")
			} else if (typeof a === "object") {
				for (const k in a) {
					if (!(element.hasAttribute(k) && equal(element.getAttribute(k), a[k], k, "attr"))) {
						error(prefix + `[${k}]`, `attribute expected to be ${str(a[k])}, not ${str(element.getAttribute(k))}`)
					}
				}
			}
		})
	},
	lacksAttrs: (element, lackAttrs, prefix, error) => {
		lackAttrs.forEach((a) => {
			if (element.hasAttribute(a)) {
				error(prefix + `[${a}]`, `unexpected attribute, with value ${str(element.getAttribute(a))}`)
			}
		})
	},
	hasProps: (element, hasProps, prefix, error) => {
		if (!Array.isArray(hasProps)) hasProps = [hasProps]
		hasProps.forEach((p) => {
			if (typeof p === "string" && typeof element[p] === "undefined") {
				error(prefix + "." + p, "property expected but not found")
			} else if (typeof p === "object") {
				for (const k in p) {
					if (!(equal(element[k], p[k], k, "prop"))) {
						error(prefix + "." + k, `property expected to be ${str(p[k])}, not ${str(element[k])}`)
					}
				}
			}
		})
	},
	lacksProps: (element, lackProps, prefix, error) => {
		lackProps.forEach((p) => {
			if (typeof element[p] !== "undefined") {
				error(prefix + "." + p, `unexpected property, with value ${str(element[p])}`)
			}
		})
	},
	// TODO: EVENTS
}


/*
 o.spec("hyperscript", function() {
	 o.spec("selector", function() {

		 o("class and className normalization", function(){
			 o(v("a", {
				 class: null
			}).attrs).deepEquals({
				 class: null
			})
			 o(v("a", {
				 class: undefined
			}).attrs).deepEquals({
				 class: null
			})
			 o(v("a", {
				 class: false
			}).attrs).deepEquals({
				 class: null,
				 className: false
			})
			 o(v("a", {
				 class: true
			}).attrs).deepEquals({
				 class: null,
				 className: true
			})
			 o(v("a.x", {
				 class: null
			}).attrs).deepEquals({
				 class: null,
				 className: "x"
			})
			 o(v("a.x", {
				 class: undefined
			}).attrs).deepEquals({
				 class: null,
				 className: "x"
			})
			 o(v("a.x", {
				 class: false
			}).attrs).deepEquals({
				 class: null,
				 className: "x false"
			})
			 o(v("a.x", {
				 class: true
			}).attrs).deepEquals({
				 class: null,
				 className: "x true"
			})
			 o(v("a", {
				 className: null
			}).attrs).deepEquals({
				 className: null
			})
			 o(v("a", {
				 className: undefined
			}).attrs).deepEquals({
				 className: undefined
			})
			 o(v("a", {
				 className: false
			}).attrs).deepEquals({
				 className: false
			})
			 o(v("a", {
				 className: true
			}).attrs).deepEquals({
				 className: true
			})
			 o(v("a.x", {
				 className: null
			}).attrs).deepEquals({
				 className: "x"
			})
			 o(v("a.x", {
				 className: undefined
			}).attrs).deepEquals({
				 className: "x"
			})
			 o(v("a.x", {
				 className: false
			}).attrs).deepEquals({
				 className: "x false"
			})
			 o(v("a.x", {
				 className: true
			}).attrs).deepEquals({
				 className: "x true"
			})
		})
	})
})
 */