import o from "ospec"
import {S, V, setWindow as setVellaWindow, v} from "../../index.js"
import {cacheDelay} from "../../src/v.js"
import {e, matchDOM, setWindow as setMDWindow} from "../../test-util/matchDOM.js"
import {refreshWindow, win} from "../test-setup.js"

o.spec("hyperscript", () => {
	let createEl
	o.beforeEach(() => {
		refreshWindow()
		setVellaWindow(win)
		setMDWindow(win)
		createEl = win.document.createElement.bind(win.document)
	})
	o.spec("common for v and V", () => {
		void [{v}, {V}].forEach((x) => {
			const [[name, v]] = Object.entries(x)
			o.spec(name, () => {
				o.spec("invalid first argument", () => {
					// sanity check before diving in
					o("binding null as context with a valid selector", () => {
						const actual = v.bind(null, "a")()
						const expected = e("a")

						o(actual).satisfies(matchDOM(expected))
					})

					o("throws when called with no arguments", () => {
						o(v).throws(Error)
					})
					o("throws on undefined argument", () => {
						o(v.bind(null, undefined)).throws(Error)
					})
					o("throws on null argument", () => {
						o(v.bind(null, null)).throws(Error)
					})
					o("throws on number argument", () => {
						o(v.bind(null, 3)).throws(Error)
					})
					o("throws on true argument", () => {
						o(v.bind(null, true)).throws(Error)
					})
					o("throws on false argument", () => {
						o(v.bind(null, false)).throws(Error)
					})
					o("throws on object argument", () => {
						o(v.bind(null, {})).throws(Error)
					})
					o("throws on element argument", () => {
						o(v.bind(null, win.document.createElement("a"))).throws(Error)
					})
				})
				o.spec("selector", () => {
					o("cache param sanity check", () => {
						// if this changes, `oc` must also be rethought.
						o(cacheDelay).equals(1)
					})
					function _3times(fn) {
						// the first two times, fresh elements are created.
						// the thrird time it is cached and cloned
						// from then on it is just cloned
						["first", "second", "third"].forEach((n) => {fn(n + " time")})
					}
					o("handles tagName in selector", () => {
						_3times((nth) => {
							const actual = v("a")
							const expected = e("a")
				
							o(actual).satisfies(matchDOM(expected))(nth)
						})
					})
					o("handles class in selector", () => {
						_3times((nth) => {
							const actual = v(".a")
							const expected = e("div", {hasAttrs: {class: "a"}})
				
							o(actual).satisfies(matchDOM(expected))(nth)
						})
					})
					o("handles many classes in selector", () => {
						_3times((nth) => {
							const actual = v(".a.b.c")
							const expected = e("div", {hasAttrs: {class: "a b c"}})
				
							o(actual).satisfies(matchDOM(expected))(nth)
						})
					})
					o("handles id in selector", () => {
						_3times((nth) => {
							const actual = v("#a")
							const expected = e("div", {hasAttrs:{id: "a"}})
				
							o(actual).satisfies(matchDOM(expected))(nth)
						})
					})
					o("handles attr in selector", () => {
						_3times((nth) => {
							const actual = v("[a=b]")
							const expected = e("div", {hasAttrs:{a: "b"}})
				
							o(actual).satisfies(matchDOM(expected))(nth)
						})
					})
					o("handles many attrs in selector", () => {
						_3times((nth) => {
							const actual = v("[a=b][c=d]")
							const expected = e("div", {hasAttrs:{a: "b", c: "d"}})
				
							o(actual).satisfies(matchDOM(expected))(nth)
						})
					})
					o("handles attr w/ spaces in selector", () => {
						_3times((nth) => {
							const actual = v("[a = b]")
							const expected = e("div", {hasAttrs:{a: "b"}})
				
							o(actual).satisfies(matchDOM(expected))(nth)
						})
					})
					o("handles attr w/ quotes in selector", () => {
						_3times((nth) => {
							const actual = v("[a='b']")
							const expected = e("div", {hasAttrs:{a: "b"}})
				
							o(actual).satisfies(matchDOM(expected))(nth)
						})
					})
					o("handles attr w/ quoted square bracket", () => {
						_3times((nth) => {
							const actual = v("[x][a='[b]'].c")
							const expected = e("div", {
								hasAttrs:{
									a: "[b]",
									x: "",
									class: "c"
								}
							})
				
							o(actual).satisfies(matchDOM(expected))(nth)
						})
					})
					o("handles attr w/ unmatched square bracket", () => {
						_3times((nth) => {
							const actual = v("[a=']'].c")
							const expected = e("div", {
								hasAttrs:{
									a: "]",
									class: "c"
								}
							})
				
							o(actual).satisfies(matchDOM(expected))(nth)
						})
					})
					o("handles attr w/ quoted square bracket and quote", () => {
						_3times((nth) => {
							// eslint-disable-next-line quotes
							const actual = v(`[a='[b"\\']'].c`)
							const expected = e("div", {
								hasAttrs:{
									// eslint-disable-next-line quotes
									a: `[b"']`,
									class: "c"
								}
							})
				
							o(actual).satisfies(matchDOM(expected))(nth)
						})
					})
					o("handles attr w/ quoted square containing escaped square bracket", () => {
						_3times((nth) => {
							const actual = v("[a='[\\]]'].c") // `[a='[\]]']`
							const expected = e("div", {
								hasAttrs:{
									a: "[\\]]",
									class: "c"
								}
							})
						
							o(actual).satisfies(matchDOM(expected))(nth)
						})
					})
					o("handles attr w/ backslashes", () => {
						_3times((nth) => {
							const actual = v("[a='\\\\'].c") // `[a='\\']`
							const expected = e("div", {
								hasAttrs:{
									a: "\\",
									class: "c"
								}
							})
						
							o(actual).satisfies(matchDOM(expected))(nth)
						})
					})
					o("handles attr w/ quotes and spaces in selector", () => {
						_3times((nth) => {
							const actual = v("[a = 'b']")
							const expected = e("div", {
								hasAttrs:{
									a: "b"
								}
							})
						
							o(actual).satisfies(matchDOM(expected))(nth)
						})
					})
					o("handles many attr w/ quotes and spaces in selector", () => {
						_3times((nth) => {
							const actual = v("[a = 'b'][c = 'd']")
						
							const expected = e("div", {
								hasAttrs:{
									a: "b",
									c: "d"
								}
							})
						
							o(actual).satisfies(matchDOM(expected))(nth)
						})
					})
					o("handles tag, class, attrs in selector", () => {
						_3times((nth) => {
							const actual = v("a.b[c = 'd']")
							const expected = e("a", {
								hasAttrs:{
									class: "b",
									c: "d"
								}
							})
						
							o(actual).satisfies(matchDOM(expected))(nth)
						})
					})
					o("handles tag, mixed classes, attrs in selector", () => {
						_3times((nth) => {
							const actual = v("a.b[c = 'd'].e[f = 'g']")
							const expected = e("a", {
								hasAttrs:{
									class: "b e",
									c: "d",
									f: "g"
								}
							})
						
							o(actual).satisfies(matchDOM(expected))(nth)
						})
					})
					o("handles attr without value", () => {
						_3times((nth) => {
							const actual = v("[a]")
							const expected = e("div", {
								hasAttrs:{
									a: ""
								}
							})
						
							o(actual).satisfies(matchDOM(expected))(nth)
						})
					})
					o("handles explicit empty string value for input", () => {
						_3times((nth) => {
							const actual = v('input[value=""]')
							const expected = e("input", {
								hasProps:{
									value: ""
								}
							})
						
							o(actual).satisfies(matchDOM(expected))(nth)
						})
					})
					o("handles explicit empty string value for option", () => {
						_3times((nth) => {
							const actual = v('option[value=""]')
							const expected = e("option", {
								hasAttrs:{
									value: ""
								}
							})
						
							o(actual).satisfies(matchDOM(expected))(nth)
						})
					})
						
					//  class and className normalization here?

			
				})
				o.spec("attrs", function() {
					o("handles string attr", function() {
						const element = v("div", {a: "b"})
			
						o(element.tagName).equals("DIV")
						o(element.getAttribute("a")).equals("b")
					})
					o("handles falsy string attr", function() {
						const element = v("div", {a: ""})
			
						o(element.tagName).equals("DIV")
						o(element.getAttribute("a")).equals("")
					})
					o("handles number attr", function() {
						const element = v("div", {a: 1})
			
						o(element.tagName).equals("DIV")
						o(element.getAttribute("a")).equals("1")
					})
					o("handles falsy number attr", function() {
						const element = v("div", {a: 0})
			
						o(element.tagName).equals("DIV")
						o(element.getAttribute("a")).equals("0")
					})
					o("handles boolean attr", function() {
						const element = v("div", {a: true})
			
						o(element.tagName).equals("DIV")
						o(element.getAttribute("a")).equals("true")
					})
					o("handles falsy boolean attr", function() {
						const element = v("div", {a: false})
			
						o(element.tagName).equals("DIV")
						o(element.getAttribute("a")).equals("false")
					})
					o("handles many attrs", function() {
						const element = v("div", {a: "b", c: "d"})
			
						o(element.tagName).equals("DIV")
						o(element.getAttribute("a")).equals("b")
						o(element.getAttribute("c")).equals("d")
					})
					o("handles className attrs property", function() {
						const element = v("div", {className: "a"})
			
						o(element.className).equals("a")
					})
					o("handles 'class' as a verbose attribute declaration", function() {
						const element = v("[class=a b]")
			
						o(element.className).equals("a b")
					})
					o("handles merging classes w/ class property", function() {
						const element = v(".a", {class: "b"})
			
						o(element.className).equals("a b")
					})
					o("handles merging classes w/ className property", function() {
						const element = v(".a", {className: "b"})
			
						o(element.className).equals("a b")
					})
				})
				o.spec("custom element attrs", function() {
					o("handles string attr", function() {
						const element = v("custom-element", {a: "b"})
			
						o(element.tagName).equals("CUSTOM-ELEMENT")
						o(element.getAttribute("a")).equals("b")
					})
					o("handles falsy string attr", function() {
						const element = v("custom-element", {a: ""})
			
						o(element.tagName).equals("CUSTOM-ELEMENT")
						o(element.getAttribute("a")).equals("")
					})
					o("handles number attr", function() {
						const element = v("custom-element", {a: 1})
			
						o(element.tagName).equals("CUSTOM-ELEMENT")
						o(element.getAttribute("a")).equals("1")
					})
					o("handles falsy number attr", function() {
						const element = v("custom-element", {a: 0})
			
						o(element.tagName).equals("CUSTOM-ELEMENT")
						o(element.getAttribute("a")).equals("0")
					})
					o("handles boolean attr", function() {
						const element = v("custom-element", {a: true})
			
						o(element.tagName).equals("CUSTOM-ELEMENT")
						o(element.getAttribute("a")).equals("true")
					})
					o("handles falsy boolean attr", function() {
						const element = v("custom-element", {a: false})
			
						o(element.tagName).equals("CUSTOM-ELEMENT")
						o(element.getAttribute("a")).equals("false")
					})
					o("handles many attrs", function() {
						const element = v("custom-element", {a: "b", c: "d"})
			
						o(element.tagName).equals("CUSTOM-ELEMENT")
						o(element.getAttribute("a")).equals("b")
						o(element.getAttribute("c")).equals("d")
					})
					o("handles className attrs property", function() {
						const element = v("custom-element", {className: "a"})
			
						o(element.className).equals("a")
					})
					o("casts className using toString like browsers", function() {
						const className = {
							valueOf: () => ".valueOf",
							toString: () => "toString"
						}
						const element = v("custom-element" + className, {className: className})
						o(element.className).equals("valueOf toString")
					})
				})
				o.spec("childNodes", function() {
					// TODO: use bare values, not arrays as children
					o("handles string single child unwrapped", function() {
						const element = v("div", {}, "a")

						o(element.textContent).equals("a")
					})
					o("handles string single child", function() {
						const element = v("div", {}, "a")

						o(element.textContent).equals("a")
					})
					o("handles falsy string single child unwrapped", function() {
						const element = v("div", {}, "")
			
						o(element.textContent).equals("")
					})
					o("handles falsy string single child", function() {
						const element = v("div", {}, [""])
			
						o(element.textContent).equals("")
					})
					o("handles number single child unwrapped", function() {
						const element = v("div", {}, 1)
			
						o(element.textContent).equals("1")
					})
					o("handles number single child", function() {
						const element = v("div", {}, [1])
			
						o(element.textContent).equals("1")
					})
					o("handles falsy number single child unwrapped", function() {
						const element = v("div", {}, 0)
			
						o(element.textContent).equals("0")
					})
					o("handles falsy number single child", function() {
						const element = v("div", {}, [0])
			
						o(element.textContent).equals("0")
					})
					o("handles boolean single child unwrapped", function() {
						const element = v("div", {}, true)
			
						o(element.childNodes.length).equals(0)
					})
					o("handles boolean single child", function() {
						const element = v("div", {}, [true])
			
						o(element.childNodes.length).equals(0)
					})
					o("handles falsy boolean single child unwrapped", function() {
						const element = v("div", {}, false)
			
						o(element.childNodes.length).equals(0)
					})
					o("handles falsy boolean single child", function() {
						const element = v("div", {}, [false])
			
						o(element.childNodes.length).equals(0)
					})
					o("handles null single child unwrapped", function() {
						const element = v("div", {}, null)
			
						o(element.childNodes.length).equals(0)
					})
					o("handles null single child", function() {
						const element = v("div", {}, [null])
			
						o(element.childNodes.length).equals(0)
					})
					o("handles undefined single child unwrapped", function() {
						const element = v("div", {}, undefined)
			
						o(element.childNodes.length).equals(0)
					})
					o("handles undefined single child", function() {
						const element = v("div", {}, [undefined])
			
						o(element.childNodes.length).equals(0)
					})
					o("handles multiple string childNodes", function() {
						const element = v("div", {}, ["", "a"])
						const children = element.childNodes || []
			
						if (children.length) {
							o(children[0].textContent).equals("")
							o(children[1].textContent).equals("a")
						}
					})
					o("handles multiple number childNodes", function() {
						const element = v("div", {}, [0, 1])
			
						const children = element.childNodes || []
			
						o(children[0].nodeType).equals(3)
						o(children[0].textContent).equals("0")
						o(children[0].nodeType).equals(3)
						o(children[1].textContent).equals("1")
					})
					o("handles multiple boolean childNodes", function() {
						const element = v("div", {}, [false, true])
			
						o(element.childNodes.length).equals(0)
						//o(element.childNodes).deepEquals([null, null])
					})
					o("handles multiple null/undefined child", function() {
						const element = v("div", {}, [null, undefined])
			
						o(element.childNodes.length).equals(0)
						//o(element.childNodes).deepEquals([null, null])
					})
					o("handles falsy number single child without attrs", function() {
						const element = v("div", {}, 0)
			
						o(element.textContent).equals("0")
					})
				})
				o.spec("permutations", function() {
					o("handles null attr and childNodes", function() {
						const element = v("div", null, [v("a"), v("b")])
						const children = element.childNodes || []
			
						if (children.length) {
							o(children.length).equals(2)
							o(children[0].tagName).equals("A")
							o(children[1].tagName).equals("B")
						}
					})
					o("handles null attr and child unwrapped", function() {
						const element = v("div", null, v("a"))
						const children = element.childNodes || []
			
						if (children.length) {
							o(children.length).equals(1)
							o(children[0].tagName).equals("A")
						}
					})
					o("handles attr and childNodes", function() {
						const element = v("div", {a: "b"}, [v("i"), v("s")])
			
						o(element.getAttribute("a")).equals("b")
						const children = element.childNodes || []
			
						if (children.length) {
							o(children[0].tagName).equals("I")
							o(children[1].tagName).equals("S")
						}
					})
					o("handles attr and child unwrapped", function() {
						const element = v("div", {a: "b"}, v("i"))
			
						o(element.getAttribute("a")).equals("b")
						const children = element.childNodes || []
			
						if (children.length) {
							o(children[0].tagName).equals("I")
						}
					})
					o("handles attr and text childNodes", function() {
						const element = v("div", {a: "b"}, ["c", "d"])
			
						o(element.getAttribute("a")).equals("b")
						const children = element.childNodes || []
			
						if (children.length) {
							o(children[0].textContent).equals("c")
							o(children[1].textContent).equals("d")
						}
					})
					o("handles attr and single string text child", function() {
						const element = v("div", {a: "b"}, ["c"])
			
						o(element.getAttribute("a")).equals("b")
						o(element.textContent).equals("c")
					})
					o("handles attr and single falsy string text child", function() {
						const element = v("div", {a: "b"}, [""])
			
						o(element.getAttribute("a")).equals("b")
						o(element.textContent).equals("")
					})
					o("handles attr and single number text child", function() {
						const element = v("div", {a: "b"}, [1])
			
						o(element.getAttribute("a")).equals("b")
						o(element.textContent).equals("1")
					})
					o("handles attr and single falsy number text child", function() {
						const element = v("div", {a: "b"}, [0])
			
						o(element.getAttribute("a")).equals("b")
						o(element.textContent).equals("0")
					})
					o("handles attr and single boolean text child", function() {
						const element = v("div", {a: "b"}, [true])
			
						o(element.getAttribute("a")).equals("b")
						const children = element.childNodes || []
						o(children.length).equals(0)
					})
					o("handles attr and single falsy boolean text child", function() {
						const element = v("div", {a: "b"}, [0])
			
						o(element.getAttribute("a")).equals("b")
						o(element.textContent).equals("0")
					})
					o("handles attr and single false boolean text child", function() {
						const element = v("div", {a: "b"}, [false])
			
						o(element.getAttribute("a")).equals("b")
						const children = element.childNodes || []
						o(children.length).equals(0)
						//o(children).deepEquals([null])
					})
					o("handles attr and single text child unwrapped", function() {
						const element = v("div", {a: "b"}, "c")
			
						o(element.getAttribute("a")).equals("b")
						o(element.textContent).equals("c")
					})
					o("handles shared attrs", function() {
						const attrs = {a: "b"}
			
						const nodeA = v(".a", attrs)
						const nodeB = v(".b", attrs)
			
						o(nodeA.className).equals("a")
						o(nodeA.getAttribute("a")).equals("b")
			
						o(nodeB.className).equals("b")
						o(nodeB.getAttribute("a")).equals("b")
					})
					o("doesnt modify passed attributes object", function() {
						const attrs = {a: "b"}
						v(".a", attrs)
						o(attrs).deepEquals({a: "b"})
					})
					o("non-nullish attr takes precedence over selector", function() {
					})
					o("null attr takes precedence over selector", function() {
						o(v("[a=b]", {a: null}).getAttribute("a")).equals(null)
					})
					o("undefined attr takes precedence over selector", function() {
						o(v("[a=b]", {a: undefined}).getAttribute("a")).equals(null)
					})
					o("handles childNodes with nested array", function() {
						const element = v("div", {}, [[v("i"), v("s")]])
						const children = element.childNodes || []
						if (children.length) {
							o(children[0].tagName).equals("I")
							o(children[1].tagName).equals("S")
						}
					})
					o("handles childNodes with deeply nested array", function() {
						const element = v("div", {}, [[[v("i"), v("s")]]])
						const children = element.childNodes || []
						if (children.length) {
							o(children[0].tagName).equals("I")
							o(children[1].tagName).equals("S")
						}
					})
				})
				o.spec("components", () => {
					o("works without attrs or children", () => {
						const cmp = o.spy(function() {return 5})
						const bound = v(cmp)

						o(typeof bound).equals("function")
						
						const res = bound()

						o(res).equals(5)
						o(cmp.callCount).equals(1)
						if (v === V) {
							o(cmp.args).deepEquals([{}, undefined])
						} else {
							o(cmp.args).deepEquals([{}, [undefined]])
						}
					})
					o("works with attrs", () => {
						const cmp = o.spy(function() {return 5})
						const attrs = {a: 6}
						const bound = v(cmp, attrs)

						o(typeof bound).equals("function")
						
						const res = bound()

						o(res).equals(5)
						o(cmp.callCount).equals(1)
						o(cmp.args[0]).equals(attrs)
						if (v === V) {
							o(cmp.args[1]).equals(undefined)
						} else {
							o(cmp.args[1]).deepEquals([])
						}
					})
					o("works with attrs and children", () => {
						const cmp = o.spy(function() {return 5})
						const attrs = {a: 6}
						const children = 5
						const bound = v(cmp, attrs, children)

						o(typeof bound).equals("function")
						
						const res = bound()

						o(res).equals(5)
						o(cmp.callCount).equals(1)
						o(cmp.args[0]).equals(attrs)
						if (v === V) {
							o(cmp.args[1]).equals(5)
						} else {
							o(cmp.args[1]).deepEquals([5])
						}
					})
					o.spec("components", function() {
						o("accepts functions but doesn't call them", () => {
							const spy = o.spy()
							v(spy)
	
							o(spy.callCount).equals(0)
						})
						o("works when it returns nothing; default params", () => {
							const spy = o.spy(() => {})
							const actual = v("div", {}, ["a", v(spy), "z"])
							const expected = e("div", {}, ["a", "z"])
	
							o(spy.callCount).equals(1)
							o(spy.args[0]).deepEquals({})

							if (v === V) o(spy.args[1]).equals(undefined)
							else o(spy.args[1]).deepEquals([undefined])
							
							o(actual).satisfies(matchDOM(expected))
						})
						o("emits its return value (text node) in the right position", () => {
							const spy = o.spy(() => "b")
							const actual = v("div", {}, ["a", v(spy), "z"])
							const expected = e("div", {}, ["a", "b", "z"])
	
							o(spy.callCount).equals(1)
							o(actual).satisfies(matchDOM(expected))
						})
						o("emits its return value (fragment of one text node) in the right position", () => {
							const spy = o.spy(() => ["b"])
							const actual = v("div", {}, ["a", v(spy), "z"])
							const expected = e("div", {}, ["a", "b", "z"])
	
							o(spy.callCount).equals(1)
							o(actual).satisfies(matchDOM(expected))
						})
						o("emits its return value (fragment of two text nodes) in the right position", () => {
							const spy = o.spy(() => ["b", "c"])
							const actual = v("div", {}, ["a", v(spy), "z"])
							const expected = e("div", {}, ["a", "b", "c", "z"])
	
							o(spy.callCount).equals(1)
							o(actual).satisfies(matchDOM(expected))
						})
						o("two components in a row emit their return values adequately", () => {
							const spyb = o.spy(() => "b")
							const spyB = o.spy(() => ["b"])
							const spyBC = o.spy(() => ["b", "c"])
							const spyCD = o.spy(() => ["c", "d"])
							const spyD = o.spy(() => ["d"])
							const spyd = o.spy(() => "d")

							const actual1 = v("div", {}, ["a", v(spyb), v(spyCD), "z"])
							const actual2 = v("div", {}, ["a", v(spyB), v(spyCD), "z"])
							const actual3 = v("div", {}, ["a", v(spyBC), v(spyD), "z"])
							const actual4 = v("div", {}, ["a", v(spyBC), v(spyd), "z"])

							const expected = e("div", {}, ["a", "b", "c", "d", "z"])
	
							o(spyb.callCount).equals(1)
							o(spyB.callCount).equals(1)
							o(spyBC.callCount).equals(2)
							o(spyCD.callCount).equals(2)
							o(spyD.callCount).equals(1)
							o(spyd.callCount).equals(1)
					
							o(actual1).satisfies(matchDOM(expected))("b, [c, d]")
							o(actual2).satisfies(matchDOM(expected))("[b], [c, d]")
							o(actual3).satisfies(matchDOM(expected))("[b, c], [d]")
							o(actual4).satisfies(matchDOM(expected))("[b, c], d")
						})
						o("attrs are passed", () => {
							const attrs = {}
							const spy = o.spy()
							v("div", {}, v(spy, attrs))

							o(spy.callCount).equals(1)
							o(spy.args[0]).equals(attrs)
						})
						o("element child is passed", () => {
							const attrs = {}
							const child = createEl("div")
							const spy = o.spy()
							v("div", {}, v(spy, attrs, child))

							o(spy.callCount).equals(1)
							o(spy.args[0]).equals(attrs)
							if (v === V) o(spy.args[1]).equals(child)
							else {
								o(Array.isArray(spy.args[1])).equals(true)("got " + typeof spy.args[1])
								o(spy.args[1].length).equals(1)
								o(spy.args[1][0]).equals(child)
							}
						})
						o("text child is passed", () => {
							const attrs = {}
							const child = "text"
							const spy = o.spy()
							v("div", {}, v(spy, attrs, child))

							o(spy.callCount).equals(1)
							o(spy.args[0]).equals(attrs)
							if (v === V) o(spy.args[1]).equals(child)
							else {
								o(Array.isArray(spy.args[1])).equals(true)("got " + typeof spy.args[1])
								o(spy.args[1].length).equals(1)
								o(spy.args[1][0]).equals(child)
							}
						})
						o("several element children", () => {
							const attrs = {}
							const child1 = createEl("div")
							const child2 = createEl("div")
							const spy = o.spy()
							const cmp = v === V ? v(spy, attrs, [child1, child2]) : v(spy, attrs, child1, child2)
							v("div", {}, cmp)
							o(spy.callCount).equals(1)
							o(spy.args[0]).equals(attrs)
							o(spy.args[1]).deepEquals([child1, child2])
						})
						o("several text children", () => {
							const attrs = {}
							const child1 = "text1"
							const child2 = "text2"
							const spy = o.spy()
							const cmp = v === V ? v(spy, attrs, [child1, child2]) : v(spy, attrs, child1, child2)
							v("div", {}, cmp)
							o(spy.callCount).equals(1)
							o(spy.args[0]).equals(attrs)
							o(spy.args[1]).deepEquals([child1, child2])
						})
					})
				})
			})
		})
	})
	o.spec("v only, attrs vs children detection", () => {
		o("handles null attr and childNodes unwrapped", function() {
			const element = v("div", null, v("a"), v("b"))
			const children = element.childNodes || []

			if (children.length) {
				o(children.length).equals(2)
				o(children[0].tagName).equals("A")
				o(children[1].tagName).equals("B")
			}
		})
		o("handles attr and childNodes unwrapped", function() {
			const element = v("div", {a: "b"}, v("i"), v("s"))
	
			o(element.getAttribute("a")).equals("b")
			const children = element.childNodes || []
	
			if (children.length) {
				o(children[0].tagName).equals("I")
				o(children[1].tagName).equals("S")
			}
		})
		o("handles attr and text childNodes unwrapped", function() {
			const element = v("div", {a: "b"}, "c", "d")
	
			o(element.getAttribute("a")).equals("b")
			const children = element.childNodes || []
	
			if (children.length) {
				o(children[0].textContent).equals("c")
				o(children[1].textContent).equals("d")
			}
		})
		o("handles childNodes without attr", function() {
			const {children} = v("div", [v("i"), v("s")])
		
			o(children[0].tagName).equals("I")
			o(children[1].tagName).equals("S")
		})
		o("handles child without attr unwrapped", function() {
			const {children} = v("div", v("i"))
		
			o(children[0].tagName).equals("I")
		})
		o("handles childNodes without attr unwrapped", function() {
			const {children} = v("div", v("i"), v("s"))
		
			o(children[0].tagName).equals("I")
			o(children[1].tagName).equals("S")
		})
		o("handles fragment childNodes without attr unwrapped", function() {
			const element = v("div", [v("i")], [v("s")])
		
			o(element.children[0].tagName).equals("I")
			o(element.children[1].tagName).equals("S")
		})

		o("handles null attr and text children unwrapped", function() {
			const actual = v("div", null, "a", "b")
			const expected = e("div", {}, ["a", "b"])

			o(actual).satisfies(matchDOM(expected))
		})
		o("handles attr and text children unwrapped", function() {
			const actual = v("div", {a: "b"}, "c", "d")
			const expected = e("div", {hasAttrs:{a: "b"}}, ["c", "d"])

			o(actual).satisfies(matchDOM(expected))
		})
		o("handles text children in array without attr", function() {
			const actual = v("div", ["a", "b"])
			const expected = e("div", {}, ["a", "b"])

			o(actual).satisfies(matchDOM(expected))
		})
		o("handles text child without attr unwrapped", function() {
			const actual = v("div", "a")
			const expected = e("div", {}, ["a"])

			o(actual).satisfies(matchDOM(expected))
		})
		o("handles  text children without attr unwrapped", function() {
			const actual = v("div", "a", "b")
			const expected = e("div", {}, ["a", "b"])

			o(actual).satisfies(matchDOM(expected))
		})
		o("handles fragments of text without attr unwrapped", function() {
			const actual = v("div", ["a"], ["b"])
			const expected = e("div", {}, ["a", "b"])

			o(actual).satisfies(matchDOM(expected))
		})

		o("handles null attr and component children unwrapped", function() {
			const actual = v("div", null, v(() => "a"), v(() => "b"))
			const expected = e("div", {}, ["a", "b"])

			o(actual).satisfies(matchDOM(expected))
		})
		o("handles attr and component children unwrapped", function() {
			const actual = v("div", {a: "b"}, v(() => "c"), v(() => "d"))
			const expected = e("div", {hasAttrs:{a: "b"}}, ["c", "d"])

			o(actual).satisfies(matchDOM(expected))
		})
		o("handles component children in array without attr", function() {
			const actual = v("div", [v(() => "a"), v(() => "b")])
			const expected = e("div", {}, ["a", "b"])

			o(actual).satisfies(matchDOM(expected))
		})
		o("handles component child without attr unwrapped", function() {
			const actual = v("div", v(() => "a"))
			const expected = e("div", {}, ["a"])

			o(actual).satisfies(matchDOM(expected))
		})
		o("handles  component children without attr unwrapped", function() {
			const actual = v("div", v(() => "a"), v(() => "b"))
			const expected = e("div", {}, ["a", "b"])

			o(actual).satisfies(matchDOM(expected))
		})
		o("handles fragments of components without attr unwrapped", function() {
			const actual = v("div", [v(() => "a")], [v(() => "b")])
			const expected = e("div", {}, ["a", "b"])

			o(actual).satisfies(matchDOM(expected))
		})

		o("handles null attr and live zone children unwrapped", function() {
			const actual = S.root(() => v("div", null, () => "a", () => "b"))
			const expected = e("div", {}, ["a", "b"])
		
			o(actual).satisfies(matchDOM(expected))
		})
		o("handles attr and live zone children unwrapped", function() {
			const actual = S.root(() => v("div", {a: "b"}, () => "c", () => "d"))
			const expected = e("div", {hasAttrs:{a: "b"}}, ["c", "d"])
		
			o(actual).satisfies(matchDOM(expected))
		})
		o("handles live zone children in array without attr", function() {
			const actual = S.root(() => v("div", [() => "a", () => "b"]))
			const expected = e("div", {}, ["a", "b"])
		
			o(actual).satisfies(matchDOM(expected))
		})
		o("handles live zone child without attr unwrapped", function() {
			const actual = S.root(() => v("div", () => "a"))
			const expected = e("div", {}, ["a"])
		
			o(actual).satisfies(matchDOM(expected))
		})
		o("handles  live zone children without attr unwrapped", function() {
			const actual = S.root(() => v("div", () => "a", () => "b"))
			const expected = e("div", {}, ["a", "b"])
		
			o(actual).satisfies(matchDOM(expected))
		})
		o("handles fragments of live zones without attr unwrapped", function() {
			const actual = S.root(() => v("div", [() => "a"], [() => "b"]))
			const expected = e("div", {}, ["a", "b"])
		
			o(actual).satisfies(matchDOM(expected))
		})
	})
})
