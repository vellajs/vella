function str(x) {
	return JSON.stringify(x)
}

export const matchError = ({kind, pattern, message}) => (fn) => {
	if (kind === undefined && pattern === undefined && message === undefined) throw new TypeError("matchErr expects at least on kind, pattern or message argument")
	if (kind !== undefined && typeof kind !== "function") throw new TypeError("the `matchErr` kind must be a function")
	if (pattern !== undefined && (!(pattern instanceof RegExp))) throw new TypeError("the `matchErr` pattern must be a RegExp")
	if (message !== undefined && typeof message !== "string") throw new TypeError("the `matchErr` pattern must be a string")
	if (typeof fn !== "function") throw new TypeError("`matchErr` can only validate functions, not " + typeof fn)
	try {
		fn()
		return {pass: false, message: `${fn}

should have thrown.`}
	} catch (e) {
		const errs = []
		if (kind != null && !(e instanceof kind)) errs.push(`Error of type ${kind.name} expected`)
		if (message != null) {
			if (typeof e !== "string" && !(e instanceof Error)) errs.push("Expected an Error or a string, got " + typeof e)
			else if (typeof e === "string" && e !== message) errs.push(`Expected message: ${str(message)}, got ${str(e)}`)
			else if (e instanceof Error && e.message !== message) errs.push(`Expected message: ${str(message)}, got ${str(e.message)}`)
		}
		if (pattern != null) {
			if (typeof e !== "string" && !(e instanceof Error)) errs.push("Expected an Error or a string, got " + typeof e)
			else if (typeof e === "string" && !pattern.test(e)) errs.push(`Expected pattern: ${pattern}, to match ${str(e)}`)
			else if (e instanceof Error && !pattern.test(e.message)) errs.push(`Expected pattern: ${pattern}, to match ${str(e.message)}`)
			
		}
		if (errs.length === 0) return {pass: true, message: ""}
		else return {pass: false, message: errs.join("\n")}
	}
}
