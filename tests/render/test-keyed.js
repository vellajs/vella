import o from "ospec"

import {setWindow as setVellaWindow} from "../../src/env.js"
import {S, keyed, v} from "../../pieces.js"
// import {matchError} from "../../test-util/matchError.js"
import {e, matchDOM, setWindow as setMDWindow} from "../../test-util/matchDOM.js"
import {refreshWindow, win} from "../test-setup.js"

o.spec("keyed", () => {
	o.beforeEach(() => {
		refreshWindow()
		setVellaWindow(win)
		setMDWindow(win)
	})
	o("renders", () => {
		const keys = S.data(["a", "b", "c"])
		const expected = matchDOM(e("div", {}, ["a", "b", "c"]))
		const node = S.root(() => v("div", {}, keyed(keys, {render(k){return k}})))

		o(node).satisfies(expected)

	})
	o("renverses odd list", () => {
		const keys = S.data(["a", "b", "c", "d", "e"])
		const expected1 = matchDOM(e("div", {}, ["a", "b", "c", "d", "e"]))
		const expected2 = matchDOM(e("div", {}, ["e", "d", "c", "b", "a"]))
		const node = S.root(() => v("div", {}, keyed(keys, {render(k){return k}})))

		o(node).satisfies(expected1)

		keys(["e", "d", "c", "b", "a"])

		o(node).satisfies(expected2)
	})
})
