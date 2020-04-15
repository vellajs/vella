export {absorb, hasOwn, isProto}

// gets down to the value of nested streams.
// in other words `flatten`, but where's the fun with that?
function absorb(f) {
	do {f = f()} while (typeof f === "function")
	return f
}
const op = Object.prototype
const hasOwn = op.hasOwnProperty
const isProto = op.isPrototypeOf
