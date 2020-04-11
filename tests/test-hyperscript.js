"use strict"
import o from 'ospec'
import { v, setDocument } from '../index.js'
import { vvalid } from './test-helpers.js'
import jsdom from 'jsdom'
const { JSDOM } = jsdom
const { document } = new JSDOM().window
setDocument(document)

const el = v('a', {hidden: 'jack'})

console.log(vvalid(el, {
	tag: 'a',
	//hasAttrs: ['class', { id: 'bar' }],
	//lacksAttrs: ['name', 'value'],
	hasAttrs: ['hidden']
}) ? 'VALID' : 'INVALID')

/*

o.spec("hyperscript", function() {
	o.spec("selector", function() {
		o("throws on null selector", function(done) {
			try {v(null)} catch(e) {done()}
		})
		o("throws on non-string selector w/o a view property", function(done) {
			try {v({})} catch(e) {done()}
		})
		o("handles tagName in selector", function() {
			var element = v("a")

			o(element.tagName).equals("A")
		})
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
		o("handles class in selector", function() {
			var element = v(".a")

			o(element.tag).equals("div")
			o(element.attrs.className).equals("a")
		})
		o("handles many classes in selector", function() {
			var element = v(".a.b.c")

			o(element.tag).equals("div")
			o(element.attrs.className).equals("a b c")
		})
		o("handles id in selector", function() {
			var element = v("#a")

			o(element.tag).equals("div")
			o(element.attrs.id).equals("a")
		})
		o("handles attr in selector", function() {
			var element = v("[a=b]")

			o(element.tag).equals("div")
			o(element.attrs.a).equals("b")
		})
		o("handles many attrs in selector", function() {
			var element = v("[a=b][c=d]")

			o(element.tag).equals("div")
			o(element.attrs.a).equals("b")
			o(element.attrs.c).equals("d")
		})
		o("handles attr w/ spaces in selector", function() {
			var element = v("[a = b]")

			o(element.tag).equals("div")
			o(element.attrs.a).equals("b")
		})
		o("handles attr w/ quotes in selector", function() {
			var element = v("[a='b']")

			o(element.tag).equals("div")
			o(element.attrs.a).equals("b")
		})
		o("handles attr w/ quoted square bracket", function() {
			var element = v("[x][a='[b]'].c")

			o(element.tag).equals("div")
			o(element.attrs.x).equals(true)
			o(element.attrs.a).equals("[b]")
			o(element.attrs.className).equals("c")
		})
		o("handles attr w/ unmatched square bracket", function() {
			var element = v("[a=']'].c")

			o(element.tag).equals("div")
			o(element.attrs.a).equals("]")
			o(element.attrs.className).equals("c")
		})
		o("handles attr w/ quoted square bracket and quote", function() {
			var element = v("[a='[b\"\\']'].c") // `[a='[b"\']']`

			o(element.tag).equals("div")
			o(element.attrs.a).equals("[b\"']") // `[b"']`
			o(element.attrs.className).equals("c")
		})
		o("handles attr w/ quoted square containing escaped square bracket", function() {
			var element = v("[a='[\\]]'].c") // `[a='[\]]']`

			o(element.tag).equals("div")
			o(element.attrs.a).equals("[\\]]") // `[\]]`
			o(element.attrs.className).equals("c")
		})
		o("handles attr w/ backslashes", function() {
			var element = v("[a='\\\\'].c") // `[a='\\']`

			o(element.tag).equals("div")
			o(element.attrs.a).equals("\\")
			o(element.attrs.className).equals("c")
		})
		o("handles attr w/ quotes and spaces in selector", function() {
			var element = v("[a = 'b']")

			o(element.tag).equals("div")
			o(element.attrs.a).equals("b")
		})
		o("handles many attr w/ quotes and spaces in selector", function() {
			var element = v("[a = 'b'][c = 'd']")

			o(element.tag).equals("div")
			o(element.attrs.a).equals("b")
			o(element.attrs.c).equals("d")
		})
		o("handles tag, class, attrs in selector", function() {
			var element = v("a.b[c = 'd']")

			o(element.tag).equals("a")
			o(element.attrs.className).equals("b")
			o(element.attrs.c).equals("d")
		})
		o("handles tag, mixed classes, attrs in selector", function() {
			var element = v("a.b[c = 'd'].e[f = 'g']")

			o(element.tag).equals("a")
			o(element.attrs.className).equals("b e")
			o(element.attrs.c).equals("d")
			o(element.attrs.f).equals("g")
		})
		o("handles attr without value", function() {
			var element = v("[a]")

			o(element.tag).equals("div")
			o(element.attrs.a).equals(true)
		})
		o("handles explicit empty string value for input", function() {
			var element = v('input[value=""]')

			o(element.tag).equals("input")
			o(element.attrs.value).equals("")
		})
		o("handles explicit empty string value for option", function() {
			var element = v('option[value=""]')

			o(element.tag).equals("option")
			o(element.attrs.value).equals("")
		})
	})
	o.spec("attrs", function() {
		o("handles string attr", function() {
			var element = v("div", {a: "b"})

			o(element.tag).equals("div")
			o(element.attrs.a).equals("b")
		})
		o("handles falsy string attr", function() {
			var element = v("div", {a: ""})

			o(element.tag).equals("div")
			o(element.attrs.a).equals("")
		})
		o("handles number attr", function() {
			var element = v("div", {a: 1})

			o(element.tag).equals("div")
			o(element.attrs.a).equals(1)
		})
		o("handles falsy number attr", function() {
			var element = v("div", {a: 0})

			o(element.tag).equals("div")
			o(element.attrs.a).equals(0)
		})
		o("handles boolean attr", function() {
			var element = v("div", {a: true})

			o(element.tag).equals("div")
			o(element.attrs.a).equals(true)
		})
		o("handles falsy boolean attr", function() {
			var element = v("div", {a: false})

			o(element.tag).equals("div")
			o(element.attrs.a).equals(false)
		})
		o("handles only key in attrs", function() {
			var element = v("div", {key:"a"})

			o(element.tag).equals("div")
			o(element.attrs).equals(null)
			o(element.key).equals("a")
		})
		o("handles many attrs", function() {
			var element = v("div", {a: "b", c: "d"})

			o(element.tag).equals("div")
			o(element.attrs.a).equals("b")
			o(element.attrs.c).equals("d")
		})
		o("handles className attrs property", function() {
			var element = v("div", {className: "a"})

			o(element.attrs.className).equals("a")
		})
		o("handles 'class' as a verbose attribute declaration", function() {
			var element = v("[class=a]")

			o(element.attrs.className).equals("a")
		})
		o("handles merging classes w/ class property", function() {
			var element = v(".a", {class: "b"})

			o(element.attrs.className).equals("a b")
		})
		o("handles merging classes w/ className property", function() {
			var element = v(".a", {className: "b"})

			o(element.attrs.className).equals("a b")
		})
	})
	o.spec("custom element attrs", function() {
		o("handles string attr", function() {
			var element = v("custom-element", {a: "b"})

			o(element.tag).equals("custom-element")
			o(element.attrs.a).equals("b")
		})
		o("handles falsy string attr", function() {
			var element = v("custom-element", {a: ""})

			o(element.tag).equals("custom-element")
			o(element.attrs.a).equals("")
		})
		o("handles number attr", function() {
			var element = v("custom-element", {a: 1})

			o(element.tag).equals("custom-element")
			o(element.attrs.a).equals(1)
		})
		o("handles falsy number attr", function() {
			var element = v("custom-element", {a: 0})

			o(element.tag).equals("custom-element")
			o(element.attrs.a).equals(0)
		})
		o("handles boolean attr", function() {
			var element = v("custom-element", {a: true})

			o(element.tag).equals("custom-element")
			o(element.attrs.a).equals(true)
		})
		o("handles falsy boolean attr", function() {
			var element = v("custom-element", {a: false})

			o(element.tag).equals("custom-element")
			o(element.attrs.a).equals(false)
		})
		o("handles only key in attrs", function() {
			var element = v("custom-element", {key:"a"})

			o(element.tag).equals("custom-element")
			o(element.attrs).equals(null)
			o(element.key).equals("a")
		})
		o("handles many attrs", function() {
			var element = v("custom-element", {a: "b", c: "d"})

			o(element.tag).equals("custom-element")
			o(element.attrs.a).equals("b")
			o(element.attrs.c).equals("d")
		})
		o("handles className attrs property", function() {
			var element = v("custom-element", {className: "a"})

			o(element.attrs.className).equals("a")
		})
		o("casts className using toString like browsers", function() {
			const className = {
				valueOf: () => ".valueOf",
				toString: () => "toString"
			}
			var element = v("custom-element" + className, {className: className})

			o(element.attrs.className).equals("valueOf toString")
		})
	})
	o.spec("children", function() {
		o("handles string single child", function() {
			var element = v("div", {}, ["a"])

			o(element.text).equals("a")
		})
		o("handles falsy string single child", function() {
			var element = v("div", {}, [""])

			o(element.text).equals("")
		})
		o("handles number single child", function() {
			var element = v("div", {}, [1])

			o(element.text).equals("1")
		})
		o("handles falsy number single child", function() {
			var element = v("div", {}, [0])

			o(element.text).equals("0")
		})
		o("handles boolean single child", function() {
			var element = v("div", {}, [true])

			o(element.children).deepEquals([null])
		})
		o("handles falsy boolean single child", function() {
			var element = v("div", {}, [false])

			o(element.children).deepEquals([null])
		})
		o("handles null single child", function() {
			var element = v("div", {}, [null])

			o(element.children).deepEquals([null])
		})
		o("handles undefined single child", function() {
			var element = v("div", {}, [undefined])

			o(element.children).deepEquals([null])
		})
		o("handles multiple string children", function() {
			var element = v("div", {}, ["", "a"])

			o(element.children[0].tag).equals("#")
			o(element.children[0].children).equals("")
			o(element.children[1].tag).equals("#")
			o(element.children[1].children).equals("a")
		})
		o("handles multiple number children", function() {
			var element = v("div", {}, [0, 1])

			o(element.children[0].tag).equals("#")
			o(element.children[0].children).equals("0")
			o(element.children[1].tag).equals("#")
			o(element.children[1].children).equals("1")
		})
		o("handles multiple boolean children", function() {
			var element = v("div", {}, [false, true])

			o(element.children).deepEquals([null, null])
		})
		o("handles multiple null/undefined child", function() {
			var element = v("div", {}, [null, undefined])

			o(element.children).deepEquals([null, null])
		})
		o("handles falsy number single child without attrs", function() {
			var element = v("div", 0)

			o(element.text).equals("0")
		})
	})
	o.spec("permutations", function() {
		o("handles null attr and children", function() {
			var element = v("div", null, [v("a"), v("b")])

			o(element.children.length).equals(2)
			o(element.children[0].tag).equals("a")
			o(element.children[1].tag).equals("b")
		})
		o("handles null attr and child unwrapped", function() {
			var element = v("div", null, v("a"))

			o(element.children.length).equals(1)
			o(element.children[0].tag).equals("a")
		})
		o("handles null attr and children unwrapped", function() {
			var element = v("div", null, v("a"), v("b"))

			o(element.children.length).equals(2)
			o(element.children[0].tag).equals("a")
			o(element.children[1].tag).equals("b")
		})
		o("handles attr and children", function() {
			var element = v("div", {a: "b"}, [v("i"), v("s")])

			o(element.attrs.a).equals("b")
			o(element.children[0].tag).equals("i")
			o(element.children[1].tag).equals("s")
		})
		o("handles attr and child unwrapped", function() {
			var element = v("div", {a: "b"}, v("i"))

			o(element.attrs.a).equals("b")
			o(element.children[0].tag).equals("i")
		})
		o("handles attr and children unwrapped", function() {
			var element = v("div", {a: "b"}, v("i"), v("s"))

			o(element.attrs.a).equals("b")
			o(element.children[0].tag).equals("i")
			o(element.children[1].tag).equals("s")
		})
		o("handles attr and text children", function() {
			var element = v("div", {a: "b"}, ["c", "d"])

			o(element.attrs.a).equals("b")
			o(element.children[0].tag).equals("#")
			o(element.children[0].children).equals("c")
			o(element.children[1].tag).equals("#")
			o(element.children[1].children).equals("d")
		})
		o("handles attr and single string text child", function() {
			var element = v("div", {a: "b"}, ["c"])

			o(element.attrs.a).equals("b")
			o(element.text).equals("c")
		})
		o("handles attr and single falsy string text child", function() {
			var element = v("div", {a: "b"}, [""])

			o(element.attrs.a).equals("b")
			o(element.text).equals("")
		})
		o("handles attr and single number text child", function() {
			var element = v("div", {a: "b"}, [1])

			o(element.attrs.a).equals("b")
			o(element.text).equals("1")
		})
		o("handles attr and single falsy number text child", function() {
			var element = v("div", {a: "b"}, [0])

			o(element.attrs.a).equals("b")
			o(element.text).equals("0")
		})
		o("handles attr and single boolean text child", function() {
			var element = v("div", {a: "b"}, [true])

			o(element.attrs.a).equals("b")
			o(element.children).deepEquals([null])
		})
		o("handles attr and single falsy boolean text child", function() {
			var element = v("div", {a: "b"}, [0])

			o(element.attrs.a).equals("b")
			o(element.text).equals("0")
		})
		o("handles attr and single false boolean text child", function() {
			var element = v("div", {a: "b"}, [false])

			o(element.attrs.a).equals("b")
			o(element.children).deepEquals([null])
		})
		o("handles attr and single text child unwrapped", function() {
			var element = v("div", {a: "b"}, "c")

			o(element.attrs.a).equals("b")
			o(element.text).equals("c")
		})
		o("handles attr and text children unwrapped", function() {
			var element = v("div", {a: "b"}, "c", "d")

			o(element.attrs.a).equals("b")
			o(element.children[0].tag).equals("#")
			o(element.children[0].children).equals("c")
			o(element.children[1].tag).equals("#")
			o(element.children[1].children).equals("d")
		})
		o("handles children without attr", function() {
			var element = v("div", [v("i"), v("s")])

			o(element.attrs).equals(null)
			o(element.children[0].tag).equals("i")
			o(element.children[1].tag).equals("s")
		})
		o("handles child without attr unwrapped", function() {
			var element = v("div", v("i"))

			o(element.attrs).equals(null)
			o(element.children[0].tag).equals("i")
		})
		o("handles children without attr unwrapped", function() {
			var element = v("div", v("i"), v("s"))

			o(element.attrs).equals(null)
			o(element.children[0].tag).equals("i")
			o(element.children[1].tag).equals("s")
		})
		o("handles shared attrs", function() {
			var attrs = {a: "b"}

			var nodeA = v(".a", attrs)
			var nodeB = v(".b", attrs)

			o(nodeA.attrs.className).equals("a")
			o(nodeA.attrs.a).equals("b")

			o(nodeB.attrs.className).equals("b")
			o(nodeB.attrs.a).equals("b")
		})
		o("doesnt modify passed attributes object", function() {
			var attrs = {a: "b"}
			v(".a", attrs)
			o(attrs).deepEquals({a: "b"})
		})
		o("non-nullish attr takes precedence over selector", function() {
			o(v("[a=b]", {a: "c"}).attrs).deepEquals({a: "c"})
		})
		o("null attr takes precedence over selector", function() {
			o(v("[a=b]", {a: null}).attrs).deepEquals({a: null})
		})
		o("undefined attr takes precedence over selector", function() {
			o(v("[a=b]", {a: undefined}).attrs).deepEquals({a: undefined})
		})
		o("handles fragment children without attr unwrapped", function() {
			var element = v("div", [v("i")], [v("s")])

			o(element.children[0].tag).equals("[")
			o(element.children[0].children[0].tag).equals("i")
			o(element.children[1].tag).equals("[")
			o(element.children[1].children[0].tag).equals("s")
		})
		o("handles children with nested array", function() {
			var element = v("div", [[v("i"), v("s")]])

			o(element.children[0].tag).equals("[")
			o(element.children[0].children[0].tag).equals("i")
			o(element.children[0].children[1].tag).equals("s")
		})
		o("handles children with deeply nested array", function() {
			var element = v("div", [[[v("i"), v("s")]]])

			o(element.children[0].tag).equals("[")
			o(element.children[0].children[0].tag).equals("[")
			o(element.children[0].children[0].children[0].tag).equals("i")
			o(element.children[0].children[0].children[1].tag).equals("s")
		})
	})
	o.spec("components", function() {
		o("works with POJOs", function() {
			var component = {
				view: function() {}
			}
			var element = v(component, {id: "a"}, "b")

			o(element.tag).equals(component)
			o(element.attrs.id).equals("a")
			o(element.children.length).equals(1)
			o(element.children[0]).equals("b")
		})
		o("works with constructibles", function() {
			var component = o.spy()
			component.prototype.view = function() {}

			var element = v(component, {id: "a"}, "b")

			o(component.callCount).equals(0)

			o(element.tag).equals(component)
			o(element.attrs.id).equals("a")
			o(element.children.length).equals(1)
			o(element.children[0]).equals("b")
		})
		o("works with closures", function () {
			var component = o.spy()

			var element = v(component, {id: "a"}, "b")

			o(component.callCount).equals(0)

			o(element.tag).equals(component)
			o(element.attrs.id).equals("a")
			o(element.children.length).equals(1)
			o(element.children[0]).equals("b")
		})
	})
})

*/

