import o from "ospec"

import {setWindow as setVellaWindow} from "../../src/env.js"
import {S, ref, v} from "../../pieces.js"
// import {matchError} from "../../test-util/matchError.js"
import {e, matchDOM, setWindow as setMDWindow} from "../../test-util/matchDOM.js"
import {refreshWindow, win} from "../test-setup.js"

const {root} = S

const nextTick = () => Promise.resolve()
const timeout = t => new Promise(F => setTimeout(F, t))

o.spec("ref", () => {
	o.beforeEach(() => {
		refreshWindow()
		setVellaWindow(win)
		setMDWindow(win)
	})
	o("basics", () => {
		const spy = o.spy(() => "a")
		const expected = matchDOM(e("div", {}, ["a"]))
		o(typeof ref).equals("function")
		o(typeof ref(spy)).equals("function")
		o(spy.callCount).equals(0)

		const actual = v("div", {}, ref(spy))

		o(actual).satisfies(expected)
	})
	o.spec("asap", () => {
		o("cb is called for one element (no metadata)", () => {
			const spy = o.spy()
			const expectedNode = matchDOM(e("div", {}, ["a"]))
			const expectedChild = matchDOM("a")
			const actual = v("div", {}, ref(life => {
				life.asap(spy)
				return "a"
			}))
	
			o(actual).satisfies(expectedNode)
			o(spy.callCount).equals(1)
			o(spy.args.length).equals(1)
			o(spy.args[0]).satisfies(expectedChild)
		})
		o("cb is called for one element (w/ metadata)", () => {
			const spy = o.spy((node, metadata) => ({node, metadata}))
			const expectedNode = matchDOM(e("div", {}, ["a"]))
			const expectedChild = matchDOM("a")
			const actual = v("div", {}, ref(life => {
				life.asap(spy)
				return "a"
			}))
	
			o(actual).satisfies(expectedNode)
			o(spy.callCount).equals(1)
			o(spy.args.length).equals(2)
			o(spy.args[0]).satisfies(expectedChild)
			o(spy.args[1]).deepEquals({fragmentIndex: 0, lastFragmentIndex: 0})
		})
		o("works with a fragment (no metadata)", () => {
			const spy = o.spy()
			const expectedNode = matchDOM(e("div", {}, ["a", "b"]))
			const expectedChildA = matchDOM("a")
			const expectedChildB = matchDOM("b")
			const actual = v("div", {}, ref(life => {
				life.asap(spy)
				return ["a", "b"]
			}))
	
			o(actual).satisfies(expectedNode)
			o(spy.callCount).equals(2)
			o(spy.calls[0].args.length).equals(1)
			o(spy.calls[0].args[0]).satisfies(expectedChildA)
			o(spy.calls[1].args.length).equals(1)
			o(spy.calls[1].args[0]).satisfies(expectedChildB)
		})
		o("works with a fragment (w/ metadata)", () => {
			const spy = o.spy((node, metadata) => ({node, metadata}))
			const expectedNode = matchDOM(e("div", {}, ["a", "b"]))
			const expectedChildA = matchDOM("a")
			const expectedChildB = matchDOM("b")
			const actual = v("div", {}, ref(life => {
				life.asap(spy)
				return ["a", "b"]
			}))
	
			o(actual).satisfies(expectedNode)
			o(spy.args.length).equals(2)
			o(spy.calls[0].args[0]).satisfies(expectedChildA)
			o(spy.calls[0].args[1]).deepEquals({fragmentIndex: 0, lastFragmentIndex: 1})
			o(spy.calls[1].args[0]).satisfies(expectedChildB)
			o(spy.calls[1].args[1]).deepEquals({fragmentIndex: 1, lastFragmentIndex: 1})
		})
		o("works with a fragment (w/ metadata and an empty stream in the middle)", () => {
			const signal = S.data()
			const spy = o.spy((node, metadata) => ({node, metadata}))
			const expectedNode = matchDOM(e("div", {}, ["a", e.comment(), "b"]))
			const expectedChildA = matchDOM("a")
			const expectedChildB = matchDOM("b")
			const actual = S.root(() => v("div", {}, ref(life => {
				life.asap(spy)
				return ["a", signal, "b"]
			})))
	
			o(actual).satisfies(expectedNode)
			o(spy.args.length).equals(2)
			o(spy.calls[0].args[0]).satisfies(expectedChildA)
			o(spy.calls[0].args[1]).deepEquals({fragmentIndex: 0, lastFragmentIndex: 2})
			o(spy.calls[1].args[0]).satisfies(expectedChildB)
			o(spy.calls[1].args[1]).deepEquals({fragmentIndex: 2, lastFragmentIndex: 2})
		})
		o("can mutate in-tree elements", () => {
			const expected = matchDOM(e("div", {}, [e("a", {hasAttrs: {"data-foo": "bar"}})]))
			const actual = v("div", {}, ref(life => {
				life.asap(node => node.setAttribute("data-foo", "bar"))
				return v("a")
			}))
	
			o(actual).satisfies(expected)
		})
		o("cb isn't called when no node is rendered (returning nothing from ref)", () => {
			const asap = o.spy()
			const expectedNode = matchDOM(e("div", {}, []))
			const executor = o.spy(life => {
				life.asap(asap)
			})
			const actual = v("div", {}, ref(executor))
	
			o(actual).satisfies(expectedNode)
			o(executor.callCount).equals(1)
			o(asap.callCount).equals(0)
		})
		o("cb isn't called when no node is rendered (returning from ref an empty array)", () => {
			const asap = o.spy()
			const expectedNode = matchDOM(e("div", {}, []))
			const executor = o.spy(life => {
				life.asap(asap)
				return []
			})
			const actual = v("div", {}, ref(executor))
	
			o(actual).satisfies(expectedNode)
			o(executor.callCount).equals(1)
			o(asap.callCount).equals(0)
		})
		o("cb isn't called when no node is rendered (returning from ref an empty live zone that doesn't listen)", () => {
			const asap = o.spy()
			const expectedNode = matchDOM(e("div", {}, [e.comment()]))
			const executor = o.spy(life => {
				life.asap(asap)
				return () => {}
			})
			const actual = S.root(() => v("div", {}, ref(executor)))
	
			o(actual).satisfies(expectedNode)
			o(executor.callCount).equals(1)
			o(asap.callCount).equals(0)
		})
		o("cb isn't called when no node is rendered (returning an empty stream from ref)", () => {
			const signal = S.data()
			const asap = o.spy()
			const expectedNode = matchDOM(e("div", {}, [e.comment()]))
			const executor = o.spy(life => {
				life.asap(asap)
				return signal
			})
			const actual = S.root(() => v("div", {}, ref(executor)))
	
			o(actual).satisfies(expectedNode)
			o(executor.callCount).equals(1)
			o(asap.callCount).equals(0)
		})
	})
	o.spec("delayed oncreate", () => {
		let clientWidth
		o.beforeEach(() => {
			const cwGetter = Object.getOwnPropertyDescriptor(win.Element.prototype, "clientWidth").get
			clientWidth = o.spy(function() {cwGetter.call(this)})
			Object.defineProperty(win.Element.prototype, "clientWidth", {
				get: clientWidth, enumerable: true, configurable: true
			})
		})
		o("clientWidth sanity check", () => {
			o(clientWidth.callCount).equals(0)
			win.document.documentElement.clientWidth
			o(clientWidth.callCount).equals(1)
		})
		o.spec("life.rendered", () => {
			o("cb is called for one element (no metadata)", async () => {
				const spy = o.spy(node => {
					o(clientWidth.callCount).equals(0)
					return (node, null)
				})
				const expectedNode = matchDOM(e("div", {}, ["a"]))
				const expectedChild = matchDOM("a")
				const actual = v("div", {}, ref(life => {
					life.rendered(spy)
					return "a"
				}))
				
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(spy.callCount).equals(0)

				await nextTick()

				o(clientWidth.callCount).equals(0)
				o(spy.callCount).equals(1)
				o(spy.args.length).equals(1)
				o(spy.args[0]).satisfies(expectedChild)
			})
			o("cb is called for one element (w/ metadata)", async () => {
				const spy = o.spy((node, metadata) => {
					o(clientWidth.callCount).equals(0)
					return (node, metadata, null)
				})
				const expectedNode = matchDOM(e("div", {}, ["a"]))
				const expectedChild = matchDOM("a")
				const actual = v("div", {}, ref(life => {
					life.rendered(spy)
					return "a"
				}))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(spy.callCount).equals(0)

				await nextTick()

				o(clientWidth.callCount).equals(0)
				o(spy.callCount).equals(1)
				o(spy.args.length).equals(2)
				o(spy.args[0]).satisfies(expectedChild)
				o(spy.args[1]).deepEquals({fragmentIndex: 0, lastFragmentIndex: 0})
			})
			o("works with a fragment (no metadata)", async () => {
				const spy = o.spy(node => {
					o(clientWidth.callCount).equals(0)
					return (node, null)
				})
				const expectedNode = matchDOM(e("div", {}, ["a", "b"]))
				const expectedChildA = matchDOM("a")
				const expectedChildB = matchDOM("b")
				const actual = v("div", {}, ref(life => {
					life.rendered(spy)
					return ["a", "b"]
				}))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(spy.callCount).equals(0)

				await nextTick()

				o(clientWidth.callCount).equals(0)
				o(spy.callCount).equals(2)
				o(spy.calls[0].args.length).equals(1)
				o(spy.calls[0].args[0]).satisfies(expectedChildA)
				o(spy.calls[1].args.length).equals(1)
				o(spy.calls[1].args[0]).satisfies(expectedChildB)
			})
			o("works with a fragment (w/ metadata)", async () => {
				const spy = o.spy((node, metadata) => {
					o(clientWidth.callCount).equals(0)
					return (node, metadata, null)
				})
				const expectedNode = matchDOM(e("div", {}, ["a", "b"]))
				const expectedChildA = matchDOM("a")
				const expectedChildB = matchDOM("b")
				const actual = v("div", {}, ref(life => {
					life.rendered(spy)
					return ["a", "b"]
				}))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(spy.callCount).equals(0)

				await nextTick()

				o(clientWidth.callCount).equals(0)
				o(spy.args.length).equals(2)
				o(spy.calls[0].args[0]).satisfies(expectedChildA)
				o(spy.calls[0].args[1]).deepEquals({fragmentIndex: 0, lastFragmentIndex: 1})
				o(spy.calls[1].args[0]).satisfies(expectedChildB)
				o(spy.calls[1].args[1]).deepEquals({fragmentIndex: 1, lastFragmentIndex: 1})
			})
			o("works with a fragment (w/ metadata and an empty stream in the middle)", async() => {
				const signal = S.data()
				const spy = o.spy((node, metadata) => {
					o(clientWidth.callCount).equals(0)
					return (node, metadata, null)
				})
				const expectedNode = matchDOM(e("div", {}, ["a", e.comment(), "b"]))
				const expectedChildA = matchDOM("a")
				const expectedChildB = matchDOM("b")
				const actual = S.root(() => v("div", {}, ref(life => {
					life.rendered(spy)
					return ["a", signal, "b"]
				})))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(spy.callCount).equals(0)

				await nextTick()

				o(clientWidth.callCount).equals(0)
				o(spy.args.length).equals(2)
				o(spy.calls[0].args[0]).satisfies(expectedChildA)
				o(spy.calls[0].args[1]).deepEquals({fragmentIndex: 0, lastFragmentIndex: 2})
				o(spy.calls[1].args[0]).satisfies(expectedChildB)
				o(spy.calls[1].args[1]).deepEquals({fragmentIndex: 2, lastFragmentIndex: 2})
			})
			o("can mutate in-tree elements", async () => {
				const expected1 = matchDOM(e("div", {}, [e("a", {})]))
				const expected2 = matchDOM(e("div", {}, [e("a", {hasAttrs: {"data-foo": "bar"}})]))
				const actual = v("div", {}, ref(life => {
					life.rendered(node => node.setAttribute("data-foo", "bar"))
					return v("a")
				}))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expected1)

				await nextTick()

				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expected2)

			})
			o("cb wo/ node is called once when no node is rendered (returning nothing from ref)", async () => {
				const rendered = o.spy()
				const expectedNode = matchDOM(e("div", {}, []))
				const executor = o.spy(life => {
					life.rendered(rendered)
				})
				const actual = v("div", {}, ref(executor))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(executor.callCount).equals(1)
				o(rendered.callCount).equals(0)

				await nextTick()

				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(rendered.callCount).equals(1)
			})
			o("cb wo/ node is called when no node is rendered (returning from ref an empty array)", async () => {
				const rendered = o.spy()
				const expectedNode = matchDOM(e("div", {}, []))
				const executor = o.spy(life => {
					life.rendered(rendered)
					return []
				})
				const actual = v("div", {}, ref(executor))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(executor.callCount).equals(1)
				o(rendered.callCount).equals(0)

				await nextTick()

				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(rendered.callCount).equals(1)
			})
			o("cb wo/ node is called when no node is rendered (returning from ref an empty live zone that doesn't listen)", async () => {
				const rendered = o.spy()
				const expectedNode = matchDOM(e("div", {}, [e.comment()]))
				const executor = o.spy(life => {
					life.rendered(rendered)
					return () => {}
				})
				const actual = S.root(() => v("div", {}, ref(executor)))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(executor.callCount).equals(1)
				o(rendered.callCount).equals(0)

				await nextTick()

				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(rendered.callCount).equals(1)
			})
			o("cb wo/ node is called when no node is rendered (returning an empty stream from ref)", async () => {
				const signal = S.data()
				const rendered = o.spy()
				const expectedNode = matchDOM(e("div", {}, [e.comment()]))
				const executor = o.spy(life => {
					life.rendered(rendered)
					return signal
				})
				const actual = S.root(() => v("div", {}, ref(executor)))

				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(executor.callCount).equals(1)
				o(rendered.callCount).equals(0)

				await nextTick()

				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(rendered.callCount).equals(1)
			})
			o("cb w/ node isn't called when no node is rendered (returning nothing from ref)", async () => {
				const rendered = o.spy(node => node)
				const expectedNode = matchDOM(e("div", {}, []))
				const executor = o.spy(life => {
					life.rendered(rendered)
				})
				const actual = v("div", {}, ref(executor))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(executor.callCount).equals(1)
				o(rendered.callCount).equals(0)

				await nextTick()

				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(rendered.callCount).equals(0)
			})
			o("cb w/ node isn't called when no node is rendered (returning an empty array from ref)", async() => {
				const rendered = o.spy(node => node)
				const expectedNode = matchDOM(e("div", {}, []))
				const executor = o.spy(life => {
					life.rendered(rendered)
					return []
				})
				const actual = v("div", {}, ref(executor))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(executor.callCount).equals(1)
				o(rendered.callCount).equals(0)

				await nextTick()

				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(rendered.callCount).equals(0)
			})
			// })
			o("cb w/ node isn't called when no node is rendered (returning from ref an empty live zone that doesn't listen)", async () => {
				const rendered = o.spy(node => node)
				const expectedNode = matchDOM(e("div", {}, [e.comment()]))
				const executor = o.spy(life => {
					life.rendered(rendered)
					return () => {}
				})
				const actual = S.root(() => v("div", {}, ref(executor)))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(executor.callCount).equals(1)
				o(rendered.callCount).equals(0)

				await nextTick()

				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(rendered.callCount).equals(0)

			})
			o("cb w/ node isn't called when no node is rendered (returning an empty stream from ref)", async () => {
				const signal = S.data()
				const rendered = o.spy(node => node)
				const expectedNode = matchDOM(e("div", {}, [e.comment()]))
				const executor = o.spy(life => {
					life.rendered(rendered)
					return signal
				})
				const actual = S.root(() => v("div", {}, ref(executor)))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(executor.callCount).equals(1)
				o(rendered.callCount).equals(0)

				await nextTick()

				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(rendered.callCount).equals(0)
			})
		})
		o.spec("life.reflowed", () => {
			o("cb is called for one element (no metadata)", async () => {
				const spy = o.spy(node => {
					o(clientWidth.callCount).equals(1)
					return (node, null)
				})
				const expectedNode = matchDOM(e("div", {}, ["a"]))
				const expectedChild = matchDOM("a")
				const actual = v("div", {}, ref(life => {
					life.reflowed(spy)
					return "a"
				}))
				
				o(actual).satisfies(expectedNode)
				o(spy.callCount).equals(0)
				o(clientWidth.callCount).equals(0)
				await nextTick()
		
				o(clientWidth.callCount).equals(1)
				o(spy.callCount).equals(1)
				o(spy.args.length).equals(1)
				o(spy.args[0]).satisfies(expectedChild)
			})
			o("cb is called for one element (w/ metadata)", async () => {
				const spy = o.spy((node, metadata) => {
					o(clientWidth.callCount).equals(1)
					return (node, metadata, null)
				})
				const expectedNode = matchDOM(e("div", {}, ["a"]))
				const expectedChild = matchDOM("a")
				const actual = v("div", {}, ref(life => {
					life.reflowed(spy)
					return "a"
				}))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(spy.callCount).equals(0)
		
				await nextTick()
		
				o(clientWidth.callCount).equals(1)
				o(spy.callCount).equals(1)
				o(spy.args.length).equals(2)
				o(spy.args[0]).satisfies(expectedChild)
				o(spy.args[1]).deepEquals({fragmentIndex: 0, lastFragmentIndex: 0})
			})
			o("works with a fragment (no metadata)", async () => {
				const spy = o.spy(node => {
					o(clientWidth.callCount).equals(1)
					return (node, null)
				})
				const expectedNode = matchDOM(e("div", {}, ["a", "b"]))
				const expectedChildA = matchDOM("a")
				const expectedChildB = matchDOM("b")
				const actual = v("div", {}, ref(life => {
					life.reflowed(spy)
					return ["a", "b"]
				}))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(spy.callCount).equals(0)
		
				await nextTick()
		
				o(clientWidth.callCount).equals(1)
				o(spy.callCount).equals(2)
				o(spy.calls[0].args.length).equals(1)
				o(spy.calls[0].args[0]).satisfies(expectedChildA)
				o(spy.calls[1].args.length).equals(1)
				o(spy.calls[1].args[0]).satisfies(expectedChildB)
			})
			o("works with a fragment (w/ metadata)", async () => {
				const spy = o.spy((node, metadata) => {
					o(clientWidth.callCount).equals(1)
					return (node, metadata, null)
				})
				const expectedNode = matchDOM(e("div", {}, ["a", "b"]))
				const expectedChildA = matchDOM("a")
				const expectedChildB = matchDOM("b")
				const actual = v("div", {}, ref(life => {
					life.reflowed(spy)
					return ["a", "b"]
				}))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(spy.callCount).equals(0)
		
				await nextTick()
		
				o(clientWidth.callCount).equals(1)
				o(spy.args.length).equals(2)
				o(spy.calls[0].args[0]).satisfies(expectedChildA)
				o(spy.calls[0].args[1]).deepEquals({fragmentIndex: 0, lastFragmentIndex: 1})
				o(spy.calls[1].args[0]).satisfies(expectedChildB)
				o(spy.calls[1].args[1]).deepEquals({fragmentIndex: 1, lastFragmentIndex: 1})
			})
			o("works with a fragment (w/ metadata and an empty stream in the middle)", async() => {
				const signal = S.data()
				const spy = o.spy((node, metadata) => {
					o(clientWidth.callCount).equals(1)
					return (node, metadata, null)
				})
				const expectedNode = matchDOM(e("div", {}, ["a", e.comment(), "b"]))
				const expectedChildA = matchDOM("a")
				const expectedChildB = matchDOM("b")
				const actual = S.root(() => v("div", {}, ref(life => {
					life.reflowed(spy)
					return ["a", signal, "b"]
				})))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(spy.callCount).equals(0)
		
				await nextTick()
		
				o(clientWidth.callCount).equals(1)
				o(spy.args.length).equals(2)
				o(spy.calls[0].args[0]).satisfies(expectedChildA)
				o(spy.calls[0].args[1]).deepEquals({fragmentIndex: 0, lastFragmentIndex: 2})
				o(spy.calls[1].args[0]).satisfies(expectedChildB)
				o(spy.calls[1].args[1]).deepEquals({fragmentIndex: 2, lastFragmentIndex: 2})
			})
			o("can mutate in-tree elements", async () => {
				const expected1 = matchDOM(e("div", {}, [e("a", {})]))
				const expected2 = matchDOM(e("div", {}, [e("a", {hasAttrs: {"data-foo": "bar"}})]))
				const actual = v("div", {}, ref(life => {
					life.reflowed(node => {
						o(clientWidth.callCount).equals(1)
						node.setAttribute("data-foo", "bar")
					})
					return v("a")
				}))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expected1)
		
				await nextTick()
		
				o(clientWidth.callCount).equals(1)
				o(actual).satisfies(expected2)
		
			})
			o("cb wo/ node is called once when no node is rendered (returning nothing from ref)", async () => {
				const reflowed = o.spy()
				const expectedNode = matchDOM(e("div", {}, []))
				const executor = o.spy(life => {
					life.reflowed(reflowed)
				})
				const actual = v("div", {}, ref(executor))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(executor.callCount).equals(1)
				o(reflowed.callCount).equals(0)
		
				await nextTick()
		
				o(clientWidth.callCount).equals(1)
				o(actual).satisfies(expectedNode)
				o(reflowed.callCount).equals(1)
			})
			o("cb wo/ node is called when no node is rendered (returning from ref an empty array)", async () => {
				const reflowed = o.spy()
				const expectedNode = matchDOM(e("div", {}, []))
				const executor = o.spy(life => {
					life.reflowed(reflowed)
					return []
				})
				const actual = v("div", {}, ref(executor))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(executor.callCount).equals(1)
				o(reflowed.callCount).equals(0)
		
				await nextTick()
		
				o(clientWidth.callCount).equals(1)
				o(actual).satisfies(expectedNode)
				o(reflowed.callCount).equals(1)
			})
			o("cb wo/ node is called when no node is rendered (returning from ref an empty live zone that doesn't listen)", async () => {
				const reflowed = o.spy()
				const expectedNode = matchDOM(e("div", {}, [e.comment()]))
				const executor = o.spy(life => {
					life.reflowed(reflowed)
					return () => {}
				})
				const actual = S.root(() => v("div", {}, ref(executor)))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(executor.callCount).equals(1)
				o(reflowed.callCount).equals(0)
		
				await nextTick()
		
				o(clientWidth.callCount).equals(1)
				o(actual).satisfies(expectedNode)
				o(reflowed.callCount).equals(1)
			})
			o("cb wo/ node is called when no node is rendered (returning an empty stream from ref)", async () => {
				const signal = S.data()
				const reflowed = o.spy()
				const expectedNode = matchDOM(e("div", {}, [e.comment()]))
				const executor = o.spy(life => {
					life.reflowed(reflowed)
					return signal
				})
				const actual = S.root(() => v("div", {}, ref(executor)))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(executor.callCount).equals(1)
				o(reflowed.callCount).equals(0)
		
				await nextTick()
		
				o(clientWidth.callCount).equals(1)
				o(actual).satisfies(expectedNode)
				o(reflowed.callCount).equals(1)
			})
			o("cb w/ node isn't called when no node is rendered (returning nothing from ref)", async () => {
				const reflowed = o.spy(node => node)
				const expectedNode = matchDOM(e("div", {}, []))
				const executor = o.spy(life => {
					life.reflowed(reflowed)
				})
				const actual = v("div", {}, ref(executor))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(executor.callCount).equals(1)
				o(reflowed.callCount).equals(0)
		
				await nextTick()
		
				o(clientWidth.callCount).equals(1)
				o(actual).satisfies(expectedNode)
				o(reflowed.callCount).equals(0)
			})
			o("cb w/ node isn't called when no node is rendered (returning an empty array from ref)", async() => {
				const reflowed = o.spy(node => node)
				const expectedNode = matchDOM(e("div", {}, []))
				const executor = o.spy(life => {
					life.reflowed(reflowed)
					return []
				})
				const actual = v("div", {}, ref(executor))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(executor.callCount).equals(1)
				o(reflowed.callCount).equals(0)
		
				await nextTick()
		
				o(clientWidth.callCount).equals(1)
				o(actual).satisfies(expectedNode)
				o(reflowed.callCount).equals(0)
			})
			// })
			o("cb w/ node isn't called when no node is rendered (returning from ref an empty live zone that doesn't listen)", async () => {
				const reflowed = o.spy(node => node)
				const expectedNode = matchDOM(e("div", {}, [e.comment()]))
				const executor = o.spy(life => {
					life.reflowed(reflowed)
					return () => {}
				})
				const actual = S.root(() => v("div", {}, ref(executor)))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(executor.callCount).equals(1)
				o(reflowed.callCount).equals(0)
		
				await nextTick()
		
				o(clientWidth.callCount).equals(1)
				o(actual).satisfies(expectedNode)
				o(reflowed.callCount).equals(0)
		
			})
			o("cb w/node isn't called when no node is rendered (returning an empty stream from ref)", async () => {
				const signal = S.data()
				const reflowed = o.spy(node => node)
				const expectedNode = matchDOM(e("div", {}, [e.comment()]))
				const executor = o.spy(life => {
					life.reflowed(reflowed)
					return signal
				})
				const actual = S.root(() => v("div", {}, ref(executor)))
		
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(executor.callCount).equals(1)
				o(reflowed.callCount).equals(0)
		
				await nextTick()
		
				o(clientWidth.callCount).equals(1)
				o(actual).satisfies(expectedNode)
				o(reflowed.callCount).equals(0)
			})
			o("clientWidth is only triggered once per render cycle even if there are several reflowed calls in one executor", async () => {
				const expectedNode = matchDOM(e("div", {}, ["a", "b"]))
				const expectedChildA = matchDOM("a")
				const expectedChildB = matchDOM("b")
				// eslint-disable-next-line no-unused-vars
				const reflowed = o.spy((node, metadata) => {
					o(clientWidth.callCount).equals(1)

				})
				const executor = o.spy(life => {
					life.reflowed(reflowed)
					life.reflowed(reflowed)
					return ["a", "b"]
				})

				const actual = v("div", {}, ref(executor))
				
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(executor.callCount).equals(1)
				o(reflowed.callCount).equals(0)

				await nextTick()

				o(clientWidth.callCount).equals(1)
				o(executor.callCount).equals(1)
				o(reflowed.calls.length).equals(4)
				o(reflowed.calls[0].args[0]).satisfies(expectedChildA)
				o(reflowed.calls[0].args[1]).deepEquals({fragmentIndex: 0, lastFragmentIndex: 1})
				o(reflowed.calls[1].args[0]).satisfies(expectedChildB)
				o(reflowed.calls[1].args[1]).deepEquals({fragmentIndex: 1, lastFragmentIndex: 1})
				o(reflowed.calls[2].args[0]).satisfies(expectedChildA)
				o(reflowed.calls[2].args[1]).deepEquals({fragmentIndex: 0, lastFragmentIndex: 1})
				o(reflowed.calls[3].args[0]).satisfies(expectedChildB)
				o(reflowed.calls[3].args[1]).deepEquals({fragmentIndex: 1, lastFragmentIndex: 1})
			})
			o("clientWidth is only triggered once per render cycle even if there are several reflowed calls in several executors", async () => {
				const expectedNode = matchDOM(e("div", {}, ["a", "b", "c", "d"]))
				const expectedChildA = matchDOM("a")
				const expectedChildB = matchDOM("b")
				const expectedChildC = matchDOM("c")
				const expectedChildD = matchDOM("d")
				// eslint-disable-next-line no-unused-vars
				const reflowed = o.spy((node, metadata) => {
					o(clientWidth.callCount).equals(1)

				})
				const executor1 = o.spy(life => {
					life.reflowed(reflowed)
					life.reflowed(reflowed)
					return ["a", "b"]
				})
				const executor2 = o.spy(life => {
					life.reflowed(reflowed)
					life.reflowed(reflowed)
					return ["c", "d"]
				})

				const actual = v("div", {}, [ref(executor1), ref(executor2)])
				
				o(clientWidth.callCount).equals(0)
				o(actual).satisfies(expectedNode)
				o(executor1.callCount).equals(1)
				o(executor2.callCount).equals(1)
				o(reflowed.callCount).equals(0)

				await nextTick()

				o(clientWidth.callCount).equals(1)
				o(executor1.callCount).equals(1)
				o(executor2.callCount).equals(1)
				o(reflowed.calls.length).equals(8)
				o(reflowed.calls[0].args[0]).satisfies(expectedChildA)
				o(reflowed.calls[0].args[1]).deepEquals({fragmentIndex: 0, lastFragmentIndex: 1})
				o(reflowed.calls[1].args[0]).satisfies(expectedChildB)
				o(reflowed.calls[1].args[1]).deepEquals({fragmentIndex: 1, lastFragmentIndex: 1})
				o(reflowed.calls[2].args[0]).satisfies(expectedChildA)
				o(reflowed.calls[2].args[1]).deepEquals({fragmentIndex: 0, lastFragmentIndex: 1})
				o(reflowed.calls[3].args[0]).satisfies(expectedChildB)
				o(reflowed.calls[3].args[1]).deepEquals({fragmentIndex: 1, lastFragmentIndex: 1})
				o(reflowed.calls[4].args[0]).satisfies(expectedChildC)
				o(reflowed.calls[4].args[1]).deepEquals({fragmentIndex: 0, lastFragmentIndex: 1})
				o(reflowed.calls[5].args[0]).satisfies(expectedChildD)
				o(reflowed.calls[5].args[1]).deepEquals({fragmentIndex: 1, lastFragmentIndex: 1})
				o(reflowed.calls[6].args[0]).satisfies(expectedChildC)
				o(reflowed.calls[6].args[1]).deepEquals({fragmentIndex: 0, lastFragmentIndex: 1})
				o(reflowed.calls[7].args[0]).satisfies(expectedChildD)
				o(reflowed.calls[7].args[1]).deepEquals({fragmentIndex: 1, lastFragmentIndex: 1})
			})
		})
	})
	o.spec("removing", () => {
		o("fires and postpones removal when returning a Promise", async () => {
			const signal = S.data("true")
			const expected1 = matchDOM(e("div", {}, [e("a")]))
			const expected2 = matchDOM(e("div", {}, [e.comment(), e("a")]))
			const expected3 = matchDOM(e("div", {}, [e.comment()]))
			const expectedChild = matchDOM(e("a"))

			const removing = o.spy(node => {
				o(node).satisfies(expectedChild)
				return Promise.resolve()
			})
			const node = root(() => v("div", {}, () => signal() && ref(life => {
				life.removing(removing)
				return v("a")
			})))

			o(removing.callCount).equals(0)
			o(node).satisfies(expected1)

			signal(false)

			o(removing.callCount).equals(1)
			o(node).satisfies(expected2)

			await nextTick()
			await nextTick()

			o(removing.callCount).equals(1)
			o(node).satisfies(expected3)
		})
		o("fires and postpones removal when returning a delayed Promise", async () => {
			const signal = S.data("true")
			const expected1 = matchDOM(e("div", {}, [e("a")]))
			const expected2 = matchDOM(e("div", {}, [e.comment(), e("a")]))
			const expected3 = matchDOM(e("div", {}, [e.comment()]))
			const expectedChild = matchDOM(e("a"))
			const removing = o.spy(node => {
				o(node).satisfies(expectedChild)
				return timeout(10)
			})
			const node = root(() => v("div", {}, () => signal() && ref(life => {
				life.removing(removing)
				return v("a")
			})))

			o(removing.callCount).equals(0)
			o(node).satisfies(expected1)

			signal(false)

			o(removing.callCount).equals(1)
			o(node).satisfies(expected2)

			await nextTick()
			await nextTick()

			o(removing.callCount).equals(1)
			o(node).satisfies(expected2)

			await timeout(20)

			o(removing.callCount).equals(1)
			o(node).satisfies(expected3)
		})
		o("fires and postpones removal when returning nothing", async () => {
			const signal = S.data("true")
			const expected1 = matchDOM(e("div", {}, [e("a")]))
			const expected2 = matchDOM(e("div", {}, [e.comment(), e("a")]))
			const expected3 = matchDOM(e("div", {}, [e.comment()]))
			const expectedChild = matchDOM(e("a"))
			const removing = o.spy(node => {
				o(node).satisfies(expectedChild)
			})
			const node = root(() => v("div", {}, () => signal() && ref(life => {
				life.removing(removing)
				return v("a")
			})))

			o(removing.callCount).equals(0)
			o(node).satisfies(expected1)

			signal(false)

			o(removing.callCount).equals(1)
			o(node).satisfies(expected2)

			await nextTick()
			await nextTick()

			o(removing.callCount).equals(1)
			o(node).satisfies(expected3)
		})
		o("fires and waits for the last Promise by default", async () => {
			const expected1 = matchDOM(e("div", {}, [e("a"), e("b")]))
			const expected2 = matchDOM(e("div", {}, [e.comment(), e("a"), e("b")]))
			const expected3 = matchDOM(e("div", {}, [e.comment()]))
			const expectedChildA = matchDOM(e("a"))
			const expectedChildB = matchDOM(e("b"))

			const signal = S.data("true")
			const removingA = o.spy(node => {
				o(node).satisfies(expectedChildA)
				return timeout(30)
			})
			const removingB = o.spy(node => {
				o(node).satisfies(expectedChildB)
				return timeout(10)
			})
			const node = root(() => v("div", {}, () => signal() && [
				ref(life => {
					life.removing(removingA)
					return v("a")
				}),
				ref(life => {
					life.removing(removingB)
					return v("b")
				})
			]))

			o(removingA.callCount).equals(0)
			o(removingB.callCount).equals(0)
			o(node).satisfies(expected1)

			signal(false)

			o(removingA.callCount).equals(1)
			o(removingB.callCount).equals(1)
			o(node).satisfies(expected2)

			await nextTick()
			await nextTick()

			o(removingA.callCount).equals(1)
			o(removingB.callCount).equals(1)
			o(node).satisfies(expected2)

			await timeout(20)

			o(removingA.callCount).equals(1)
			o(removingB.callCount).equals(1)
			o(node).satisfies(expected2)

			await timeout(40)

			o(removingA.callCount).equals(1)
			o(removingB.callCount).equals(1)
			o(node).satisfies(expected3)
		})
	})
	o.spec("nested calls", () => {
		o("call removing nested from asap", async () => {
			const signal = S.data("true")
			const expected1 = matchDOM(e("div", {}, [e("a")]))
			const expected2 = matchDOM(e("div", {}, [e.comment(), e("a")]))
			const expected3 = matchDOM(e("div", {}, [e.comment()]))
			const expectedChild = matchDOM(e("a"))
			let removing
			let asap
			const node = root(() => v("div", {}, () => signal() && ref(life => {
				asap = o.spy(child => {
					o(child).satisfies(expectedChild)
					removing = o.spy(() => Promise.resolve())
					life.removing(removing)
				})
				life.asap(asap)
				return v("a")
			})))

			o(asap.callCount).equals(1)
			o(removing.callCount).equals(0)
			o(node).satisfies(expected1)

			signal(false)

			o(removing.callCount).equals(1)
			o(node).satisfies(expected2)

			await nextTick()
			await nextTick()

			o(removing.callCount).equals(1)
			o(node).satisfies(expected3)
		})
		o("call removing nested from rendered", async () => {
			const signal = S.data("true")
			const expected1 = matchDOM(e("div", {}, [e("a")]))
			const expected2 = matchDOM(e("div", {}, [e.comment(), e("a")]))
			const expected3 = matchDOM(e("div", {}, [e.comment()]))
			const expectedChild = matchDOM(e("a"))
			let removing
			let rendered
			const node = root(() => v("div", {}, () => signal() && ref(life => {
				rendered = o.spy(child => {
					o(child).satisfies(expectedChild)
					removing = o.spy(() => Promise.resolve())
					life.removing(removing)
				})
				life.rendered(rendered)
				return v("a")
			})))

			o(rendered.callCount).equals(0)

			await nextTick()

			o(rendered.callCount).equals(1)
			o(removing.callCount).equals(0)
			o(node).satisfies(expected1)

			signal(false)

			o(removing.callCount).equals(1)
			o(node).satisfies(expected2)

			await nextTick()
			await nextTick()

			o(removing.callCount).equals(1)
			o(node).satisfies(expected3)
		})
	})
})
