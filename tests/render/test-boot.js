import o from "ospec"

import {setWindow as setVellaWindow} from "../../src/env.js"
import {S, boot, v} from "../../pieces.js"
import {matchError} from "../../test-util/matchError.js"
import {e, matchDOM, setWindow as setMDWindow} from "../../test-util/matchDOM.js"
import {refreshWindow, win} from "../test-setup.js"


o.spec("boot", () => {
	let createEl, node
	o.beforeEach(() => {
		refreshWindow()
		setVellaWindow(win)
		setMDWindow(win)
		createEl = win.document.createElement.bind(win.document)
		node = createEl("div")
	})
	o("throws when called with bad arguments", () => {
		const A002 = matchError({kind: TypeError, pattern: /A002/})
		const A003 = matchError({kind: TypeError, pattern: /A003/})

		o(() => boot(null)).satisfies(A002)
		o(() => boot(undefined)).satisfies(A002)
		o(() => boot(0)).satisfies(A002)
		o(() => boot(1)).satisfies(A002)
		o(() => boot([])).satisfies(A002)
		o(() => boot("")).satisfies(A002)
		o(() => boot("ohoh")).satisfies(A002)
		o(() => boot({})).satisfies(A002)
		// fails because `node` doesn't have a parent
		o(() => boot({parentNode: node})).satisfies(A002)
		o(() => boot(() => {})).satisfies(A002)

		o(() => boot(node, null)).satisfies(A003)
		o(() => boot(node, undefined)).satisfies(A003)
		o(() => boot(node, 0)).satisfies(A003)
		o(() => boot(node, 1)).satisfies(A003)
		o(() => boot(node, [])).satisfies(A003)
		o(() => boot(node, "ohoh")).satisfies(A003)
		o(() => boot(node, "")).satisfies(A003)
		o(() => boot(node, {})).satisfies(A003)
		o(() => boot(node, createEl("div"))).satisfies(A003)
		o(() => boot(node, v(() => {}))).satisfies(A003)
	})
	o("inserts DOM in a parent", () => {
		const unboot = boot(node, () => "a")
		const expected1 = e("div", {}, ["a"])
		const expected2 = e("div", {}, [])

		o(node).satisfies(matchDOM(expected1))

		unboot()

		o(node).satisfies(matchDOM(expected2))
	})
	o("inserts DOM in a parent with pre-existing content", () => {
		node.innerHTML = "a"
		const unboot = boot(node, () => "b")
		const expected1 = e("div", {}, ["a", "b"])
		const expected2 = e("div", {}, ["a"])

		o(node).satisfies(matchDOM(expected1))

		unboot()

		o(node).satisfies(matchDOM(expected2))
	})
	o("inserts several nodes in a parent with pre-existing content", () => {
		node.innerHTML = "a"
		const unboot = boot(node, () => ["b", "c"])
		const expected1 = e("div", {}, ["a", "b", "c"])
		const expected2 = e("div", {}, ["a"])

		o(node).satisfies(matchDOM(expected1))

		unboot()

		o(node).satisfies(matchDOM(expected2))
	})
	o("inserts DOM before a nextSibling", () => {
		node.innerHTML = "b"
		const unboot = boot({nextSibling: node.firstChild}, () => "a")
		const expected1 = e("div", {}, ["a", "b"])
		const expected2 = e("div", {}, ["b"])

		o(node).satisfies(matchDOM(expected1))

		unboot()

		o(node).satisfies(matchDOM(expected2))
	})
	o("inserts several nodes before a nextSibling", () => {
		node.innerHTML = "b"
		const unboot = boot({nextSibling: node.firstChild}, () => ["z", "a"])
		const expected1 = e("div", {}, ["z", "a", "b"])
		const expected2 = e("div", {}, ["b"])

		o(node).satisfies(matchDOM(expected1))

		unboot()

		o(node).satisfies(matchDOM(expected2))
	})
	o("delineates a live zone that is disposed of on `unboot()`", () => {
		const signal = S.data(0)
		const effects = []
		const unboot = boot(node, () => {
			effects.push(signal(), "lz")
			S(() => {
				effects.push(signal(), "S")
			})
		})

		o(effects).deepEquals([0, "lz", 0, "S"])

		signal(1)

		o(effects).deepEquals([0, "lz", 0, "S", 1, "lz", 1, "S"])

		unboot()
		signal(2)

		o(effects).deepEquals([0, "lz", 0, "S", 1, "lz", 1, "S"])
	})
	o("nodes are updated", () => {
		node.appendChild(createEl("div"))
		node.appendChild(createEl("div"))
		const signal = S.data(true)

		const expected1 = e("div", {}, [e("div"), e("div")])
		const expected2 = e("div", {}, [e("div"), "a", "b", e("div")])
		const expected3 = e("div", {}, [e("div"), "c", "d", "e", e("div")])

		o(node).satisfies(matchDOM(expected1))

		const unboot = boot({nextSibling: node.lastChild}, () => (signal() ? ["a", "b"] : ["c", "d", "e"]))

		o(node).satisfies(matchDOM(expected2))

		signal(false)

		o(node).satisfies(matchDOM(expected3))

		unboot()

		o(node).satisfies(matchDOM(expected1))
	})
	o("nodes are updated even if the world changes around them 1", () => {
		node.appendChild(createEl("div"))
		node.appendChild(createEl("div"))
		const signal = S.data(true)

		const expected1 = e("div", {}, [e("div"), e("div")])
		const expected2 = e("div", {}, [e("div"), "a", "b", e("div")])
		const expected3 = e("div", {}, [e("div"), e("ul"), "a", "b", e("ul"), e("div")])
		const expected4 = e("div", {}, [e("div"), e("ul"), "c", "d", "e", e("ul"), e("div")])
		const expected5 = e("div", {}, [e("div"), e("ul"), e("ul"), e("div")])

		o(node).satisfies(matchDOM(expected1))

		const unboot = boot({nextSibling: node.lastChild}, () => (signal() ? ["a", "b"] : ["c", "d", "e"]))

		o(node).satisfies(matchDOM(expected2))

		node.insertBefore(createEl("ul"), node.firstChild.nextSibling)
		node.insertBefore(createEl("ul"), node.lastChild)

		o(node).satisfies(matchDOM(expected3))

		signal(false)

		o(node).satisfies(matchDOM(expected4))

		unboot()

		o(node).satisfies(matchDOM(expected5))
	})
	o("nodes are updated even if the world changes around them 2", () => {
		node.appendChild(createEl("div"))
		node.appendChild(createEl("div"))
		const signal = S.data(true)

		const expected1 = e("div", {}, [e("div"), e("div")])
		const expected2 = e("div", {}, [e("div"), "a", "b", e("div")])
		const expected3 = e("div", {}, ["a", "b"])
		const expected4 = e("div", {}, ["c", "d", "e"])
		const expected5 = e("div", {}, [])

		o(node).satisfies(matchDOM(expected1))

		const unboot = boot({nextSibling: node.lastChild}, () => (signal() ? ["a", "b"] : ["c", "d", "e"]))

		o(node).satisfies(matchDOM(expected2))

		node.removeChild(node.firstChild)
		node.removeChild(node.lastChild)

		o(node).satisfies(matchDOM(expected3))

		signal(false)

		o(node).satisfies(matchDOM(expected4))

		unboot()

		o(node).satisfies(matchDOM(expected5))
	})
})
