import {doc} from "./util.js"

const hasOwn = {}.hasOwnProperty

let scheduled
function Scheduled() {
	return {remove:[], "post-render": [], "post-reflow":[]}
}
export function postpone(what, fn) {
	if (scheduled == null) {
		scheduled = Scheduled()
		Promise.resolve().then(process)
	}
	if (!hasOwn.call(scheduled, what)) throw new RangeError(`Can't schedule ${JSON.stringify(what)}`)
	scheduled[what].push(fn)
}

function process(){
	if (scheduled === null) throw new Error("missing schedule")
	// the list may grow while removing so forEach is inadequate
	for (let i = 0; i < scheduled.remove.length; i++) {
		scheduled.remove[i]()
		// todo: detect infinite cycles?
	}
	scheduled["post-render"].forEach(fn => fn())
	if (scheduled["post-reflow"].length !== 0) {
		// todo: make sure this isn't removed by eager minifiers
		if (doc != null) doc.documentElement.clientWidth
		scheduled["post-reflow"].forEach(fn => fn())
	}
	scheduled = null
}