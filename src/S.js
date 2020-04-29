import S from "s-js"
export {S_ as S}

function map(cb) {
	if (typeof cb !== "function") console.log(cb)
	return S_(() => cb(this()))
}

function toJSON() {
	return S.sample(this)
}

function decorateS(f) {
	return (...args) => {
		const res = f(...args)
		// p({name})
		res.map = map
		res.toJSON = toJSON
		return res
	}
}

const S_ = decorateS(S, "main")
Object.keys(S).forEach((m) => {
	S_[m] = (m === "cleanup" || m === "sample" || m === "root") ? S[m] : decorateS(S[m])
})
