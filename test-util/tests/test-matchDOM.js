import o from "ospec"
import jsdom from "jsdom"
import {e, matchDOM, setWindow} from "../matchDOM.js"

const win = new jsdom.JSDOM().window
const doc = win.document
setWindow(win)


function h(tag, {attrs, props, events} = {}, children) {
	const el = doc.createElement(tag)
	if (attrs) {
		for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
	}
	if (props) {
		for (const [k, v] of Object.entries(props)) el[k] = v
	}
	if (events) {
		for (const [k, v] of Object.entries(props)) {
			if (Array.isArray(v)) el.addEventListener(k, ...v)
			else el.addEventListener(k, v)
		}
	}
	if (children) {
		children.forEach(ch => el.appendChild(typeof ch === "string" ? t(ch) : ch))
	}
	return el
}
function t(txt) {
	return doc.createTextNode(txt)
}
function cmt(txt) {
	return doc.createComment(txt)
}

const PASS = {pass: true, message: ""}

const failure = msg => (result) => {
	if (result == null) {
		return {pass: false, message: "Unexpected nullish: " + String(result)}

	} else if (typeof result !== "object") {
		return {pass: false, message: `Wrong type: ${typeof result}, ${JSON.stringify(result)}`}

	} else if (result.pass !== false) {
		return {pass: false, message: `Pass expected to be false in ${JSON.stringify(result)}`}
    
	} else if (typeof result.message !== "string") {
		return {pass: false, message: `Pass expected to be false in ${JSON.stringify(result)}`}
    
	} else if (msg != null && result.message !== msg) {
		return {pass: false, message:`Bad message. Expected 
  ${msg}
got
  ${result.message}`}
  
	} else {
		return {pass: true, message: ""}
	}
}

o.spec("e", () => {
	o("e produces e instances", () => {
		o(e("a") instanceof e).equals(true)
	})
})

