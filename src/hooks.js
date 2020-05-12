import {componentEarmark} from "./constants.js"
import {getErrorMessage} from "./errors.js"
import {doc} from "./env.js"
import {NodeRange, emit, forEachNode, globalRange, globalZone, setRange, withRangeForInsertion/*, zoneRemoveMap*/} from "./render.js"
import {S} from "./S.js"

export {ref, postpone}

/*
- cleanup, can be called from both computations and hooks, except from removing
- removing can be called from every hook except cleanup
- both can thus be called from reflow which can be called from render ... asap ... the ref callback.
*/

let canCallHooks = 0
let asapQueue
function asap(cb) {
	if (canCallHooks !== 4) throw new Error(getErrorMessage("A001"))
	asapQueue.push(cb)
}

function rendered(cb) {
	if (canCallHooks < 3) throw new Error(getErrorMessage("A001"))
	postpone("rendered", cb, globalRange)
}

function reflowed(cb) {
	if (canCallHooks < 2) throw new Error(getErrorMessage("A001"))
	postpone("reflowed", cb, globalRange)
}

function removing(cb) {

}

function Ref(executor) {
	const dr = NodeRange(globalRange)
	asapQueue = []
	withRangeForInsertion(dr, () => {
		canCallHooks = 4
		const res = executor({asap, rendered, reflowed, removing})
		canCallHooks = 0
		emit(res)
		S.freeze(() => {
			canCallHooks = 3
			asapQueue.forEach(cb => forEachNode(dr, cb))
			canCallHooks = 0
		})
	})
	asapQueue = null
	return dr
}

function ref(executor) {
	const res = Ref.bind(null, executor)
	res[componentEarmark] = true
	return res
}


let scheduled
function Scheduled() {
	return {removing:[], rendered: [], reflowed:[]}
}
function postpone(what, fn, nr) {
	if (scheduled == null) {
		scheduled = Scheduled()
		Promise.resolve().then(process)
	}
	scheduled[what].push(fn, nr)
}

function process(){
	const {remove, rendered, reflowed} = scheduled
	// the list may grow while removing so forEach is inadequate
	for (let i = 0; i < remove.length; i++) {
		try {
			remove[i]()
		} finally {/**/}
		// todo: detect infinite cycles?
	}
	canCallHooks = 2
	for (let i = 0; i < rendered.length; i += 2) {
		const fn = rendered[i]
		const nr = rendered[i+1]
		if (fn.length === 0) try {fn()} finally {/**/}
		else {
			const previous = globalRange
			setRange(nr)
			try {
				forEachNode(nr, fn)
			} finally {
				setRange(previous)
			}
		}
	}

	canCallHooks = 1
	scheduled["post-render"].forEach(fn => fn())
	if (scheduled["post-reflow"].length !== 0) {
		// todo: make sure this isn't removed by eager minifiers
		if (doc != null) doc.documentElement.clientWidth
		scheduled["post-reflow"].forEach(fn => fn())
	}
	scheduled = null
}