import o from "ospec"
import {V, setWindow as setVellaWindow, v} from "../../index.js"
import jsdom from "jsdom"

// import {e, matchDOM, setWindow as setMDWindow} from "../../test-util/matchDOM.js"
// TODO: test both `v` and `V` where it makes sense.

o.spec("hyperscript", () => {
	let win
	o.beforeEach(() => {
		win = new jsdom.JSDOM().window
		setVellaWindow(win)
		// setMDWindow(win)
	})
	o.spec("common for v and V", () => {
		[{v}, {V}].forEach((x) => {
			const [[name, v]] = Object.entries(x)
			o.spec(name, () => {
				o.spec("selector", () => {
					o("throws when called with no arguments", () => {
						o(v).throws(Error)
					})
					o("throws on undefined selector", () => {
						o(v.bind(null, undefined)).throws(Error)
					})
					o("throws on null selector", () => {
						o(v.bind(null, null)).throws(Error)
					})
					o("throws on number selector", () => {
						o(v.bind(null, 3)).throws(Error)
					})
					o("throws on true selector", () => {
						o(v.bind(null, true)).throws(Error)
					})
					o("throws on false selector", () => {
						o(v.bind(null, false)).throws(Error)
					})
					o("throws on object selector", () => {
						o(v.bind(null, {})).throws(Error)
					})
					o("throws on element selector", () => {
						o(v.bind(null, win.document.createElement("a"))).throws(Error)
					})
					o("handles tagName in selector", () => {
						const element = v("a")
						o(element.tagName).equals("A")
					})
					o("handles class in selector", function() {
						const element = v(".a")
			
						o(element.tagName).equals("DIV")
						o(element.className).equals("a")
					})
					o("handles many classes in selector", function() {
						const element = v(".a.b.c")
			
						o(element.tagName).equals("DIV")
						o(element.className).equals("a b c")
					})
					o("handles id in selector", function() {
						const element = v("#a")
			
						o(element.tagName).equals("DIV")
						o(element.id).equals("a")
					})
					o("handles attr in selector", function() {
						const element = v("[a=b]")
			
						o(element.tagName).equals("DIV")
						o(element.getAttribute("a")).equals("b")
					})
					o("handles many attrs in selector", function() {
						const element = v("[a=b][c=d]")
			
						o(element.tagName).equals("DIV")
						o(element.getAttribute("a")).equals("b")
						o(element.getAttribute("c")).equals("d")
					})
					o("handles attr w/ spaces in selector", function() {
						const element = v("[a = b]")
			
						o(element.tagName).equals("DIV")
						o(element.getAttribute("a")).equals("b")
					})
					o("handles attr w/ quotes in selector", function() {
						const element = v("[a='b']")
			
						o(element.tagName).equals("DIV")
						o(element.getAttribute("a")).equals("b")
					})
					o("handles attr w/ quoted square bracket", function() {
						const element = v("[x][a='[b]'].c")
			
						o(element.tagName).equals("DIV")
						o(element.getAttribute("x")).equals("")
						o(element.getAttribute("a")).equals("[b]")
						o(element.className).equals("c")
					})
					o("handles attr w/ unmatched square bracket", function() {
						const element = v("[a=']'].c")
			
						o(element.tagName).equals("DIV")
						o(element.getAttribute("a")).equals("]")
						o(element.className).equals("c")
					})
					o("handles attr w/ quoted square bracket and quote", function() {
						const element = v("[a='[b\"\\']'].c") // `[a='[b"\']']`
			
						o(element.tagName).equals("DIV")
						o(element.getAttribute("a")).equals("[b\"']") // `[b"']`
						o(element.className).equals("c")
					})
					o("handles attr w/ quoted square containing escaped square bracket", function() {
						const element = v("[a='[\\]]'].c") // `[a='[\]]']`
			
						o(element.tagName).equals("DIV")
						o(element.getAttribute("a")).equals("[\\]]") // `[\]]`
						o(element.className).equals("c")
					})
					o("handles attr w/ backslashes", function() {
						const element = v("[a='\\\\'].c") // `[a='\\']`
			
						o(element.tagName).equals("DIV")
						o(element.getAttribute("a")).equals("\\")
						o(element.className).equals("c")
					})
					o("handles attr w/ quotes and spaces in selector", function() {
						const element = v("[a = 'b']")
			
						o(element.tagName).equals("DIV")
						o(element.getAttribute("a")).equals("b")
					})
					o("handles many attr w/ quotes and spaces in selector", function() {
						const element = v("[a = 'b'][c = 'd']")
			
						o(element.tagName).equals("DIV")
						o(element.getAttribute("a")).equals("b")
						o(element.getAttribute("c")).equals("d")
					})
					o("handles tag, class, attrs in selector", function() {
						const element = v("a.b[c = 'd']")
			
						o(element.tagName).equals("A")
						o(element.className).equals("b")
						o(element.getAttribute("c")).equals("d")
					})
					o("handles tag, mixed classes, attrs in selector", function() {
						const element = v("a.b[c = 'd'].e[f = 'g']")
			
						o(element.tagName).equals("A")
						o(element.className).equals("b e")
						o(element.getAttribute("c")).equals("d")
						o(element.getAttribute("f")).equals("g")
					})
					o("handles attr without value", function() {
						const element = v("[a]")
			
						o(element.tagName).equals("DIV")
						o(element.getAttribute("a")).equals("")
					})
					o("handles explicit empty string value for input", function() {
						const element = v('input[value=""]')
			
						o(element.tagName).equals("INPUT")
						o(element.value).equals("")
					})
					o("handles explicit empty string value for option", function() {
						const element = v('option[value=""]')
			
						o(element.tagName).equals("OPTION")
						o(element.value).equals("")
					})
			
					//  class and className normalization here
			
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
				})
				//o.spec("components", function() {
				//	o("works with POJOs", function() {
				//		const component = {
				//			view: function() {}
				//		}
				//		const element = v(component, {id: "a"}, "b")
				//
				//		o(element.tag).equals(component)
				//		o(element.attrs.id).equals("a")
				//		o(element.children.length).equals(1)
				//		o(element.children[0]).equals("b")
				//	})
				//	o("works with constructibles", function() {
				//		const component = o.spy()
				//		component.prototype.view = function() {}
				//
				//		const element = v(component, {id: "a"}, "b")
				//
				//		o(component.callCount).equals(0)
				//
				//		o(element.tag).equals(component)
				//		o(element.attrs.id).equals("a")
				//		o(element.children.length).equals(1)
				//		o(element.children[0]).equals("b")
				//	})
				//	o("works with closures", function () {
				//		const component = o.spy()
				//
				//		const element = v(component, {id: "a"}, "b")
				//
				//		o(component.callCount).equals(0)
				//
				//		o(element.tag).equals(component)
				//		o(element.attrs.id).equals("a")
				//		o(element.children.length).equals(1)
				//		o(element.children[0]).equals("b")
				//	})
				//})
			
			})
		})
	})
	o.spec("v only", () => {
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
	})
})
