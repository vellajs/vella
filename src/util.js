export let doc = typeof document != "undefined" ? document : null
export function setDocument(d) {doc = d}

// gets down to the value of nested streams.
// in other words `flatten`, but where's the fun with that?
export function absorb(f) {
    do {f = f()} while (typeof f === "function")
    return f
}
