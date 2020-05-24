import { Emitable } from "./types"

export const DOMEarmark = Symbol("DOM earmark")
export const componentEarmark = Symbol("component earmark")

export function component(f: Function, ...args: any[]): () => Emitable {
	const res = f.bind(null, ...args)
	res[componentEarmark] = true
	return res
}
Function.prototype.bind