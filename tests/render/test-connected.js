import o from "ospec"
import {S, boot, connected, setWindow as setVellaWindow} from "../../index.js"
import {e, matchDOM, setWindow as setMDWindow} from "../../test-util/matchDOM.js"
import {doc, refreshWindow, win} from "../test-setup.js"

o.spec("connected", () => {
	o.beforeEach(() => {
		refreshWindow()
		setVellaWindow(win)
		setMDWindow(win)
	})
	o("throws when called off-tree", function(){
		o(connected).throws(Error)
	})
	o("gives the correct status", () => {
		const detached = doc.createElement("div")
		const body = doc.body
		const spy = o.spy(connected)

		boot(detached, () => o(spy()).equals(false))

		boot(body, () => o(spy()).equals(true))

		o(spy.callCount).equals(2)
	})
	o("reacts on insertion", () => new Promise((F, R) => {
		const node = doc.createElement("div")
		const expectedDOM = (
			e("body", {}, [
				e("div", {}, [
					e.comment("")
				])
			])
		)
		let expected = false

		boot(node, () => () => {
			try {
				const actual = connected()

				o(actual).equals(expected)

				if (actual) {
					o(doc.body).satisfies(matchDOM(expectedDOM))
					F()
				}
			} catch (e) {
				R(e)
			}
		})
			
		expected = true
		doc.body.appendChild(node)
	}))
	o("reacts on insertion with two nodes on the same parent", () => new Promise((F, R) => {
		const node = doc.createElement("div")
		const expectedDOM = (
			e("body", {}, [
				e("div", {}, [
					e.comment(""),
					e.comment("")
				])
			])
		)
		const LZ = () => {
			try {
				const actual = connected()

				o(actual).equals(expected)

				if (actual) {
					o(doc.body).satisfies(matchDOM(expectedDOM))
					if (++count === 2) F()
				}
			} catch (e) {
				R(e)
			}
		}
		let expected = false
		let count = 0
		boot(node, () => [LZ, LZ])
			
		expected = true
		doc.body.appendChild(node)
	}))

	o("only reacts once on insertion (second insertion is sync)", () => new Promise((F, R) => {
		const node = doc.createElement("div")
		const spy = o.spy(connected)
		const finalize = S.data(false)

		const expectedDOM = (
			e("body", {}, [
				e("div", {}, [
					e.comment(""),
					e.comment("")
				])
			])
		)
		let expected = false

		boot(node, () => [
			() => {
				try {
					const actual = spy()

					o(actual).equals(expected)

				} catch (e) {
					R(e)
				}
			},
			() => finalize() && (
				o(spy.callCount).equals(2),
				o(doc.body).satisfies(matchDOM(expectedDOM)),
				F()
			)
		])
			
		expected = true
		doc.body.appendChild(node)
		doc.body.removeChild(node)
		doc.body.appendChild(node)
		setTimeout(() => finalize(true))
	}))

	o("only reacts once on insertion (second insertion is async)", () => new Promise((F, R) => {
		const node = doc.createElement("div")
		const spy = o.spy(connected)
		const finalize = S.data(false)


		const expectedDOM = (
			e("body", {}, [
				e("div", {}, [
					e.comment(""),
					e.comment("")
				])
			])
		)
		let expected = false


		boot(node, () => [
			() => {
				try {
					const actual = spy()

					o(actual).equals(expected)

				} catch (e) {
					R(e)
				}
			},
			() => finalize() && (
				o(spy.callCount).equals(2),
				o(doc.body).satisfies(matchDOM(expectedDOM)),
				F()
			)
		])
			
		expected = true
		doc.body.appendChild(node)
		setTimeout(() => {
			doc.body.removeChild(node)
			setTimeout(() => {
				doc.body.appendChild(node)
				finalize(true)
			})
		})
	}))
	o("lets another node react independently on the same parent (sync)", () => new Promise((F, R) => {
		const node = doc.createElement("div")
		const second = S.data(false)
		const steps = []

		const LZ = () => {
			try {
				const actual = connected()

				o(actual).equals(expected)

				if (actual) {
					o(doc.body).satisfies(matchDOM(expectedDOM))
					steps.push("connected")
					if (steps.length === 5) {
						o(steps).deepEquals(["disconnected", "second", "disconnected", "connected", "connected"])
						F()
					}
				} else {
					steps.push("disconnected")
				}
			} catch (e) {
				R(e)
			}
		}

		const expectedDOM = (
			e("body", {}, [
				e("div", {}, [
					e.comment(""),
					e.comment("")
				])
			])
		)

		let expected = false


		boot(node, () => [
			LZ,
			() => second() && LZ()
		])
			
		expected = true
		doc.body.appendChild(node)
		doc.body.removeChild(node)
		expected = false
		// off-tree rendering
		steps.push("second")
		second(true)
		expected = true
		doc.body.appendChild(node)
	}))
	o("lets another node react independently on the same parent (async)", () => new Promise((F, R) => {
		const node = doc.createElement("div")
		const second = S.data(false)
		const steps = []

		const LZ = () => {
			try {
				const actual = connected()

				o(actual).equals(expected)

				if (actual) {
					o(doc.body).satisfies(matchDOM(expectedDOM))
					steps.push("connected")
					if (steps.length === 3) {
						o(steps).deepEquals(["connected", "disconnected", "connected"])
						F()
					}
				}
			} catch (e) {
				R(e)
			}
		}

		const expectedDOM = (
			e("body", {}, [
				e("div", {}, [
					e.comment(""),
					e.comment("")
				])
			])
		)

		let expected = false


		boot(node, () => [
			LZ,
			() => second() && LZ()
		])
			
		expected = true
		doc.body.appendChild(node)
		setTimeout(() => {
			doc.body.removeChild(node)
			expected = false
			// off-tree rendering
			second(true)
			setTimeout(() => {
				steps.push("disconnected")
				expected = true
				doc.body.appendChild(node)
			})
		})
	}))
})
