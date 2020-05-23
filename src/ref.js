import {component} from "./constants.js"
import {getErrorMessage} from "./errors.js"
import {doc} from "./env.js"
import {Range, Zone, emit, forEachNode, fromParent, setRange, setZone, withRange} from "./render.js"
import {S} from "./S.js"

export {ref, postpone, setRemoveManager, processHookQueue}

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
	const nr = Range
	Zone.removeHooks.hooks.push(cb.length === 0
		? result => result.push(cb())
		: result => forEachNode(nr, cb, false, result)
	)
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
		let res
		try{
			res = executor({asap, rendered, reflowed, removing})
		} finally {
			canCallHooks = 0
		}
		emit(res)
	})
	S.freeze(() => {
		canCallHooks = 3
		asapQueue.forEach(cb => forEachNode(nr, cb))
		canCallHooks = 0
	})
	asapQueue = null
}

function ref(executor) {
	return component(Ref, executor)
}


function Scheduled() {
	return {removing:[], rendered: [], reflowed:[]}
}

let scheduled
function postpone(what, fn, nr) {
	if (scheduled == null) {
		scheduled = Scheduled()
		Promise.resolve().then(processDelayedCreation)
	}
	scheduled[what].push(fn, nr)
}

function processDelayedCreation(){
	const {rendered, reflowed} = scheduled
	canCallHooks = 2

	processHookQueue(rendered)
	canCallHooks = 1
	if (reflowed.length !== 0) {
		// todo: make sure this isn't removed by eager minifiers
		//TODO
		if (doc != null) doc.documentElement.clientWidth
		processHookQueue(reflowed)
		
	}
	canCallHooks = 0
	scheduled = null
}

function processHookQueue(queue) {
	for (let i = 0; i < queue.length; i += 2) {
		const fn = queue[i]
		const nr = queue[i+1]
		if (fn.length === 0) {
			const previousZone = Zone
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
}