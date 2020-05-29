import {getErrorMessage} from "./errors.js"
import {doc} from "./env.js"
import {Emitable, NonNullNodeRange, Range, Zone, component, emit, forEachNode, fromParent, setRange, setZone, withRange} from "./render.js"
import {S} from "./S.js"
import {Nullish} from "./types.js"

export {FragmentIndex, RemoveHooks, ref, postpone, setRemoveManager, processHookQueue}

/*
- cleanup, can be called from both computations and hooks, except from removing
- removing can be called from every hook except cleanup
- both can thus be called from reflow which can be called from render ... asap ... the ref callback.
*/

let canCallHooks = 0
let asapQueue: Effector<void>[] | Nullish

interface FragmentIndex {
	fragmentIndex: number,
	lastFragmentIndex: number
}

type Effector<T> = (() => T) | ((node: Node) => T) | ((node:Node, fi: FragmentIndex) => T)


function asap(cb: Effector<void>) {
	if (canCallHooks !== 4) throw new Error(getErrorMessage("A001"))
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	asapQueue!.push(cb)
}

function rendered(cb: Effector<void>) {
	if (canCallHooks < 3) throw new Error(getErrorMessage("A001"))
	postpone("rendered", cb, Range as NonNullNodeRange)
}

function reflowed(cb: Effector<void>) {
	if (canCallHooks < 2) throw new Error(getErrorMessage("A001"))
	postpone("reflowed", cb, Range as NonNullNodeRange)
}

const zoneRemoveMap = new WeakMap()

const removeHooks : () => ({
	manager: typeof Promise.all | Nullish,
	hooks: ((x: Array<Promise<unknown>| Nullish>) => void)[]
}) = () => ({
	manager: null,
	hooks: []
})

type RemoveHooks = ReturnType<typeof removeHooks>

function removing(cb: Effector<Promise<unknown> | Nullish>) {
	if (Zone.removeHooks == null) Zone.removeHooks = removeHooks()
	const nr = Range
	Zone.removeHooks.hooks.push(cb.length === 0
		? result => result.push((<()=>(Promise<unknown> | Nullish)>cb)())
		: result => forEachNode(nr as NonNullNodeRange, cb, false, result)
	)
}

function setRemoveManager(cb: typeof Promise.all) {
	// TODO? type check?
	if (Zone.removeHooks == null) Zone.removeHooks = removeHooks()
	if (Zone.removeHooks.manager != null) throw new Error(getErrorMessage("A004"))
	Zone.removeHooks.manager = cb
}

type Life = (life: {
	asap: (cb: Effector<void>) => void,
	rendered: (cb: Effector<void>) => void,
	reflowed: (cb: Effector<void>) => void,
	removing: (cb: Effector<Nullish | Promise<unknown>>) => void
}) => Emitable

function Ref(cb: Life) {
	const nr = fromParent(Range)
	zoneRemoveMap.set(nr, Zone)
	asapQueue = []
	withRange(nr, () => {
		canCallHooks = 4
		let res
		try{
			res = cb({asap, rendered, reflowed, removing})
		} finally {
			canCallHooks = 0
		}
		emit(res)
	})
	S.freeze(() => {
		canCallHooks = 3
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		asapQueue!.forEach(cb => forEachNode(nr as NonNullNodeRange, cb))
		canCallHooks = 0
	})
	asapQueue = null
}


function ref(cb: Life) {
	return component(Ref, cb)
}


interface Scheduled {
	rendered: (Effector<void> | NonNullNodeRange)[]
	reflowed: (Effector<void> | NonNullNodeRange)[]
	removing: (Effector<Promise<unknown>|Nullish> | NonNullNodeRange)[]
}

function Scheduled(): Scheduled{
	return {rendered: [], reflowed:[], removing: []}
}

let scheduled: Scheduled | Nullish
function postpone(what: "rendered"|"reflowed", fn: Effector<void>, nr: NonNullNodeRange): void
function postpone(what: "removing", fn: Effector<Promise<unknown>|Nullish>, nr: NonNullNodeRange): void

function postpone<T extends keyof Scheduled>(what: T, fn: Effector<void>|Effector<Promise<unknown>|Nullish>, nr: NonNullNodeRange): void {
	if (scheduled == null) {
		scheduled = Scheduled()
		Promise.resolve().then(processDelayedCreation)
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	scheduled[what].push(fn as any, nr)
}

function processDelayedCreation(){
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	const {rendered, reflowed} = scheduled!
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

function processHookQueue(
	queue : (Effector<void> | NonNullNodeRange)[]
) {
	for (let i = 0; i < queue.length; i += 2) {
		const cb = queue[i] as Effector<void>
		const nr = (queue[i+1] as NonNullNodeRange)
		if (cb.length === 0) {
			const previousZone = Zone
			setZone(zoneRemoveMap.get(nr))
			try {
				(<()=>void>cb)()
			} finally {
				setZone(previousZone)
			}
		} else {
			const previousRange = Range
			const previousZone =Zone
			setRange(nr as NonNullNodeRange)
			setZone(zoneRemoveMap.get(nr))
			try {
				forEachNode(nr, cb)
			} finally {
				setRange(previousRange)
				setZone(previousZone)
			}
		}
	}
}