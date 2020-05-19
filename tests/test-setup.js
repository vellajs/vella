import o from "ospec"
export {win, doc, refreshWindow}

let win
let doc
let refreshWindow

let currentRoot

o.before(() => {
	if (typeof window !== "undefined") {
		let current
		refreshWindow = function() {
			if (currentRoot) current.parentElement.removeChild(current)
			document.body.appendChild(currentRoot = document.createElement("iframe"))
			win = currentRoot.contentDocument.defaultView
			doc = win.document
		}
	} else {
		return import("jsdom").then(({default: jsdom}) => {
			refreshWindow = () => {
				win = new jsdom.JSDOM().window
				doc = win.document
			}
		})
	}
})
o.after(() => {
	if (currentRoot != null) currentRoot.parentElement.removeChild(currentRoot)
})
Error.stackTraceLimit = 100