const hasOwn = ({}).hasOwnProperty
/*
 {tag
  , hasAttrs
  , lacksAttrs
  , hasProps
  , lacksProps
  , hasEvents
  , lacksEvents
  , hasChildren
  , lacksChildren
}

{
tag: "foo",
hasAttrs: ["class", {id: "hibidi"}],
doesntHaveAttrs: ["bar", "baz"]
hasProp: ...,
hasEvent: ...
children? : [...]
}

 * */

//const el = v('a', {hidden: 'jack'})
//
//console.log(vvalid(el, {
//	tag: 'a',
// hasAttrs: ['class', {id: 'bar'}],
// lacksAttrs: ['name', 'value'],
//	hasAttrs: ['hidden']
//}) ? 'VALID' : 'INVALID')


export const vvalid = (dom, test) => {
	const keys = Object.keys(test)
	const len = keys.length
	for (let i=0; i<len; i++){
		const k = keys[i]
		if (!validators[k](dom, test)) return false
	}
	return true
}

const validators = {
	tag: (d, t) => d.tagName === t.tag.toUpperCase(),
	hasAttrs: (d, t) => {
		const {hasAttrs} = t
		const len = hasAttrs.length
		for(let i=0; i<len; i++){
			const a = hasAttrs[i]
			if (typeof a === "string" && !d.hasAttribute(a)) return false
			else if (typeof a === "object") {
				const k = Object.keys(a)[0]
				if (!(d.hasAttribute(k) && d.getAttribute(k) == a[k])) return false
			}
		}
		return true
	},
	lacksAttrs: (d, t) => {
		const {lacksAttrs} = t
		const len = lacksAttrs.length
		for(let i=0; i<len; i++){
			if (d.hasAttribute(lacksAttrs[i])) return false
		}
		return true
	},
	hasProps: (d, t) => {
		const {hasProps} = t
		const len = hasProps.length
		for(let i=0; i<len; i++){
			const a = hasProps[i]
			if (typeof a === "string" && typeof d[a] === "undefined") return false
			else if (typeof a === "object") {
				const k = Object.keys(a)[0]
				if (!(hasOwn.call(d, k) && d[k] == a[k])) return false
			}
		}
		return true
	},
	lacksProps: (d, t) => {
		const {lacksProps} = t
		const len = lacksProps.length
		for(let i=0; i<len; i++){
			if (d.hasAttribute(lacksProps[i])) return false
		}
		return true
	},
}

/*
 o.spec("hyperscript", function() {
	 o.spec("selector", function() {

		 o("class and className normalization", function(){
			 o(v("a", {
				 class: null
			}).attrs).deepEquals({
				 class: null
			})
			 o(v("a", {
				 class: undefined
			}).attrs).deepEquals({
				 class: null
			})
			 o(v("a", {
				 class: false
			}).attrs).deepEquals({
				 class: null,
				 className: false
			})
			 o(v("a", {
				 class: true
			}).attrs).deepEquals({
				 class: null,
				 className: true
			})
			 o(v("a.x", {
				 class: null
			}).attrs).deepEquals({
				 class: null,
				 className: "x"
			})
			 o(v("a.x", {
				 class: undefined
			}).attrs).deepEquals({
				 class: null,
				 className: "x"
			})
			 o(v("a.x", {
				 class: false
			}).attrs).deepEquals({
				 class: null,
				 className: "x false"
			})
			 o(v("a.x", {
				 class: true
			}).attrs).deepEquals({
				 class: null,
				 className: "x true"
			})
			 o(v("a", {
				 className: null
			}).attrs).deepEquals({
				 className: null
			})
			 o(v("a", {
				 className: undefined
			}).attrs).deepEquals({
				 className: undefined
			})
			 o(v("a", {
				 className: false
			}).attrs).deepEquals({
				 className: false
			})
			 o(v("a", {
				 className: true
			}).attrs).deepEquals({
				 className: true
			})
			 o(v("a.x", {
				 className: null
			}).attrs).deepEquals({
				 className: "x"
			})
			 o(v("a.x", {
				 className: undefined
			}).attrs).deepEquals({
				 className: "x"
			})
			 o(v("a.x", {
				 className: false
			}).attrs).deepEquals({
				 className: "x false"
			})
			 o(v("a.x", {
				 className: true
			}).attrs).deepEquals({
				 className: "x true"
			})
		})
	})
})
 */