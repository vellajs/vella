import o from "ospec"

import {setWindow as setVellaWindow} from "../../src/env.js"
import {S, keyed, ref, v} from "../../pieces.js"
// import {matchError} from "../../test-util/matchError.js"
import {e, matchDOM, setWindow as setMDWindow} from "../../test-util/matchDOM.js"
import {refreshWindow, win} from "../test-setup.js"

o.spec("keyed", () => {
	// using beforeEach here causes OOM errors
	o.before(() => {
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
	o("empty list within a live zone is then removed", () => {
		const cond = S.data(true)
		const keys = S.data([])
		const expected1 = matchDOM(e("div", {}, [e.comment()]))
		const expected2 = matchDOM(e("div", {}, [e.comment()]))
		const node = S.root(() => v("div", {}, () => cond() && keyed(keys, {render(k){return k}})))

		o(node).satisfies(expected1)

		cond(false)

		o(node).satisfies(expected2)
	})
	o("empty then 123456 then 23 then removed", () => {
		const cond = S.data(true)
		const keys = S.data([])
		const expected1 = matchDOM(e("div", {}, [e.comment()]))
		const expected2 = matchDOM(e("div", {}, ["1", "2", "3", "4", "5", "6"]))
		const expected3 = matchDOM(e("div", {}, ["2", "3"]))
		const node = S.root(() => v("div", {}, () => cond() && keyed(keys, {render(k){return k}})))

		o(node).satisfies(expected1)

		keys([1, 2, 3, 4, 5, 6])
		o(node).satisfies(expected2)

		keys([2, 3])

		o(node).satisfies(expected3)
		cond(false)

		o(node).satisfies(expected1)
	})
	o("empty then 123456 then 456 then removed", () => {
		const cond = S.data(true)
		const keys = S.data([])
		const expected1 = matchDOM(e("div", {}, [e.comment()]))
		const expected2 = matchDOM(e("div", {}, ["1", "2", "3", "4", "5", "6"]))
		const expected3 = matchDOM(e("div", {}, ["4", "5", "6"]))
		const node = S.root(() => v("div", {}, () => cond() && keyed(keys, {render(k){return k}})))

		o(node).satisfies(expected1)

		keys([1, 2, 3, 4, 5, 6])

		o(node).satisfies(expected2)

		keys([4, 5, 6])

		o(node).satisfies(expected3)

		cond(false)

		o(node).satisfies(expected1)
	})

	o.spec("update scenarios", () => {
		const keys = ["123456", "12345", "23456", "654321", "12", "23", "56", "456", "321", "1256", "2165", "", "54321"]
		const wrappers = [x => x, x => ["before", ...x], x => [...x, "after"], x => ["before", ...x, "after"]]
		const fragmentRenderers = [x => x, x => [x, x + ":"]]
		const refRenderers = [x => x, x => ref(() => x)]
		const lzRenderers = [x => x, x => () => x]
		const renderers = []
		fragmentRenderers.forEach((fr, fri) => {
			refRenderers.forEach((rr, rri) => {
				lzRenderers.forEach((lr, lri) => {
					renderers.push({
						name: `${fri ? "fragment ":""}${rri ? "ref ": ""}${lri ? "LZ ": ""}`,
						render(x) {return rr(lr(fr(x)))},
						expect(x) {return fr(x)}
					})
				})
			})
		})
		renderers.forEach(renderer => {
			wrappers.forEach((wrapper, wi) => {
				keys.forEach(from => {
					keys.forEach(to => {
						o(`${renderer.name || "bare"}: from "${from}" to "${to}, wrapper: ${wrapper.toString()}"`, () => {
							const expectedFrom = matchDOM(e("div", {}, wrapper(from === "" ? [e.comment()] : from.split("").flatMap(renderer.expect))))
							const expectedTo = matchDOM(e("div", {}, wrapper(to === "" ? [e.comment()] : to.split("").flatMap(renderer.expect))))

							const keys = S.data(from.split(""))

							const node = S.root(() => v("div", {}, wrapper([keyed(keys, {render: k => renderer.render(k)})])))

							o(node).satisfies(expectedFrom)

							keys(to.split(""))

							o(node).satisfies(expectedTo)
						})
					})
				})
				const M = 100, N = 10
				for (let i = 0; i < M; i++) {
					// eslint-disable-next-line no-bitwise
					const _series = [...Array(N)].map(() => Math.random() * keys.length | 0).map(i => keys[i])
					o(`${N} ${renderer.name || "bare"} renders ${i} ${JSON.stringify(_series)}, wrapper: ${wrapper.toString()}`, () => {
						const on = S.data(true)
						const keys = S.data([])
						const node = S.root(() => v("div", {}, () => on() && wrapper([keyed(keys, {render: k => renderer.render(k)})])))
						const series = [..._series]
						while (series.length > 0) {
							const key = series.shift()
							if (typeof key.split !== "function") console.log({series, key})
							const expected = matchDOM(e("div", {}, wrapper(key === "" ? [e.comment()] : key.split("").flatMap(renderer.expect))))
							keys(key.split(""))
							o(node).satisfies(expected)
						}
						on(false)
						o(node).satisfies(matchDOM(e("div", {}, [e.comment()])))
					})
					if (wi != 0) {
						o(`${renderer.name || "bare"} renders fuzzer ${i} ${JSON.stringify(_series)}, outer wrapper: ${wrapper.toString()}`, () => {
							const on = S.data(true)
							const keys = S.data([])
							const node = S.root(() => v("div", {}, wrapper([() => on() && keyed(keys, {render: k => renderer.render(k)})])))
							const series = [..._series]
							while (series.length > 0) {
								const key = series.shift()
								if (typeof key.split !== "function") console.log({series, key})
								const expected = matchDOM(e("div", {}, wrapper(key === "" ? [e.comment()] : key.split("").flatMap(renderer.expect))))
								keys(key.split(""))
								o(node).satisfies(expected)
							}
							on(false)
							o(node).satisfies(matchDOM(e("div", {}, wrapper([e.comment()]))))
						})
					}
				}
			})
		})
	})
})
