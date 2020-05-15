import o from "ospec"

import {S, V, setWindow as setVellaWindow} from "../../index.js"
// import {matchError} from "../../test-util/matchError.js"
import {e, matchDOM, setWindow as setMDWindow} from "../../test-util/matchDOM.js"
import {refreshWindow, win} from "../test-setup.js"

const {root} = S


o.spec("updates", () => {
	o.beforeEach(() => {
		refreshWindow()
		setVellaWindow(win)
		setMDWindow(win)
	})
	// TODO: attrs
	o("a single node is removed (with an array representing a lack of nodes)", () => {
		const signal = S.data(true)
		const expected1 = e("div", {}, ["a"])
		const expected2 = e("div", {}, [e.comment()])

		const node = root(() => V("div", {}, () => (signal() ? "a" : [])))

		o(node).satisfies(matchDOM(expected1))

		signal(false)

		o(node).satisfies(matchDOM(expected2))
	})
	o("a single node is removed (with null representing a lack of nodes)", () => {
		const signal = S.data(true)
		const expected1 = e("div", {}, ["a"])
		const expected2 = e("div", {}, [e.comment()])

		const node = root(() => V("div", {}, () => (signal() ? "a" : null)))

		o(node).satisfies(matchDOM(expected1))

		signal(false)

		o(node).satisfies(matchDOM(expected2))
	})
	o("a single node is removed (with undefined representing a lack of nodes)", () => {
		const signal = S.data(true)
		const expected1 = e("div", {}, ["a"])
		const expected2 = e("div", {}, [e.comment()])

		const node = root(() => V("div", {}, () => (signal() ? "a" : undefined)))

		o(node).satisfies(matchDOM(expected1))

		signal(false)

		o(node).satisfies(matchDOM(expected2))
	})
	o("a single node is removed (with true representing a lack of nodes)", () => {
		const signal = S.data(true)
		const expected1 = e("div", {}, ["a"])
		const expected2 = e("div", {}, [e.comment()])

		const node = root(() => V("div", {}, () => (signal() ? "a" : true)))

		o(node).satisfies(matchDOM(expected1))

		signal(false)

		o(node).satisfies(matchDOM(expected2))
	})
	o("a single node is removed (with false representing a lack of nodes)", () => {
		const signal = S.data(true)
		const expected1 = e("div", {}, ["a"])
		const expected2 = e("div", {}, [e.comment()])

		const node = root(() => V("div", {}, () => (signal() ? "a" : false)))

		o(node).satisfies(matchDOM(expected1))

		signal(false)

		o(node).satisfies(matchDOM(expected2))
	})
	o("a single node is removed (with an array of nullish values representing a lack of nodes)", () => {
		const signal = S.data(true)
		const expected1 = e("div", {}, ["a"])
		const expected2 = e("div", {}, [e.comment()])

		const node = root(() => V("div", {}, () => (signal() ? "a" : [null, true, false, undefined, [null], []])))

		o(node).satisfies(matchDOM(expected1))

		signal(false)

		o(node).satisfies(matchDOM(expected2))
	})
	o("a single node is inserted (with an array representing a lack of nodes)", () => {
		const signal = S.data(true)
		const expected1 = e("div", {}, [e.comment()])
		const expected2 = e("div", {}, ["a"])

		const node = root(() => V("div", {}, () => (signal() ? [] : "a")))

		o(node).satisfies(matchDOM(expected1))

		signal(false)

		o(node).satisfies(matchDOM(expected2))
	})
	o("a single node is inserted (with null representing a lack of nodes)", () => {
		const signal = S.data(true)
		const expected1 = e("div", {}, [e.comment()])
		const expected2 = e("div", {}, ["a"])

		const node = root(() => V("div", {}, () => (signal() ? null : "a")))

		o(node).satisfies(matchDOM(expected1))

		signal(false)

		o(node).satisfies(matchDOM(expected2))
	})
	o("a single node is inserted (with undefined representing a lack of nodes)", () => {
		const signal = S.data(true)
		const expected1 = e("div", {}, [e.comment()])
		const expected2 = e("div", {}, ["a"])

		const node = root(() => V("div", {}, () => (signal() ? undefined : "a")))

		o(node).satisfies(matchDOM(expected1))

		signal(false)

		o(node).satisfies(matchDOM(expected2))
	})
	o("a single node is inserted (with true representing a lack of nodes)", () => {
		const signal = S.data(true)
		const expected1 = e("div", {}, [e.comment()])
		const expected2 = e("div", {}, ["a"])

		const node = root(() => V("div", {}, () => (signal() ? true : "a")))

		o(node).satisfies(matchDOM(expected1))

		signal(false)

		o(node).satisfies(matchDOM(expected2))
	})
	o("a single node is inserted (with false representing a lack of nodes)", () => {
		const signal = S.data(true)
		const expected1 = e("div", {}, [e.comment()])
		const expected2 = e("div", {}, ["a"])

		const node = root(() => V("div", {}, () => (signal() ? false : "a")))

		o(node).satisfies(matchDOM(expected1))

		signal(false)

		o(node).satisfies(matchDOM(expected2))
	})
	o("a single node is inserted (with an array of nullish values representing a lack of nodes)", () => {
		const signal = S.data(true)
		const expected1 = e("div", {}, [e.comment()])
		const expected2 = e("div", {}, ["a"])

		const node = root(() => V("div", {}, () => (signal() ? [null, true, false, undefined, [null], []] : "a")))

		o(node).satisfies(matchDOM(expected1))

		signal(false)

		o(node).satisfies(matchDOM(expected2))
	})
	o("a single node is updated appropriately (signal as child)", () => {
		const signal = S.data("a")
		const expected1 = e("div", {}, ["a"])
		const expected2 = e("div", {}, ["b"])
		const expected3 = e("div", {}, ["c"])

		const node = root(() => V("div", {}, signal))

		o(node).satisfies(matchDOM(expected1))

		signal("b")

		o(node).satisfies(matchDOM(expected2))

		signal("c")

		o(node).satisfies(matchDOM(expected3))
	})
	o("a single node is updated appropriately (through a live zone)", () => {
		const signal = S.data("a")
		const expected1 = e("div", {}, ["a"])
		const expected2 = e("div", {}, ["b"])
		const expected3 = e("div", {}, ["c"])

		const node = root(() => V("div", {}, () => signal))

		o(node).satisfies(matchDOM(expected1))

		signal("b")

		o(node).satisfies(matchDOM(expected2))

		signal("c")

		o(node).satisfies(matchDOM(expected3))
	})
	o("a fragment is updated appropriately (signal as child)", () => {
		const signal = S.data(["a", 0])
		const expected1 = e("div", {}, ["a", "0"])
		const expected2 = e("div", {}, ["b", "1"])
		const expected3 = e("div", {}, ["c", "2"])

		const node = root(() => V("div", {}, signal))

		o(node).satisfies(matchDOM(expected1))

		signal(["b", 1])

		o(node).satisfies(matchDOM(expected2))

		signal(["c", 2])

		o(node).satisfies(matchDOM(expected3))
	})
	o("a fragment is updated appropriately (through a live zone)", () => {
		const signal = S.data(["a", 0])
		const expected1 = e("div", {}, ["a", "0"])
		const expected2 = e("div", {}, ["b", "1"])
		const expected3 = e("div", {}, ["c", "2"])

		const node = root(() => V("div", {}, () => signal))

		o(node).satisfies(matchDOM(expected1))

		signal(["b", 1])

		o(node).satisfies(matchDOM(expected2))

		signal(["c", 2])

		o(node).satisfies(matchDOM(expected3))
	})
	o("several streams updated synchronously work fine in the same fragment", () => {
		const signal = S.data(1)

		const expected1 = e("div", {}, ["1", "2"])
		const expected2 = e("div", {}, ["3", "6"])

		const node = root(() => V("div", {}, [signal, () => signal() * 2]))

		o(node).satisfies(matchDOM(expected1))

		signal(3)

		o(node).satisfies(matchDOM(expected2))
	})

	o("nested dynamic child is left in place when its parent is removed", () => {
		let child
		const spy = o.spy(x => (child = x))
		const signal = S.data(true)
		const parent = root(() => V("a", {}, () => signal() && spy(V("b", {}, () => signal() && V("c")))))

		const expectedChild = e("b", {}, [e("c")])
		const expectedParent1 = e("a", {}, [expectedChild])
		const expectedParent2 = e("a", {}, [e.comment()])

		o(parent).satisfies(matchDOM(expectedParent1))
		o(child).satisfies(matchDOM(expectedChild))

		signal(false)

		o(parent).satisfies(matchDOM(expectedParent2))
		o(child).satisfies(matchDOM(expectedChild))
		return new Promise(f => {
			setTimeout(() => {
				o(child).satisfies(matchDOM(expectedChild))
				f()
			})
		})
	})
	o("nested live zone", () => {
		const signal = S.data(true)
		const node = root(() => V("div", {}, () => () => signal() && "a"))
		const expected1 = e("div", {}, ["a"])
		const expected2 = e("div", {}, [e.comment()])

		o(node).satisfies(matchDOM(expected1))

		signal(false)

		o(node).satisfies(matchDOM(expected2))
	})
	o("nested dynamic fragments", () => {
		const s1 = S.data(true)
		const s2 = S.data(true)
		const node = root(() => V("div", {}, () => s1() && [
			"a",
			() => s2() && [
				"b",
				"c"
			],
			"d"
		]))

		const expected1 = e("div", {}, ["a", "b", "c", "d"])
		const expected2 = e("div", {}, ["a", e.comment(), "d"])
		const expected3 = e("div", {}, [e.comment()])

		o(node).satisfies(matchDOM(expected1))

		s2(false)

		o(node).satisfies(matchDOM(expected2))

		s2(true)

		o(node).satisfies(matchDOM(expected1))

		s2(false)
		s1(false)

		o(node).satisfies(matchDOM(expected3))

		s2(true)
		s1(true)

		o(node).satisfies(matchDOM(expected1))

		s1(false)

		o(node).satisfies(matchDOM(expected3))
	})
	o("dynamic siblings (on/off)", () => {
		const s = [S.value(1), S.value(1), S.value(1)]

		const expected ={
			"000":  e("div", {}, [e.comment(), e.comment(), e.comment()]),
			"100": e("div", {}, ["a", "b", e.comment(), e.comment()]),
			"010": e("div", {}, [e.comment(), "c", "d", e.comment()]),
			"001": e("div", {}, [e.comment(), e.comment(), "e", "f"]),
			"110": e("div", {}, ["a", "b", "c", "d", e.comment()]),
			"011": e("div", {}, [e.comment(), "c", "d", "e", "f"]),
			"101": e("div", {}, ["a", "b", e.comment(), "e", "f"]),
			"111": e("div", {}, ["a", "b", "c", "d", "e", "f"]),

		}

		const node = root(() => V("div", {}, [
			() => !!s[0]() && ["a", "b"],
			() => !!s[1]() && ["c", "d"],
			() => !!s[2]() && ["e", "f"],
		]))

		o(node).satisfies(matchDOM(expected["111"]))

		void [
			[0, 0, 0],
			[0, 0, 1], [0, 1, 0], [1, 0, 0],
			[1, 1, 0], [1, 0, 1], [0, 1, 1],
			[1, 1, 1]
		].forEach((scenario) => {
			scenario.forEach((x, i) => s[i](x))

			o(node).satisfies(matchDOM(expected[scenario.join("")]))

			scenario[0] = 1 * !scenario[0]
			scenario.forEach((x, i) => s[i](x))

			o(node).satisfies(matchDOM(expected[scenario.join("")]))

			scenario[0] = 1 * !scenario[0]
			scenario.forEach((x, i) => s[i](x))

			o(node).satisfies(matchDOM(expected[scenario.join("")]))

			scenario[1] = 1 * !scenario[0]
			scenario.forEach((x, i) => s[i](x))

			o(node).satisfies(matchDOM(expected[scenario.join("")]))

			scenario[1] = 1 * !scenario[0]
			scenario.forEach((x, i) => s[i](x))

			o(node).satisfies(matchDOM(expected[scenario.join("")]))

			scenario[2] = 1 * !scenario[0]
			scenario.forEach((x, i) => s[i](x))

			o(node).satisfies(matchDOM(expected[scenario.join("")]))

			scenario[2] = 1 * !scenario[0]
			scenario.forEach((x, i) => s[i](x))

			o(node).satisfies(matchDOM(expected[scenario.join("")]))
		})
	})
})
