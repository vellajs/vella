import {Skippable} from "./types"

export {getProto, hasOwn, objProto, skippable, Skippable}

// gets down to the value of nested streams.
// in other words `flatten`, but where's the fun with that?
const objProto = Object.prototype
const hasOwn = objProto.hasOwnProperty
const getProto = Object.getPrototypeOf


function skippable(node: any): node is Skippable {
	return node == null || node === true || node === false
}
