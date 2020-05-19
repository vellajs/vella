export const DOMEarmark = Symbol("DOM earmark")
export const componentEarmark = Symbol("component earmark")

export function component(f, ...args) {
	const res = f.bind(null, ...args)
	res[componentEarmark] = true
	return res
}