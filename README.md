# `vella`

pre-alpha, post-vdom Web framework

**CAVEAT:** This is a very preliminary release, more of a proof of concept (and then, one that has already been explored by others). Some corners of the API must still be rounded. There are bugs, and missing features.

At this point the documentation is intended for people familiar with Mithril. There's quite a paradigm shift though, and it doesn't fit every niche that Mithril would. While the view language and model becomes simpler (no vdom to factor in), the data layer becomes more complex (because you must provide streams of fine granularity to the view if you want good perf) and will require either strong patterns or libraries for ergonomic state management.

[You can find a few demos / literally the live tests suite here. Expect a few bugs at this point.][1]

## S.js tutorial

`vella` is currently built on top of [S.js](https://github.com/adamhaile/S) by Adam Haile. It is more or less Surplus, but with Hyperscript (and composability cranked to eleven). We may end up forking or replacing S, but the core ideas will persist (it is a work of beauty/genius). Understanding S is required to get `vella`.

Lexicon: in the `S` docs, streams are called "signals", and dependent streams are called "computations". I'll use the same terminology for now here to make it easier for you if you're also scouring the `S` docs. They are mostly push streams AFAIU, but the author describes them as hybrid push/pull somewhere in the issues, not sure what he meant.

Here's a quick rundown of the `S` API:

- `x = S.data(x:any)` and `y = S.value(x:any)` let you create getter-setters (`x()` gets the current value, `x(someValue)` sets it) that double as source streams. `S.data()` triggers its dependents whenever it is set. `S.value` only triggers the dependents if the new value is different from the old one.

- `S(()=>any)` defines a computation. Any signal that is inspected (by calling it) in the body of the function defines a dependency. Thus `S(() => a() ? b() : c())` is a computation with, at any moment, two dependencies. When `a()` is truthy, it depends on `a` and `b`. Otherwise, it depends on `a` and `c`. This is great when effects (such as DOM updates) are involved. If a computation is defined within the scope of another one, it will be terminated when the parent is refreshed. In practice, this means that streams (and their side effects) are garbage collected on update.

- `S(previous => current, initial)` is equivalent to `m.stream.scan`. Not unlike `Array.prototype.reduce`, but for streams.

```JS
const s = S.data(0)
const sum = S(previous => previous + s(), 0)
s(5); s(9);
console.log(sum()) // 14
```

- `S.root((dispose: ()=>void) => any)` creates a root computation. S keeps track of the context in which a computation has been created, which is useful to cleanup after oneself (e.g. for effects, see also `S.cleanup` below). Calling `dispose` runs a last cleanup pass (if needed) and disables the computations nested in the root.

- `S.cleanup(cb)` can be called from within a computation. When a computation is updated (triggered by a dependency update), `cb` will run just before the new computation. Also, if the computation that is being updated had defined nested computations, their own `cleanup` callbacks will run since they are terminated. You can define as many cleanup callbacks as you want in a given computation. This gives you app-wide react-like `useEffect` semantics. The React hooks are actually derived from stream-based, fine grained frameworks like Surplus and Solid.

- `S.sample(signal)` Gets the value of `signal` without registering a dependency on it.

- `S.on(...)` creates a computation with explicit, static dependencies plus some bells and whistles. I don't know its signature off the top of my head, see the S docs.

Using this API lets us achieve what people thought `m.prop` should have done in the Mithril v0.1/0.2 days: namely, update the DOM automatically when set. Also, you don't have to call the signals from view code (unless doing conditional rendering or combining values in complex ways), since the hyperscript factory understands streams natively: 

- bad `foo() + " " + bar()`
- good `[foo, " ", bar]`

## Core API

### `v(tagName [, attrs [, children ] ])` -> `Element`

where:

- `tagName` is a string
- `attrs` is either
  - `null`, `undefined`, `true` or `false`. These values are ignored.
  - a plain object whose keys represent element attributes, properties, or events, and whose values may be either the value you want to assign, a stream of such values (on stream update, the attrs will be diffed, and updated efficiently), or a function.
    - for events, a function is the handler
    - for other props and attrs, the function is turned into a stream of values.
    - if you want to pass a function as a prop value (i.e. if you want to prevent automatic streamification), wrap it in a `Value()` call.
    - if you want event handlers that apply conditionally, use a stream of attrs rather than a stream of values(`() => x() ? {onclick} : null`).
  - an array of attrs (in that case, the sub-attrs are applied in order)
  - a stream of attrs (in which case the attrs are diffed on update).
  - a function, which is automatically turned into a stream of attrs by the engine (see *components and live zones* below).
- `children` is either
  - `null`, `undefined`, `true` or `false`. These values are ignored.
  - a string
  - a DOM Element
  - a component
  - an array of children
  - a stream of children
  - a function, which is automatically turned into a stream of children by the engine (see *components and live zones* below).

Both `attrs` and `children` are optional, but if children are present, attrs are mandatory.

You can nest arrays and streams at will.

If present in an array of children, components and functions as children are instantiated in order.


### `v(component, props, ...children)`

Where
- `component` is a `(a, b)` => `children` function.

`children` can be anything that can be accepted as `children` by `v(tagName, attrs, children)`.

A component lets one initialize local state, but doesn't per se create a reactive barrier (see *live zones* below).

### `boot(domContext, () => children) => unboot`

Bootstraps an app within a `S.root()` call. The Children are inserted in last position in the parent, unless `nextSibling` is also provided.

`unboot` removes the DOM nodes, and `disposes()` of the `S.root()` computation and all dependent computations defined in the tree.

### `onRender(cb: ()=>void) => void`
### `onReflow(cb: ()=>void) => void`

When called from view code:
- `onRender` schedules a callback that will be triggered a microtask just after the current sync update finishes
- `onReflow` schedules a callback that will be called immediately after the `onRender` ones, after triggering a browser reflow by getting `document.body.clientWidth`. This lets one trigger CSS transitions (i.e. easy animations) by adding a class after the reflow. The calls are batched, to avoid layout thrashing. See the *emitWithDOMRange* section below for a discussion on how to access DOM nodes.

### `onRemove(cb)` (to be revisited)

`onRemove` lets one define a callback that is called when the last iteration of a stream or live zone doesn't return or emit any `children`. In that case, when `onRemove` has been called during the definition of the nodes to be removed, the previous nodes will remain in the tree until the callback has done its job.

I'm not satisfied with the current signature, nor with the exact semantics. It is used in the eponymous demo, you can have a look if you want.

It will probably ultimately pass a `DOMRange` to the CB and make it illegal to remove nodes manually (it is kinda supported right now, but I'm almost sure that can introduce bugs). Also, have it return a Promise, or `true` for immediate removal, rather than passing `remove()` to the callback.

`S.cleanup` can be used for effects on nested nodes pending the actual removal of their ancestor(s).

### `emit(children)` and `emitWithDOMRange(children) => DOMRange`

Note: these functions are easy to misuse, and will end up hidden behind a less error-prone abstraction.

When called in Component or `children` stream or live zone contexts, these function insert the corresponding nodes in the parent. The values returned by components and live zones are actually immediately emitted. As its name implies, `emitWithDOMRange()` also returns a `DOMRange` corresponding to what was emited (see the eponymous section for more).

*(What follows is entirely theoretical as SSR is non-existent as of writing...)* While `v()` returns DOM nodes in pure frontend scenarios, it could return thunks while hydrating server-side rendered DOM, or strings on the server. A `DOMRange` created with `emitWithDOMRange` always references actual DOM nodes (at least in the client). For extra safety on isomorphic/universal code, you may want to delay node manipulation to `onRender` or `onReflow` time, rather than immediately.

## Core concepts

### Components and live zones.

Functions mean different things depending on where they end up in the hyperscript signature.

In `tagName` positions, they are components. In `attrs` `attrValue` and `children` positions, they are what we call "live zones" and turned into streams.

A component is just a function which is called once at render time, whose lexical scope can be used to define local state, and which returns or emits `children` (see below for `emit()`). It can also be used to define `S.cleanup()` hooks that will be called when the surrounding root/stream/live zone is refreshed or removed.

A live zone is a function that will be wrapped as a contextualized `S` computation (i.e. a dependent stream). Depending on the context (`attrs`, `attrsValue` or `children`), it is expected to return a corresponding value (or a stream, or array of values, composable at will).

When one of its dependencies is updated, the function is called again and the new result replaces the previous one in the DOM tree (entirely for `children` and `attrValue`, by diffing for `attrs`).

### DOMRanges

A `DOMRange` is an object that represents a portion of the live DOM. It has a `parentNode`, which points to the parent of the elements it contains, a `firstNode` and a `lastNode` which are identical for one node ranges, and different for "fragments". At last, it contains a "parentDOMRange" which is defined if there are serveral nested DOMRanges that have the same parent (this is an implementation detail, only here for completeness).

DOMRanges are a stateful. If they represent a live zone, the `firstNode` and `lastNode` will be updated when the zone is redrawn. They are used internally for book keeping on redraw, and are also exposed by the `emitWithDOMRange` function.

We also provide a `forEach(DOMRange, (Element) => void) => void` and `toList(DOMRange) => Element[]` helpers, but this may change, I just went for something simple for the initial demos.

## The `lists.js` module

... provides key diffing and efficient list rendering. Still a bit buggy.

### `v(List, streamOfKeys, renderer)`
### `list(renderer, streamOfKeys)`/`list(renderer)(streamOfKeys)`

Both provide the same functionality; one is nice to inline in the view, the other is nice for wrapping a reusable renderer (though it could be a bit of a gimmick since you can just pass the renderer around).

- `streamOfKeys` is a stream of arrays of unique values (there can't be dupes at any given time)
- `renderer` is either
  - a `render(key) => children` function
  - a `{render, beforeRemove?, beforeUpdate? onUpdate?}` object where `render()` has the same signature as on the previous line, and the other hooks are in flux API-wise. `update`-related hooks provide enough info to create lists animations (see the FLIP demo), by provinding DOMRanges and a keyed mapping.

[1]: https://flems.io/#0=N4IgtglgJlA2CmIBcA2ArAOgJxoDQgGMB7AOwGciFlDLYBDABzPihHzIICdbkBtABlz8AuvgBmEBGT6gSdMIiQgMACwAuYWGxok18XdQA8UCADcABNAC8AI3hiineAD4AOiXPnDKgMzOAymp0ahAE5gAS8HRQ8JyGAPS+bh5eDM4AKioQZOY2sBAkANY5AO5ZCOZqKvDmjAyWOfmm8EheBQwArmrmZGoAnghWriBEDHQEEP1I-BgATMOVfQzwVgTVBIU2RAAellC2+UXOGOYAwvkb5sMdJFtEagtqROYmZHR58BgJae6e3pzJBImUzJdzGMx7Kx0MR6AH-ZzePyBYKhcwAMSI91iCSSQLMyW0zAQBBCpGkSgA7NMQABfXCyeSKZQAK2k+GIun0amoHN65mAv3M8Xi5kK8D6LHM+V6OWIYAYpC5iXgsGWnEFABlsmpcFLtbhBcLzP4MKzBf4DSkjcQnOYxDcSRAyYK7jrzKZLZ4jf4AGoAcSF5gAssEVEGNeZqqrYuYABQlSSwXI1JwMegESU2PrmAAGZFMAHNYwBKHPxHNgUMlnMAfjt4yenAg8DIxcFCaqADkLYaRbAiCUpfBmkmGE3ICFmmQTv4VHROPVeh0xGITgB1RPmDqwEKVvSwbN2SPQGIeOxZEhQXvmMCOGqxAukIiQMKKnJVYLmAh0EgAcm6R6QGQHTMFeKTwBOuoQZMG5VAAIgA8kGABKP4FvAnpCiKiFBpGmLFC69h3shEFEM0uqkCRYj9iUmFGno8qOPO2Y4ahJDoZGKpqmQgoOJwACi4wqLqTxar07g0uYVjuiq9DuO4RoxLePEkLy3RBDYOTSQKJCuGoMT0BKUCWnpYicHQBYKLoZAmUEahqE2NhdC2tlygqJBcjZ8lPCQVE0a0TjUQO4T4bZlGkc0AURfAIVEIUtllOMhRELZYpGal4osAAgiQEBgLZ7RdF5KQqEssQcE2DA6i6XQ+Zh6TpBqmGFWoACSJBidVKT5gWtk3DEnCZDFmLGd5NyuhJ7hqV+HScE4uhScaGCmHQsAdPAsbDAZdBGcMbYkAg3QQIt-DyapZLdBwP6LQQNhSc4PTwJKVgPb0TjyPdxqxitSYvV+NjfatupvVEYAlsWwNPVA+3TQUsI-YtsZgK2n06Xp01EF0i0mj962xvw+16YdliLQAjAA3N5sMLdJzBtZynA-bGJao+YmNqLGEAANRc8W5iSbqyOE2oJoEAgP4dAwzN839aMPGoYtRJw7Xw6tnO6ML6NkpQnz9kWObnErBQFuYAAkwDIzSObCzSwtOGos0eOzk26Qd8DdIr87uMTAD6cOxD9PvuPaqmkh4vTzhzfNy9NeQFGKnDY8tq14w563C57ysM0zfvZ6tPvC7nquwD7i10yrAdqyzstx0UsSxgAhLXCfg3S5ik-wncZxdW63Ji3TSa6m0pJ4wAedsIsQLXBatNCsJt54i9L8vi-eXp1cPXLel6f40uo83GBrPAGzPbkhwt8Wttr-L9uO7w1-b2opibSA27DLqvCiOYCE2Myx9qBgNKZBYwaVbBgSsUsB6gnlo-deMsHrP2GPkd+-JSBi1CIUEswACCzXmhzNQl9dRizoGQMgrQB5WGkjguaXIWZ1mGE4K8IBzCtGGMMNuBCH7y2LBDLhelEEgBUOqEAvDdIwPliWF61C8HgMYCA94n1QG8A0sIYsJZbKP2EDSQUngM7i0TtJDe-Jr7jX7iWby2iSCWIjpwKOZ0Q6OlIC8FUO0WAsxjj3fs0RjZJygMEOgIDODpypj3EhgQmzsWxnvP6sYvEmHYnQq4IA4nGwWKw5hUBFQNySTwkJ5B1JEALAWCohj4H8hSQkhuFSiw8MsXpOm6Q8rwHZiAwpxSMLmB8J3AmZ09K304CQe+Yj+EvwYCgz+H8+EgE7PcUINQPzdDKJIGoIN5A5HnDUJoNQX4aPlgI+y4yv5hIcsbURsCHgiPMGmOgBR3QpxbLUW0EcQgEHSbsvS3MubX1Ubsoxw9znVPMcM8RdZ74gA1O7X8OQxzu30FAcwJR4C-ltCggRNh37ADpEgog3j2J7V1MMDARLhjCD4WoVovABEqFJig7B9BSHpMYewglIBwj8QAJr4vdKMw5LKVAdA6FygREBeVJP5YKkRpLgXCylXUkgDiw52nMpZTy7i8l8iyotf2jM1akzQF3WRUtdh-QAEKYnFiQWM2wACksxcliOmiarVedYCxlJhSA1ECrWfTNTrH8VrbX2q1vks4zri5uqwJ6uRxqHq+otQGu13cQ1wTDZXV1swO4E0Nd6015qoiWptYm9V3R+Kpp1emrpWavUxvMHG-NCb7WeG8v0jwfyhmPwEWMtg-I27DFOKQEIBYOiY3WZecwHleiSjMhZKyahZTXSPNEGI8KfzwqcLeZo8KoB9DkC+VaB4MD4uvkYrKLMABkZ7zDtvEZ22lvaQBZSPcCkZwwu26kxSyx9IjdmiGPWUv5-6TXnsvdejtPLu0TKvcME1JqSVnJveBj+X8wUwbg+8p+iGr3Ieg7BkAqjvnwbgZ9WMpxgNQefRh19oqwWnFo2hrhfy4JkdAwhqjEHsMgDglxuC9GKMvpAG+rDkzOPcbg1wn5XD6JZByNkP83Q6AyU4NmR8RB4VjgbHMyTIp+Is2yOYd68LblVBWYyHoxBli1ByKRzW8sjSrssB7OgIEHnGYRSoHWZw4KlunSq3QWnKjPCPIw8yJRXbnKNDmIxOm+YXvMESjAOYEWY1gPCo8dh7Ixj4lc2Iq4uHRfMLF297HhP8VK6VsTwKJNiPw1Y+xDpFWBRorFTBxY5YRctaWfT7tHbQvoLcnC47VMtmLYNmIWlyNgbY++4hDKklcCiHoAAtO5uKzKklZQYMsecPFv3XyK9N+lZC5vvSWytwoa3hhkBogeJ9ekpV6WghzXgJAhs2W5cMIRe0atNrEUaViaEHl6cSkdHIznDMMzkLAG7v2RRPEqOZS427d2oh87O6c3kpM1BzIFRLc51l2ggJwXoMyYi1DHQp+lagSfwAxyKJZaxHk1DFFVLcDA-F6HB5Uao9YMxszELTl4O75CogG7eEwEhvxh3RzD8dCE3qSFqLACg5h4DbAVMwfHfFBIM-swpnMoltQ5gF1GbicYQI+LkJOGokxYjBEcDkSsh4agKfS7CAX0AojFkPTLoatRNIOQ004vT7nEXNETjYJs9kKhlH0AL9dZELevZOK1MQ5g+iYy6xu+Z3OJBE4eDLxwXPNkkO6C90nRBU8KfMuxGolYSAdH3X0WymOPA5i10JRL9n9dEE6oliPUR4pk7AnpI0yvMkuZz+ZBQJRHCFG98GvkgVFqPdgiof7NfokPRY-t-kM2jvDHm8EeAy38IXZAJkPTxBtxMMI5RgTtK9-pMP6d0-tIWVHiR8Lggt21A1b0uFIKEoTfYxYFMvFsDAdvNYZmMAspLeeWMAw+Q7TqDAJdF+UwbIKeBAPaa+K+YFSAlQWMQKXUWMTJMAWArhUgxAkhMgZA1A4YdAsgTAmnERHAm2faOVBVJ0DwePZoZrLBEbDTZoJOXGDaNOeAYWBpJpFpIxQQjaMQVaZgCGTpLuZtbrAZCbPZF+FQAAFlFWGHkLGzZm4Oih-yI1li4TsD4ngBIiz2gNe3fR4PgFtlRjJSNFuRzEsOImikS1c2nWn1n1cJFD3FiAgFWggAAC8J8ah18OISEydHlzI+hAiehngFki9sxvwzwUxop4UQ9hxYhkj08OgrlxZmAyUwDpx8DmYVRyC+N5YVQMBegBhPhRhxhJhsxpJ+BKY6iHtYAMAB1q9GCw44VEZajzlzkGjHCgVxjxFFJSB-w7RHB0IClKhZIi8lVGQZ9OBzsejbM6ckVbRMkPJM8E92J59xFzkIBU9YwVQpJKFRsWxnsk8EB2IqhzBFt25VETjmhpiLj5Y6k-jcCZijQpi+YFDnhiAod-51kod1j10blcpIkKjkjldEUvxkt4VnMudshdRzJjNE4PwPBXMcwGiBifwhiuC4Ujc6ijQ5xLwEAic-cyJPhkiKinixsMAXiCw3iPjSZhB+jdBBjJhKSx1SlPpQSuEgTxEW1ahHQfiYsQMyUd9gAmiEB0kA9yBhTSBWhWiJh+h24cgohmBFsCgz8ox+xTDWN79u0VT+g1SkkNSKTtS2Yxg9TsxSYMA0BDSSFj9TS38kl7MVNUsJRLTJtrT31VSWgHShSw4dTXT2jzBZhvTjS-T70tiUtsCKN7t-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-W+hV3hA-W5oV2IB13r4t31Xd3pI1AN25VC6rmt3uiOCAGPA0R8hNtjZCC4UMHRRPpCgvXiGQ1ljEZB8IF-0IFAEAq7jpJhgiBf5-4Fg6wQOIFeBChd3Wh4PGAMBljYxv2uz3Y2YUt+1HAoAVIiYcPKAoAQwxkqadHpQOY4D5oBpMPWsuEZS6P65v3-NpoBksmVcJw33grOAGOJWjQbrfJ7AaJpYXprqV4rgKMhPl4pS9JuX5ZPCnAABVNnI-WJEvH9x+Uj8jxaSnQ1LhUj-DzgQj-TkvVt+wacL1AxB6A3XoQg1thc7NMAz6BA5Ys1fqY2c4ZsXQEiEkcGGzRT5ltT9nDaGdjWEA85AAsToxWi+WCLgBIBCAxwbXAgzD5VsYv4+Z3D+FaSYzzEUzsgXgDDwfXTxgYsbMmYq4uMUju47x1SpCx2JltQI0QoDoTJd8CEugZoOvUhMYSMeyJgJAYUJyqoDoGwQ+Z8eIb8Xr8ksgMYeICcIRSQAy59+IPIKDpbkvWIeIOoU0Ij7LtQKoxLyzsQYrw9pzmvYgsA3UZkLLgS6acXVPfLlLXgZkfkp4eoD49z92Tzy8bz-ILkfzqODAL7lrnLn8PKRaP8o74AR0viMAdUwY+gPQHwWZwQBYSa578wSa19bYIQNsbtXU9o1oGYNAYLo7-8hHxwJH6M8k1H+AdH-GIQQnlBEnqYduSnmYqro7hAqH4I913KfKKLqn+WTevErg1oTNTHjitQeTwEiVhTiVhXgE3A+9qZjwGZnKPKUBnLioxaYYdlOgQoQoBTQyu6W8AsE4P0IJE2ToGwGwOgEoSWWq+OBFCKzEMAcwAsOgcI2fE4U4flMAD4HoTocI8Iw9H+4FdZ-IDmBYbZr1EBCeTLz6WHqlLHuMWh+hlAJQ4c5RFPpJJJZV6BzNXHxMzucwLt1VrmsMlQTPmBk0hhvP5etQQvhP7tXO11Mvya7B-gKvywSrr81BnoXxfxWMCo4WUfd2RpBQaQ4sCT4BMgF1tNif17WpXUGX4WLv2MPvqtORIxJflft1yfo5nuNEDUVqAtgt1qTsAMaSJ9iAF9hJS5x2a5xeW5+5x5y13h0+8wd5z5mth+YZN-mr1C-lfxv539YwrYQUA63-qa9e4A0IaLFFmY-tpovgRaAEyCbmNLGibXQFoSxaU09IvgMHqo37ScgaYYqWSDfRGx2MDEjZE6p2W8jlxoGcXOgY3HYEb9zAHqAuiLGAJwEausYTgdp3lgkDWGEHY+nw1eZiAAAHLoWj6PxJIKoZgKL0fhiDp6hvSQX-1eYyCxA8gnAhYlf7qFfAf9GWpGDKhE4uAT-KOJJ2pqvVbmC3H8BgCd7hFXm0AXgG1UxBDAQATvYRPyQACOHQbYA8x7Qso9AvQeLJYHIDLASQN4a3ESW5wxALATwSgDtjcof8cwKXIgJFg+xEB3MmZTwHALMF7kfIoDTwNNHarSRTm4-Auq7E8AylbmJQ+YswyXgJUNgrQZZpvBHqLEQGhlFmJNVJjD1AaVyU6piHBgE1BQbcQyuwXzJOtzADUDUGUL2rgNMQY-IIPjH2j1CdGJdDIS1GURlRbAsVEgMIHNiSdWhLLFrMAD6F9C+YAwvmHDWXgI0ehBNK2OonsF5gxgJASLNMJfrugcwSAHIcwg64SpNh5gIoQ+yiFrl2onUJYdNCXY789+oIlJotA4ZyI7acYY6EPVBR8lryAgTfrqFmDb0UmZDc9jsy0qYjXaoKQQJ8VxGkxdQIgJET3BY70CGOEnV6tNErI4wmyFNUEVsKuY7Cl4JI+4qTEjpJIO27FeGjmBainDgavNUGmcOXhnlPgiXdIPOGho41uhNILUTmF+Gv1i+3Q7YK9SlRE1BQxMR6kO1OCzQKA6oFIMc0rC2ISIfHRaAqOZG-DlO8AULhp0Y7DDpotxaSFgPnayFcBs6boYINuINxpIKlJMLFnDH3EAxugZwapj6A7UpO00FUgmydbIhbEkMYkGHH4iXgcxTrOCITn-hcFJI0kFUN0MWKHULRVowvNpBVA5jSxpALMW6CJDNiSA+Y4yI9FgBFiSxTrQmnJxVznVlqUnc0ZeEtFE56xDXPisMMHFE1fhpAT0XoCWE61QkcpZZi8G+qBNAxG44MVyFDHXFxxUAScdaNFHusNx9XKMeYAAA+N42UlbnA5biTG87LYNukaoKil4x408Y4AwANFHqQKKTpYCPHbiyAtYqcZwD-H+V8kP4DMOhXCDpBwwYtNQPuN0CyErxPjW8fePQmUJ-R240xm+OTGjigJaY9sZmMhptiMxeYgsT2L7F5Mw45Y6sSBHAnWiqxi8b8XWMgkNE6YPlXMVwTYjoRoBVErgq2KbFOsuxhYsOMWPolcFeRcnTURMJSCDi7Bu1S7BpAqDUdUU0rCJrtTlb6hRQuJd9pwHSGeBP+nAX8CZKSSb0Q+eocSN2jRQ6SbmsYeVqKEHzMjLJZkiyb8Muz2jugmk+ydpKfROSXJpvYGL5MdEDR0h4IhAT1CWEykOwKgbsLGChSFgQhRiBwalPfRtxbm9EkIcAATBQAqg6SbBgwENHdpqgzldQEfRKllTdQEgKHIyhYCuV7UGvOYaYnuB6850M-KQuzUzjCx4xACQiSgU2xwog+kgWZnthfgx0bSFlJJE4Amj+lYewwX3M0z0wvZBwNwOJCwBOAzIz48cJvCrmaAJDMYrddYl30jAkI5MyYfQF+H0SSgJQACfilaSaEVUWhUnNoZcLJTlDcEYTQCi4l2hEC-ingGxHYjqJbDXQlnWwhKyJp0gBRUnBhPAAWlsTjRy8Yft5BmEkBCQwkskNQA7hIAfAWAN-AyAUDUBD4pCbQByD0AGAlAlneFJJ1-5IAmUtWV2PkFHGvBrkfQVoJtw2DdEVqXiclEOBhC8yZoEE1oLUwZh3szorMgAH56hRx9opyiQEWwIAYQrQNAKVOFlbBTOsQZWfYAFmzBSpW4jLMO0kBh5hZYwGAMbF1mqzzA6s7YJLJUryy1RBQMnubKXTGxpe-AQ2T4A1kugkoBYbgP1EWwMz-+9gKAObKIBOkSAUUVHmYHgAOztwSABekRFtCSd2ZhkLmf2B5m8R+ZrQFWRe14gDpFsiKSqQLK2ApY3Zls9iIthbpVT24pMX2baIHRch0kXmIMAhH8BH0E5sAJOXPBjBpzsgHMzOd9UKDCzKZLcpJMMDHn6IF69wFQA7PcBmMFsx+M7KOI56czzAXRQUI6S1LRyXSbRfUkmQXkkBloGBUPpJ3XnS9j5HghijxT8rCAk57otmYPIzlnwR5Y85uboFYQpBhgxYhboZElDoEFMpwfwJ3NaB3jsqQQRipiHSRFkHIJBHKpiCGF6iIFj+IvurT3qHZQRCwCBZ4KICwKMFeC5BUXwgWzSFgGC6AMPWYSJMr2rgHwApnplz0-+jCB2VjL4k4ylAaANANSBpCiBkk8cckLwGJlMgRw9AAAAIzAZg2hbQLNC0BKB1AagYbsKBuAMBCg1vOUPEFEV0AJFGAKRdoAtbUAKo1g2kHwt3QiLZICmJSJHNpBAA