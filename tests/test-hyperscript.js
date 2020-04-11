"use strict"
import o from 'ospec'
import { v, setDocument } from '../index.js'
import jsdom from 'jsdom'
const { JSDOM } = jsdom
const { document } = new JSDOM().window
setDocument(document)

o.spec("hyperscript", () => {
	o.spec("selector", () => {
		o("throws on null selector", done => {
			try {v(null)} catch(e) {done()}
		})
		o("throws on empty object selector", done => {
			try {v({})} catch(e) {done()}
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
			o(element.getAttribute('a')).equals("b")
		})
		o("handles many attrs in selector", function() {
			const element = v("[a=b][c=d]")

			o(element.tagName).equals("DIV")
			o(element.getAttribute('a')).equals("b")
			o(element.getAttribute('c')).equals("d")
		})
		o("handles attr w/ spaces in selector", function() {
			const element = v("[a = b]")

			o(element.tagName).equals("DIV")
			o(element.getAttribute('a')).equals("b")
		})
		o("handles attr w/ quotes in selector", function() {
			const element = v("[a='b']")

			o(element.tagName).equals("DIV")
			o(element.getAttribute('a')).equals("b")
		})
		o("handles attr w/ quoted square bracket", function() {
			const element = v("[x][a='[b]'].c")

			o(element.tagName).equals("DIV")
			o(element.getAttribute('x')).equals(true)
			o(element.getAttribute('a')).equals("[b]")
			o(element.className).equals("c")
		})
		o("handles attr w/ unmatched square bracket", function() {
			const element = v("[a=']'].c")

			o(element.tagName).equals("DIV")
			o(element.getAttribute('a')).equals("]")
			o(element.className).equals("c")
		})
		o("handles attr w/ quoted square bracket and quote", function() {
			const element = v("[a='[b\"\\']'].c") // `[a='[b"\']']`

			o(element.tagName).equals("DIV")
			o(element.getAttribute('a')).equals("[b\"']") // `[b"']`
			o(element.className).equals("c")
		})
		o("handles attr w/ quoted square containing escaped square bracket", function() {
			const element = v("[a='[\\]]'].c") // `[a='[\]]']`

			o(element.tagName).equals("DIV")
			o(element.getAttribute('a')).equals("[\\]]") // `[\]]`
			o(element.className).equals("c")
		})
		o("handles attr w/ backslashes", function() {
			const element = v("[a='\\\\'].c") // `[a='\\']`

			o(element.tagName).equals("DIV")
			o(element.getAttribute('a')).equals("\\")
			o(element.className).equals("c")
		})
		o("handles attr w/ quotes and spaces in selector", function() {
			const element = v("[a = 'b']")

			o(element.tagName).equals("DIV")
			o(element.getAttribute('a')).equals("b")
		})
		o("handles many attr w/ quotes and spaces in selector", function() {
			const element = v("[a = 'b'][c = 'd']")

			o(element.tagName).equals("DIV")
			o(element.getAttribute('a')).equals("b")
			o(element.getAttribute('c')).equals("d")
		})
		o("handles tag, class, attrs in selector", function() {
			const element = v("a.b[c = 'd']")

			o(element.tagName).equals("A")
			o(element.className).equals("b")
			o(element.getAttribute('c')).equals("d")
		})
		o("handles tag, mixed classes, attrs in selector", function() {
			const element = v("a.b[c = 'd'].e[f = 'g']")

			o(element.tagName).equals("A")
			o(element.className).equals("b e")
			o(element.getAttribute('c')).equals("d")
			o(element.getAttribute('f')).equals("g")
		})
		o("handles attr without value", function() {
			const element = v("[a]")

			o(element.tagName).equals("DIV")
			o(element.getAttribute('a')).equals(true)
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
	})
})

