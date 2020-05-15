import {componentEarmark} from "./constants.js"
import {Range, Zone, forEachNode, fromParent, setRange, setZone, withRange} from "./dom-util.js"
import {getErrorMessage} from "./errors.js"
import {doc} from "./env.js"
import {emit} from "./render.js"
import {S} from "./S.js"

export {ref, postpone, setRemoveManager}

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
	postpone("rendered", cb, Range)
}

function reflowed(cb) {
	if (canCallHooks < 2) throw new Error(getErrorMessage("A001"))
	postpone("reflowed", cb, Range)
}


const zoneRemoveMap = new WeakMap()

const removeHooks = () => ({manager: null, hooks: []})

function removing(cb) {
	if (Zone.removeHooks == null) Zone.removeHooks = removeHooks()
	Zone.removeHooks.hooks.push(cb, Zone)
}

function setRemoveManager(cb) {
	// TODO? type check?
	if (Zone.removeHooks == null) Zone.removeHooks = removeHooks()
	if (Zone.removeHooks.manager != null) throw new Error(getErrorMessage("A004"))
	Zone.removeHooks.manager = cb
}

function Ref(executor) {
	const nr = fromParent(Range)
	zoneRemoveMap.set(nr, Zone)
	asapQueue = []
	withRange(nr, () => {
		canCallHooks = 4
		const res = executor({asap, rendered, reflowed, removing})
		canCallHooks = 0
		emit(res)
		S.freeze(() => {
			canCallHooks = 3
			asapQueue.forEach(cb => forEachNode(nr, cb))
			canCallHooks = 0
		})
	})
	asapQueue = null
	return nr
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
		if (fn.length === 0) {
			const previousZone =Zone
			setZone(zoneRemoveMap.get(nr))
			try {
				fn()
			} finally {
				setZone(previousZone)
			}
		} else {
			const previousRange = Range
			const previousZone =Zone
			setRange(nr)
			setZone(zoneRemoveMap.get(nr))
			try {
				forEachNode(nr, fn)
			} finally {
				setRange(previousRange)
				setZone(previousZone)
			}
		}
	}

	canCallHooks = 1
	if (reflowed.length !== 0) {
		// todo: make sure this isn't removed by eager minifiers
		//TODO
		if (doc != null) doc.documentElement.clientWidth
		forEachNode(fn => fn())
	}
	scheduled = null
}