import {DataSignal, default as S, S as SInterface} from "../vendor/s-js/src/S.js"
export {S_ as S, DataSignal}

function map<T, U>(this: DataSignal<T>, cb: (x: T) => U) {
	if (typeof cb !== "function") console.log(cb)
	return S_(() => cb(this()))
}

function toJSON<T>(this: DataSignal<T>) {
	return S.sample(this)
}

// eslint-disable-next-line @typescript-eslint/ban-types
function decorateS(f: Function) {
	return (...args: any[]) => {
		const res = f(...args)
		if (typeof res === "function"){
			res.map = map
			res.toJSON = toJSON
		}
		return res
	}
}

const S_ = decorateS(S) as SInterface

Object.keys(S).forEach((m: any) => {
	(S_ as any)[m]= (m === "cleanup" || m === "sample" || m === "root" || m === "freeze") ? (S as any)[m] : decorateS((S as any)[m])
})
