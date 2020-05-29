export {getProto, hasOwn, objProto, skippable, Skippable}

// gets down to the value of nested streams.
// in other words `flatten`, but where's the fun with that?
const objProto = Object.prototype
const hasOwn = objProto.hasOwnProperty
const getProto = Object.getPrototypeOf

type Skippable = null | undefined | boolean | void

function skippable(x: unknown): x is Skippable {
	return x == null || x === true || x === false
}