o.spec("matchDOM", function() {
	o.spec("rejects invalid inupt", () => {
		o("", () => {
			o(() => matchDOM(null)()).throws(Error)
			o(() => matchDOM(1)()).throws(Error)
		})
	})
	o.spec("validates DOM", () => {
		o("one tag", () => {
			o(matchDOM(e("div"))(h("div"))).deepEquals(PASS)
			o(matchDOM(e("div"))(h("a"))).satisfies(failure())
			o(matchDOM(e("a", {}, []))(h("a"))).deepEquals(PASS)
			o(matchDOM(e("a"))(h("a", {}, []))).deepEquals(PASS)
		})
		o("element children", function() {
			o(matchDOM(
				e("div", {}, [e("p")]))(
				h("div", {}, [h("p")])
			)).deepEquals(PASS)
      
			o(matchDOM(
				e("div", {}, [e("p")]))(
				h("div", {}, [h("a")])
			)).satisfies(failure())
      
			o(matchDOM(
				e("div", {}, [e("p")]))(
				h("div", {}, [])
			)).satisfies(failure())
      
			o(matchDOM(
				e("div", {}, []))(
				h("div", {}, [h("a")])
			)).satisfies(failure())
      
			o(matchDOM(
				e("div", {}, [e("p"), e("b")]))(
				h("div", {}, [h("p"), h("b")])
			)).deepEquals(PASS)
      
			o(matchDOM(
				e("div", {}, [e("p")]))(
				h("div", {}, [h("p"), h("b")])
			)).satisfies(failure())
      
			o(matchDOM(
				e("div", {}, [e("p"), e("b")]))(
				h("div", {}, [h("b")])
			)).satisfies(failure())
      
			o(matchDOM(
				e("div", {}, [e("p"), e("b"), e("a")]))(
				h("div", {}, [h("p"), h("b")])
			)).satisfies(failure())
      
			o(matchDOM(
				e("div", {}, [e("p"), e("b")]))(
				h("div", {}, [h("p"), h("b"), h("a")])
			)).satisfies(failure())
      
			o(matchDOM(
				e("div", {}, [e("p", {}, [e("a")])]))(
				h("div", {}, [h("p", {}, [h("a")])])
			)).deepEquals(PASS)
		})
    
		o.spec("comments and nodes", () => {
			o("text", () => {
				o(matchDOM(
					"foo")(
					t("foo")
				)).deepEquals(PASS)
				o(matchDOM(
					e("div", {}, ["foo"]))(
					h("div", {}, ["foo"])
				)).deepEquals(PASS)
			})
			o("comments", () => {
				o(matchDOM(
					e.comment())(
					cmt("")
				)).deepEquals(PASS)
				o(matchDOM(
					e("div", {}, [e.comment()]))(
					h("div", {}, [cmt("")])
				)).deepEquals(PASS)
			})
		})
    
		o.spec("attrs", () => {
			o("hasAttrs", () => {
				o(matchDOM(
					e("div", {hasAttrs:[]}, []))(
					h("div", {}, [])
				)).deepEquals(PASS)

				o(matchDOM(
					e("div", {hasAttrs:["foo"]}, []))(
					h("div", {attrs:{foo:5}}, [])
				)).deepEquals(PASS)

				o(matchDOM(
					e("div", {hasAttrs:["foo"]}, []))(
					h("div", {attrs:{}}, [])
				)).satisfies(failure())

				o(matchDOM(
					e("div", {hasAttrs:[{foo: "5"}]}, []))(
					h("div", {attrs:{foo: "5"}}, [])
				)).deepEquals(PASS)

				o(matchDOM(
					e("div", {hasAttrs:[{foo: "5"}]}, []))(
					h("div", {attrs:{bar: "5"}}, [])
				)).satisfies(failure())

				o(matchDOM(
					e("div", {hasAttrs:[{foo: "5"}]}, []))(
					h("div", {attrs:{foo: "6"}}, [])
				)).satisfies(failure())

				o(matchDOM(
					e("div", {hasAttrs:[{foo: "5", qux: "8"}, "bar"]}, []))(
					h("div", {attrs:{foo: "5", bar: "6", qux: "8"}}, [])
				)).deepEquals(PASS)

				o(matchDOM(
					e("div", {hasAttrs:[{foo: "5", qux: "8"}, "baz"]}, []))(
					h("div", {attrs:{foo: "5", bar: "6", qux: "8"}}, [])
				)).satisfies(failure())

				o(matchDOM(
					e("div", {hasAttrs:[{foo: "5", quux: "8"}, "bar"]}, []))(
					h("div", {attrs:{foo: "5", bar: "6", qux: "8"}}, [])
				)).satisfies(failure())

				o(matchDOM(
					e("div", {hasAttrs:[{foo: "5", qux: "9"}, "bar"]}, []))(
					h("div", {attrs:{foo: "5", bar: "6", qux: "8"}}, [])
				)).satisfies(failure())

				o(matchDOM(
					e("div", {hasAttrs:[{class: "a b"}]}, []))(
					h("div", {attrs:{class: "a b"}}, [])
				)).deepEquals(PASS)

				o(matchDOM(
					e("div", {hasAttrs:[{class: "a b"}]}, []))(
					h("div", {attrs:{class: "b  a"}}, [])
				)).deepEquals(PASS)

				o(matchDOM(
					e("div", {hasAttrs:[{class: "c b"}]}, []))(
					h("div", {attrs:{class: "b  a"}}, [])
				)).satisfies(failure())
			})
			o("hasProps", () => {
				o(matchDOM(
					e("div", {hasProps: []}, []))(
					h("div", {}, [])
				)).deepEquals(PASS)

				o(matchDOM(
					e("div", {hasProps:["foo"]}, []))(
					h("div", {props:{foo: 5}}, [])
				)).deepEquals(PASS)

				o(matchDOM(
					e("div", {hasProps:["foo"]}, []))(
					h("div", {props:{}}, [])
				)).satisfies(failure())

				o(matchDOM(
					e("div", {hasProps:[{foo: 5}]}, []))(
					h("div", {props:{foo: 5}}, [])
				)).deepEquals(PASS)

				o(matchDOM(
					e("div", {hasProps:[{foo: 5}]}, []))(
					h("div", {props:{bar: 5}}, [])
				)).satisfies(failure())

				o(matchDOM(
					e("div", {hasProps:[{foo: 5}]}, []))(
					h("div", {props:{foo: 6}}, [])
				)).satisfies(failure())

				o(matchDOM(
					e("div", {hasProps: [{foo: "5", qux: 8}, "bar"]}, []))(
					h("div", {props: {foo: "5", bar: "6", qux: 8}}, [])
				)).deepEquals(PASS)

				o(matchDOM(
					e("div", {hasProps: [{foo: "5", qux: 8}, "baz"]}, []))(
					h("div", {props: {foo: "5", bar: "6", qux: 8}}, [])
				)).satisfies(failure())

				o(matchDOM(
					e("div", {hasProps: [{foo: "5", quux: 8}, "bar"]}, []))(
					h("div", {props: {foo: "5", bar: "6", qux: 8}}, [])
				)).satisfies(failure())

				o(matchDOM(
					e("div", {hasProps: [{foo: "5", qux: 9}, "bar"]}, []))(
					h("div", {props: {foo: "5", bar: "6", qux: 8}}, [])
				)).satisfies(failure())

				o(matchDOM(
					e("div", {hasProps:[{className: "a b"}]}, []))(
					h("div", {attrs:{class: "a b"}}, [])
				)).deepEquals(PASS)

				o(matchDOM(
					e("div", {hasProps:[{className: " a b"}]}, []))(
					h("div", {attrs:{class: "b   a"}}, [])
				)).deepEquals(PASS)

				o(matchDOM(
					e("div", {hasProps:[{className: " a b"}]}, []))(
					h("div", {attrs:{class: "c   a"}}, [])
				)).satisfies(failure())
			})
			o("lacksAttrs", () => {
				o(matchDOM(
					e("div", {lacksAttrs:[]}))(
					h("div")
				)).deepEquals(PASS)

				o(matchDOM(
					e("div", {lacksAttrs:["foo"]}))(
					h("div")
				)).deepEquals(PASS)
        
				o(matchDOM(
					e("div", {lacksAttrs:["foo"]}))(
					h("div", {props: {foo: 5}})
				)).deepEquals(PASS)
        
				o(matchDOM(
					e("div", {lacksAttrs:["foo"]}))(
					h("div", {attrs:{foo: 6}})
				)).satisfies(failure(
					`<div foo="6"></div>

div[foo]: unexpected attribute, with value "6"`
				))
        
				o(matchDOM(
					e("div", {lacksAttrs:["foo", "bar"]}))(
					h("div", {attrs:{foo: 6, bar: 7}})
				)).satisfies(failure(
					`<div foo="6" bar="7"></div>

div[foo]: unexpected attribute, with value "6"
div[bar]: unexpected attribute, with value "7"`
				))
			})
			o("lacksProps", () => {
				o(matchDOM(
					e("div", {lacksProps:[]}))(
					h("div")
				)).deepEquals(PASS)

				o(matchDOM(
					e("div", {lacksProps:["foo"]}))(
					h("div")
				)).deepEquals(PASS)
        
				o(matchDOM(
					e("div", {lacksProps:["foo"]}))(
					h("div", {attrs: {foo: 5}})
				)).deepEquals(PASS)
        
				o(matchDOM(
					e("div", {lacksProps:["foo"]}))(
					h("div", {props:{foo: 6}})
				)).satisfies(failure(
					`<div></div>

div.foo: unexpected property, with value 6`
				))
        
				o(matchDOM(
					e("div", {lacksProps:["foo", "bar"]}))(
					h("div", {props: {foo: 6, bar: 7}})
				)).satisfies(failure(
					`<div></div>

div.foo: unexpected property, with value 6
div.bar: unexpected property, with value 7`
				))
			})
		})
	})
})

