export {absorb, getProto, hasOwn, objProto, skippable}

// gets down to the value of nested streams.
// in other words `flatten`, but where's the fun with that?
function absorb(f) {
	do {f = f()} while (typeof f === "function")
	return f
}
const objProto = Object.prototype
const hasOwn = objProto.hasOwnProperty
const getProto = Object.getPrototypeOf
function skippable(node) {
	return node == null || node === true || node === false
}
