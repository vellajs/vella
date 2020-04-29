import {setAttrs} from "./attrs.js"
import {componentEarmark} from "./constants.js"
import {doc, isChrome, nodeProto, tagCache} from "./env.js"
import {DOMRef, emit, withRef, withoutRange} from "./render.js"
import {getProto, hasOwn, objProto, skippable} from "./util.js"
export {
	v, V, withNS,
}

let globalNS = null
const namespaces = {
	svg:"http://www.w3.org/2000/svg",
	math: "http://www.w3.org/1998/Math/MathML",
	mathml: "http://www.w3.org/1998/Math/MathML",
	html: null,
	xhtml: "http://www.w3.org/1999/xhtml"
}
function withNS(ns, fn) {
	ns = ns.toLowerCase()
	if (!hasOwn.call(namespaces, ns)) throw new RangeError("Unknown namespace: " + ns)
	const previous = globalNS
	globalNS = namespaces[ns]
	try {
		return fn()
	} finally {
		globalNS = previous
	}
}
const attrsParser = /([.#])([^.#\[]+)|\[(.+?)(?:\s*=\s*("|'|)((?:\\["'\]]|.)*?)\4)?\]|((?!$))/g

const defaultAttrsMap = new WeakMap

function parseAndSetAttrs(element, s, ns) {
	attrsParser.lastIndex = 0
	let match
	const attrs = Object.create(null)
	let j = 0
	let classes
	while(match = attrsParser.exec(s)) {
		if (j++ === 1000) {console.error("attrs parser bug");break}
		if (match[6]!= null) throw new RangeError(`unexpected attr: ${s.slice(match.index)}`)
		if (match[1] != null) {
			if (match[1] === ".") (classes || (classes=[])).push(match[2])
			else {
				element.setAttribute("id", attrs.id=match[2])
			}
		} else if (match[3] != null) {
			const key = match[3]
			const value = match[5] ? match[5].replace(/\\(["'])/g, "$1").replace(/\\\\/g, "\\") : ""
			if (key === "class") (classes || (classes=[])).push(value)
			else element.setAttribute(key, attrs[key]=value)
		}
	}
	if (classes != null) {
		classes = attrs.class = classes.join(" ")
		if (ns != null) element.className = classes
		else element.setAttribute("class", classes)
	}
	defaultAttrsMap.set(element, attrs)
}

function cacheTag(selector, ns) {
	const end = selector.match(/[ \.#\[]|$/).index
	const hasAttrs = end !== selector.length
	const tagName = hasAttrs ? selector.slice(0, end) : selector
	const element = tagCache[selector] = ns == null ? doc.createElement(tagName || "div") : doc.createElementNS(ns, tagName)
	if (hasAttrs) parseAndSetAttrs(element, selector.slice(end), ns)
	return element
}

function makeElement(tag, ns) {
	const tpl = tagCache[tag] || cacheTag(tag, ns)
	// console.log({tpl})
	return tpl.cloneNode()
}

// https://flems.io/#0=N4IgtglgJlA2CmIBcA2AzAOgJwA4A0IAzgMYBOA9rLMgNoAMeA7AEwC6BAZhAobaAHYBDMIiQgMACwAuYagWLl+U+EuQgAPFAgA3AHwBhQbAgAjUoKkRFSAATrCAB0H8b0ALzEjp85cW6MAeoA9I7OusFaegA6-Jo6ugBKAK78-BD8AOa29k4u7g4UGaTwhIRW-P6BIbnhQZG6MXHarlBuWo6wggCetfWNkS1tEB3dxYRJsFKEvfEgBITwCMS+-LxiaEjMWCAAvngCwqIg2hAAXhgAVrzyisqqYjEcKcvlNhnwUgBC5ClQhAAUUkEhAA1oQAJQ2YAxGw2BSrKQ2SAuNw2ACyFgkGGR-wCGCBoMI2MEDkBNjcunRmOx6VxASkGDGEym4NZMLhikIiLAggAHuSqVIsTzeXT8cCwcTSYiKYLhXyxQymZMIWyXDZilIkqQXMBkXgkXydjFjfxHs8VjYTOkAQSwQaAHIG-WG3mQ6Hq+FcpETAX-EVBZHggBUwf+AEYgg7weyvYiTD9+H8Bfx4AB3GwAQVI5i6-2j7IQiI4FDAAuR7I45FINn+RdcAroAG4G+obA6WxAANRd93s2EJ36EGgQVgC4Al8hgA1Scg2Wz-Sdl4OosATcGm2Gbq2Jv70VgYJfl9I2II2ZjswdJ4cOgC04YPs-LfJswfPNnZQTPpOAV7+OxjdU7SJKtSAAUUEYgJDJWUPVhWEGWtVYBT-IkeVJf4J1LGdyAA8lKSVEpmSJYooCSYh4H+f5IOIA0xkhWUaJsLtayPNsxhsAAyTiNRKOxUVncEDToNUt0A00YngXkHGrYsLVeQhtAyQEJUIR0+09TlET1dI8BFHYBXeL5d1tVTAIHG0VMJR1nV0kVzI5BEbG0eBSEsTxYASEpKCSS1UUjf4MSFYlRTxYCpRgykgvlUL6QwJDVVExzvR5UgMhPVE0GbWMtMNNL0m+KRZzLVFmAAVibHKnNnIFYAAdWgIUBQdJIwBMVz-igchiFalREPIKAugwYhjD6hqoCFSFbzy9KXDfC9NKctNGokAUaqMcamrPB0qu9Cg0wACXgCAMmkAUyroQsPhsQhSGIAUAAN7CUmxeVkVY3CiEBpCkBwkC-NNAYwNNMGrDIgmYOgoZCJSvvZZaJokT6QAAEmAdb6pW40QHZCRjtOqRkbR8KEEyJq33+fajpOs6WNS2bmJmgryCKqdIRYtBsfZE502+XlkYYBhiZZjasbwYnVIwUmMnJ2sqfx2mmZcOnBHy-hCuKjc4fVLkugQZH6fSJBwzoBxeS+3QHvZdlwtAiCoKoqQDQgBjKTg+C4x3VmSthf4IEZ8NIQp+WacRFW1cZw31ZZ4qbAc2FPZMYF4BQmOpxsaao41qd+xuu6uzcJ7lF5KRc9hfmvuF2rNtWs9mC59V4JsLoid-ZPbxDgmM5sMqG6bhCpKkW9nCg6sDegOB4G1-ubqkPX4GRqslFvDhhG4LokEIZxCFvBZSAgDgmyXoe0wVqRbATWAoGn+CGkb+DiYwIQRG3WFgmLqRLdzxCbUPat7egv8fgBoLiuyhGXZKiI8ahxTK+Zyrl3JGC8oQHylo3yd2kBA2690C42AAMoADUADiXlliYQgbCDeVpk7d2gQTPAFDXq2AuHAhGQoGH3ybmwiQHCZ6wjoZgzhNgAK5xEffbBzFUQSAADLpEoknBYAccLVxWgaL6ABiHAWjtFfXjnnHBqISBGEoi6EUBoFEp3DrNbOZZpr4BsBjGucdc5fn0ZImwMi5H-ATN7RmzBlGi0RmokA6i0BhPCbo9kYjYQSNwVbWIMMMhf3VO0BwnQhrpFTKQA6AAVNE0i3DYM-GeTU2pdSoVssA10poJL8E9oQkh8Blh+mALyA0XQDTcINAIqQeFZTxLfsUZpFdUatOxs3VuXRxncNbtw8ZPTW49L7vBXW+svpcgoCCeAt5uFIGbFwKgSBNE4ChlDI+3BYC3nIE4YgEA57GwtsEIZn8YjxJiJ7IxCA-SmL5O0zpK0wEDLsB-XOqyF5fWPrvM48BbDhjQGbI+twV5r1gBvLeqxd6uQPjfcuAscUTMrsAKZN875NzRiQCAfUD4QGIP6dIWt1Tv0HqS4Fg9QVzzWSASFZRTgwpsHChFkLV6QFRZvbemL94cHxSMtGcyvoEtGcSnG98P7DzqRIMeX0VDX2VbCFlsJyW3KpVwWl9ltxMpLnfB6H46m5U8amP0HSbBdNnps+AgL2TqGMA63k4Y8VzGbn6wlSrXrMFmVjeVXQw3BuWTEjl4KiBSDdTslaxsmwbPIFspA5Kk2ZvgDsc5VArk3LuRvZsGatnFsgqWh5IBajevgFamI5o6mWgpcamlQDWoaVhAfWs-BWo2F0P5KGXEeIDrLG2E2UNISlJ1HKRku4u1gAcn25ddh+UzvAffes-tUTZXvmmCQ3AU7rrfCbUM-wewuw3dO8ElV76e2KD7f2ABSGwaBc5zpcA9NG0VF2-DPZu0MN6zwXuDM+gyAB1zdAA9NGt4-Yd3gGALsaANw3SBQZRYij3awl3Y2B9XDj1fKA+B-4t5bw3uHZumdRGPa5WfQKN9H6v0fDKTYX9wB-0UEAxOuB4HQPAYgyh6DcGENIefWhjDhAsMmjmEQRYTSVhrBAFgLASAAAsWBbzqaQBdXY+wQDPyOAoMADgT2XGuCAeEdwpBqE9hIYEAB5NMKJazAAApIFzbmAAKFAHAIK6M221TlzBJgAJJKAFF9AA+ijFG8qvx4KTekZS-6OCwHINWQK1JwtdTAP8IO55QxoGYGqRz8BBBQFco9GI2hVa8XGJMNG+Wou9PHKaeJnsqws1q6ieJ36mvMla84KA7Wushc9g6GLIAHSxa+l2XLwV8tTiK3AugvJGAcB27tjgNgAA+NgRJTdymZizCAckShaaQFI5j4CgRTqiOGAbBAcGUDWZ7OMA0mb2FaB71Z4AAING9j7ACPX8GVFIUbkWlA7BoGjAAUng5zDoMAbLSwfPMJmNxjlRE8Vt5R-howdABd2Ob96ZCx5hdqj2AEAQLeyCnmOOB5l-AD4oDP6MNZrFIcMApAukFAjyOp8An7kDTEV+GJHT0k52JRjSzOqes8wrd-gDOonc0a1IZgAvXLC5HmL-gEupfqiV+lFXwBQeuS50z4AGPlds+t+BSCEhbfqiGzr7ufOTT0beWaVM0lZI2AJy8RQHJzMnqsvaKEBRKDkAyEkeABoasODUv9unruQfvdcvTntNh6woO1BROrZvgB42qzb+j5vqfADj1lxP+aNx++tkBSWdtXfR-wtupuRe7qWNROdk9V3QTR-u5nqC2eweu4cmI9kfeS+4N6x93aiInDmDAA6Q4hABTOZMBcZTGAtldABKniEq+bDr+EAQowSed+oj3wf5YGAGuwDv51eAaeHKuNJAv91F+t5zMEBSB78bBUwMwAAxeSRQMUK-TfbfA0P-cEWA1Wa-W-EoByW2f+TvQmXQBkQAtJJ7G6YQQgkAmgBkEzVgcSELH-f4IfBATCJzJOJAdnR7WwF7OiFIIrOvf4L6PGKgcgXRP7Z3WwAAci+nIA1S+lEJ2D+w4NjzkO+2CV0W8yTn+CyjVBbTDxcAdwtzzDdB7xD2rFrE9hM1cBcAMLw1egFF5BoEoPZDXTnkC3IH235DcHcI-ETUpwyF0V4i1HnXNnVEcK6GcNcJsAAEIPCIVoCzQQBIQhR9owD0wbAckQigccwcsHpdCbBjDQ9LQpJAtlh4AoAjCaw0ZfsDQMgWYbBiY0iXDXodgHoHIPkfh+8bD8RyAUtvDTdYQhs-90djAKJ-h+j0gateRnMOBeCQBoQ4ilEbpWiKIpZgQpAosxiJipjsYkpYRNd1cYgFMFglgVM1BNNwxjZwxDMDgRA1AuQLAiQrgFNbM+o1ACjg88iFIgQpho989PY0QBRp1TlLpFpvRxgfZqJzEwFBBGYTAL9gAod09Sc1oJQL9kQBR-0cQ8Q4Tis0RkSXxUQ0SFQMSiIVQsTkSqt3M4TGRijyJKIQTwQggKTpZZZsSgTER3hyA0QySBRddQw5YiSpgIp-0G9ytKSyIhjaT6S+SiRGSJASSWSbBYsRAtBnABQaBCTmspgDwUE3IqJBBwSKRBBbwTBwQaAMssscsGSVAZYJAIZwRWBSSlT3MFTiiIBlS3xmSE5co0RMwAARAUCk9CSmbvf9QQEwAEGsaaJ0h01kdHWSHUvU3QA0o0k06kTLbLUgSmSUqWS0oUG0scN0i-L0703zVyCiaLPElMs09Mws08JEZ0102jESIIE2dkIbKw1xF0FxM8MxG1JudssktRe+VxNkjk5wAcpuRUl0qpXOQssc+CQs4s-vJQWc2EVxHadUGpfYpTbQ1TOFPZW8ZgZgPZC44zQ4a4iQJIHbBAKzB424J4sQVxNECLHJGwWRUshYGgs8fQa5LofeLuOgyESGcMHAGwXzEjGwT4JIQgEwYLAPVxBcyAUoV4YYDxVyeAaCt4cLZQKAA0EseAFOeoqCVWd4HCGwZwLoS-VyFBFwcgEwIEdINLUijkBwGC1xeooUZClBd7NMVWFOMbUi0obqF0rCmwLqHqEQJQCwV4A5PiQEPGTwvBFwqQbi4oXREimrIwGIVxE8IUFOBSrini51O5DVXyJrVLbQ52OpN-LQTIQyoUH4REYwSAD414HSjUUOQgTSs8J8SC5PJip1MAAaLHZ0VyYiy-JIEwYwQgHhES4YVLEwXyXy8YCKmlFQBYEHJMIIYwg42ATypiylHfNiuSvSpSni9Kkop8QXJyiikAzkBxOcI9dOVy4q5SlOYYXKp4HUYYPGcqucLqeYxA8Kp-REJ8VyqsAQ5aGy+ELQFTJAD8lIuSkM8gFyPy38s6Y3dyXipMBxY9HfSq4YMocPdalKm6JzKgf7cwkaJIGrEok8IwHK-gVxBQCzPiLK8Km4pQF02AS-WScoAq-bJqxSlqjAOanJA6MCfBZzCAnJOqTMBIcGiLPBEChIZzAhCLb0sCX0r6TMRGhGr6A0OqJ8g6ZzAAVWfJhoSASEzAdByQAE0bBIaswHQ6aABpCLB0b0g0MCAADV8zhrwURucwSFyoizRF82kQiwxoNDZv0GkWJu9LZqIXAtJvbGc2fPFsfJyQxpSOcxSLBpsHJspupoloFogPRDAgSH0AOippyUzE+Ai3Ftpo4VcQgKfIdDAn5psAgMFqzBAthpyQi30GJukVhpAuJoSF82czwXBqpt9IdFRzZogISAVrAjRDAmpowBsDZpVpsDAgITTufLwStukWkV1rAlyszFJqJoSAFoSBsH0Gc18xpqTqIVyRsCJukXRurvAvBvFttukXBq9trqprpplszBFoNG9MzC9KIXdvptrtVrBqFoerPF7rtodppvxrBtBvNszpmypqzH0H9tR3ptNvrupspsPoNByUFufO9oXvNoJqjoNFhoRoVs9uRrRCdrPBJtvtNu9qzrPrdsPoi2PoJtBtLohqhvJvBu9u3psGJqjrnvpu3trvRszHFodCIRxpm23typRygdhrAmBsDxkjckgROovMyyII-2IBBDojG3TnLJWwYZXW73dnrBGkUCIJq1oYGJSv+BO3VELzulWKkgFB4ZBCzLJgkCukRD+BWKTDEf3VkYocvOKJTGSOzFzGGJEcUbdBC1hCPSj2wVEcsNznrDaz0b9BMasfQRYaK0hCO0BN73PLUagBoHkdMZ7DxzhCy1TBoEsbGLtMfT8fgACbG1MZ8c4f8coxsaCZ2JbPY3nSisoYQGvl2P4E3MON+rUDQDKiPL2EuKOHivVVSkkfuJuCUDvJAAgHM2D3t1caoYMiPC+gwBCEaavKuG1lqdIe0noPzRD1LE8Laf6as21i0MtC4CTC8kC0sBWGGJIIQHz3rBm38mlxPVrCTST3zw9OqgFAIIYILHvkcKHXPE0x2fglWdrBm3mk0xrKkEceOwgTMCqxBFERsBwxTisNhBudKlER2N6KSZcDXNqQmdeDV2c1TEwgOd8qdGGxVDwndlcWJrSGF2IKAIYpPAbxuhuRTnaiUrwpcH5z4oWhXLPHShchcCFAsG2pTnaDit8neIuQL2yzBDcoJl3i2VPhupcGxdCAomKW2o4rwrAB32KGBEUBDKvORN9FKkvXDC7B43sdZBrNJfIeKDT2ajgTXC+qccSfVKJAcEgughhYzK-xrI1fPwybBfDw8m8AsEomAmWeuj3SeblMtb+JQFjC8DMEksUAwEyVclyXyRVLxC0e6DNYhAPADPW1lC+hyDCAOyiCiCSEhjoE+GCFCAqBUIuHIFpBe0wPb2wIdlwIZCucEbJZEu6l6iUGBn3mUCmMMGMF9csEyHUDMAaDiMSf8JcHAJAtLGGEokXDojASsKfRSEhZLz9FHYgTtZbfKGGhIygAdAGhKBHE1PjWGnj0+08PUUEH3fxQQlIHIu+ZWQ6cdbMj-hdxLYpHRgwCufxNFDLZwtGJmY+DuSJ3wMWfdQ3D0S3DhAsCglrHdUMJnnTP-yEVfngjXWvXJA8MtYuabjnZ8AXfXz6hXZq3R03ZODKGtGMDnlm2PRgBUEPfgkmL-eEQgU+Zug+ByVqfgHsspgndFz0Sg4hdFx6OEWoID09iMmQWIkRNBG7ztEpINZCxeLIbePDxKagjKfITb2skSc1ZHQYHZHrwTyT1mzxsvA5yB1dy07mHZGdwAQM94REs-1AM8zM9SXSTAhcmPb+NU-VEUGJocCgAdZNHz2Al3330Pz6n3hKGjwhAin+DsMOANG0CoO73k6bjxG0DM9hBMwS-hamFsBoHYFzgdFsAHSoGS5hey4mHurEgchykjwYOAgNDrwoAbyTxTws-H0B2B1Ipz2vbdwcjjyKBKAOv4ADdSCDbyRLtDYCHDbzAQ+jZJColi2dkBQTf4DRj9i7EDlfRs+6Ds9cnIvcP3RsAAH4bBRDZ555kYFAstSAkBSJpCkBRCZDdAk2U202M3qgwgmjLg83+ApjIkPcgWAPm2fAL3CRwR8Q8Y3uisKQ+3-MpxB2qIOAR22HzGXXCNOyq2xK+o627lKJ42O2ckShW2Mh23SBO3AJc5PZiAugRpqGZ2hEOuxhuvF3uBl3V3hxRwsP55ZtjvqxbA92D3dV+4Um1GguAeO8HZ2OIOZ5XFRKa2GQ0x630fxAPuIEYOuw914OLPEP4IqeuvUOeKlAMOxcwUX9hhTBuBS1COJ4SPueZ5JjwoY3gAkv2w6JJS+lKRMJbe4W4SAItj4IoPYRqOFgpA6ORBGOSeyeKOtL9sqIb130ys4P91wRxfxLJfpepi8eCf5fJj-gXO3OHWx1awWMVuug1uHPNvjtWQKOM-3OG3YT6vXAZxVJbAreJvnfwu7eUvCBHePMXf7eDX3folPfQVaP6PA-SeEADQ70ok1RQXMn5gtyjixBmBTjmBGBjyTM1BrzKm7M1Aen6mZOJAynmmhnRC2nt+ymrNxC0g6myH7cPjW-Bn04D+Qgr+T+YhN+L-FIMg9-05WmggThzgunlV3lcp1OjeadrDyEbXQoc8+fvgH18hURwQt7L0JQDFwN4My6pDcMJC2x7ZdszRXKAFWNzelnMvxVEHHxR5kAqsygMCAgHj5TFIgH3XZilEUDkBH844XrLYF7jIl6BeAtELrkIHVt4+w0cVmQIoF9QqBOgGgeQxwEMD98XAqEMwJ7i1JticpY3DVnB5PhUQOvDAHHhqhpEL8NFC4MoLnAP5fOz+DQSzC0FykjIegnzkNQwDmCKAmgwLBMXkG0DEQig+AKkUCyWDD8RkVzPwHB6C4543pEoGQAgAOBZw6ZNQcYKcK+UvoLgtwVPDiLWCPglYGIq4EIA69-gZjFVA5xt6rtYhw0O6ukPvR+EOMWzAZp4CkAOwQOlfHtiHiMALBtw24KTjoRBDBCnAEVSiC4I0hRAk0X3FwXBzAKFdDsR2XoUXxKGDCwCq7aPjUNgDvkMmpoVxC4L0EBtCAegyIRMX-7VRVI44a2CAAui3gLobwD4HoK+i2BYSXBcEGOzOxjZoAWfJhliFWyFZIQbYOgBgDKg7ckQ7A-AfOHeHG5H8iPWLLFmMH-CPEwIWluixTiC59sceaSuYTroSBSwm1EongjeyqwIAZVFITdCyynwawJ4CAhAGKBVhAiTcKHPs2aEOBWhDBTwEmGuHKBHGR2GwSzHIB0Erh5fEDpEVRA6Cjh65PYNsN2H7DhgRw5AFCDVzcEielwqkSyNRJ5ZlWG6Z4a8N27iCOBXw8Qb8PvjEjDEpI8kZREpFaAWRtIrMDmG6BLCRuTI8UQ6z1ELDbB5AJYSsLSLrFtR1IkXsIm5HqgvovIugH0JcGRCYR5sQUacLe7nDRRTke0RKNuGMhpRTwl4W8IVGfDbAyo-fHD2GqmCiRfJEkS0KlZajmRZo5tKXBzEHYjsJonUQ61iFrQ6i+2YMWaMmHrJUsmQcZjmK6F5iAOpo5QMWKL7RDWo7UUgLWK6H1ijs5Y5sWkUrFcoYiXY3MUdmiE5CtBIAGEX2KnhcizOj1fgUDkEFKAThwogMeqFcSwgiBtbEgQ63IEoYhBX0agV2w3FnhZCJoELEf1VgggYuvENPLYDTazlABtXdkGXwdaYRgIiLUFEpCC4Gg02s+azsMDSSrd7OVCcqGZ2AiCsMu6uAHjpTe7ARb28+H8RV3PAzp2QefCkoG2yQDc-QT0DtvxxVBIB1ABQRtEjhRxo5dC1OcKKRGpJUQxgNfUEBT2THDgROlBfZlfy+JsZqhYwKJJVwAgGgcusAP8RuGCAkTLY4kQnsvRug-iaANvQ4OwSUIt8vhqpYbgaLzD-ERI43DCLAN0D-BmA8rRVlKKTBrZWQNpXHCP0EY3kyurkZAIJKn7ZNOQagBfvpmYBL9TyYgYaKUBvJVN7gIAXYOwBPJXExAOvZyDvgjqI4darknYEAA
const isntAttrs = isChrome
	// eslint-disable-next-line no-prototype-builtins
	? candidate => skippable(candidate) || Array.isArray(candidate) || nodeProto.isPrototypeOf(candidate)
	: candidate => skippable(candidate) || getProto(candidate) !== objProto

function v(tagName, attrs, ...children) {
	const kind = typeof tagName
	// eslint-disable-next-line no-constant-condition
	let candidateType
	if (kind === "function") {
		return isntAttrs(attrs)
			? component(tagName, {}, [attrs, ...children])
			: component(tagName, attrs, children)
			
	} else if (kind === "string") {
		let candidate = attrs
		let l = -1
		while (Array.isArray(candidate) && (l = candidate.length) > 0) candidate = candidate[0]
		return (
			l === 0
			|| skippable(candidate)
			|| (candidateType = typeof candidate) === "string"
			|| candidateType === "number"
			|| candidateType === "function"
			|| "nodeType" in candidate
		)
			? element(tagName, null, [attrs, children])
			: element(tagName, attrs, children)
	
	} else {
		throw new RangeError("string or function expected as tagName, got " + typeof tagName)
	}
}


function V(tagName, attrs, children) {
	if (typeof tagName === "function") return component(tagName, attrs, children)
	else if (typeof tagName === "string") return element(tagName, attrs, children)
	else throw new RangeError("string or function expected as tagName, got " + typeof tagName)
}

function component(tagName, attrs, children) {
	const cmp = tagName.bind(null, attrs, children)
	cmp[componentEarmark] = true
	return cmp
}

function element(tagName, attrs, children) {
	const el = makeElement(tagName, globalNS)
	if (attrs != null) setAttrs(el, attrs, globalNS, tagName)
	withRef(DOMRef(el, null), () => {
		withoutRange(() => {
			emit(children)
		})
	})
	return el
}
