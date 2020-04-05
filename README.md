# `vella`

pre-alpha, post-vdom Web framework

**CAVEAT:** This is a very preliminary release, more of a proof of concept (and then, one that has already been explored by others). Some corners of the API must still be rounded. There are bugs, and missing features.

At this point the documentation is intended for people familiar with Mithril. There's quite a paradigm shift though, and it doesn't fit every niche that Mithril would. While the view language and model becomes simpler (no vdom to factor in), the data layer becomes more complex (because you must provide streams of fine granularity to the view if you want good perf) and will require either strong patterns or libraries for ergonomic state management.

[You can find a few demos / literally the live tests suite here.][1]

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

[1]: https://flems.io/#0=N4IgtglgJlA2CmIBcA2ArAOgJxoDQgDMIEBnZAbVADsBDMRJEDACwBcxYR8BjAeytbwByEAB4oEAG4ACaAF4ARvAK8ATvAB8AHSrTpo5gGYNAZVY1WEbtIAS8GlHirRAeiPbd+gA4aAKswgSaQVYCCoAayCAdwCEaVZmeGkaLy9ZINDJeCR9MK8AV1ZpElYATwQ5LRBeLxpuCDKkAAYMACYq+NKveDluRO5whV4AD1koRVCIjQxpAGFQgekq-Koh3lYO1l5pCRIaEPgMVx8dPQNVD1cJSQ8dcSkxuRoCQQvzjQNjMwsraQAxXjrJyudxXKQeLggEjwBDcSz8MiMADszRAAF9cNQ6AwmAArMg8fiCYSMCBgLxqIrAU7SAAygVYuGkoRKTJpJlwNKUKnUACV4GBeFkmWtGdIBQ0mRLWAB1BrMAAiAHkALK8mhUADm8DZnh5AFE6swmZImfx+QRYLwokytvTWdIovKAHImHRo6QEVS8MDSADkWVgsBoAAEWi1DH6dDo+FQSvF9kE5NJqVQtKxHMHSvAoJy06wvTRNfQBCQ8+mLKxVBAFIV4GXo6w+OT+EJWA38+blFaojl1JbrTZAeFy1sqPzBVk+wKhfAh7wR42YnVwrxR+F4Nnc42N1uAIJUMmjvKFDt6ZhdJwkbjVryMrmFMd5vS+Xy05+yKgFVgASSo9vvTwSEkTVRxWRxVH8OdAW3fMVlFd0YwRIpuHyVR1AEaRkxMDBJBoWB8ngAAKKpMxoLcqgASh0BAiggLDpCaaMqFjeNrw1BjuAULCNGKeAcx44oq3sX05F4kwiLw2BBK4yT8KZEp1DoIjKMohT+KgaiWOQz9XikhiiLAEhKME1N01YopeEKBicKkwiiKaLT01o2QGIARgAbkbCzdIY6FfwEJwpKIlTTOkKzWCIiAAGpopMj0mSMpzWBw7gEA1fIvBCkyxJTRtzPS1Q-z0-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-YEcTXOtVcflIuL6T6BRDUBzJD-YGLSjlAkOTGptTH1ymh2j2GGNVDwxYeARGSPohcf4KtfA5ax2o4Iun9iGcgCZ8xtnrL0VpeM9wHjrB33pi7AOKI1Pu6CJu-WDAMPmAhTV8Kg6qc1ec0FwBDADgoAy0kIEImJaYl036nTTXRF+xMiIlAH0uvJau7AIb+jxvTfm8twcKitu+paTAVQL9qTLtZH-a7JDdRLAjewhdAixFrrwGShAqBMCrbx6kMReLlX0+IKRp82aw1bX-PEwAFnCS4+LKGf2vetxawuDNOXcjUPACcs5tcibLCmKP8B+pt60RZxN4iGod75E3ndOPsT49UOEDOZbjavAgPhCAAAvbHVmKfA4cxxHa6TuOcrH8UbY5CP6JBzai3Q6LB8wt2-tpwy-E1PfyJB+w0IM5q4Kw7oiMI7up+wsMIGAJQ5QhwNQdQDQOayYTQXkwB-GsAGARIQOJADQm0eMnmv8QBo+0qoBg+7aeBqcZaruaaRQPI2oH8F+MI0kc+eOBOGcJBAW8AfoMiZBs6r2y8hWxBlgD2AB0kwcyYv+QmfetUQgmoCQ0gBG8MdcL2eKRB0qqcYCShrAduwBZahBJk+EmOfAQYmsdCQYSanBxsYQ12fer+5+joSQ3O+6EW0ISagQTI6S9aZ05CsWVmDUoBqBGo6BU8QgUAHWGhia9m0KCAfW+ws4PB0qxWfeoht2CAWoUhMhbkSsKBAgaBGBrY2BIqgkWhks6hWi4GyQG0WQ3qYafqKY4BCACi+mcYWRVAOQUB9QZQ8MQQX+LOYQbG2ctBvAMuvqsqti1R2QUcdRfhmBTRtQLROabkGAaA7RfsnRaY7OUcXaea8GwQ2Y-R0qtGwxtRmRU8kx0BrRrQCx0IBGXRKxVQC++6QenKfGwsKhiSYeEemByQ7C1YtYggus+0SGlS0gtkkim828bSOksBAJyeV0W86eSGm+50dkqe0JyULk9EcBpeosugtOlRLKBCp+gaRmxKEiKePyTsiw06fQlO6eCibqoSX4hQtiGcZQ3QSAVQXxY4CsYakiSAGiwwl8UcNgfK0gCiNgSo2xqcjsCwAGKYvJ4MvJoCBRQscalegxfiks1IIAUWNABG0IB2+EVQCizik6xhQkSkRkxQxGPOL2GJRJhEQQSWxpew9AnQ3QLgik+QcIaEfmWiZKjyC4ZswBRErGiBrAkceuqhFsGp68BG6x+pUceaeaHJwZBU9GCiOpY28siiSZY4pJAGbsVUNUdUMs8w7p4Q4MVEKheBFZqhOQVAcssAeiLelqoqm+fJ6pmpBGKgfRyAcZ+Q4K9s0ACi9AicQpeUkZ5gHZgIsZVQmoYKYS6IAiNMqiuJo+IAJgz+6S0kYQjg3Q0KbYhm6W1glYLmiZAxIAbJ-AtiEpzsrsj2EMpQMM0gaIrKFJwO7Z6xPsguTW4ULEkpYp6G55yxTIwAV5AwN5LZ4MLZqkj5z5oR2oOwUZnZX50AdxqcSpUs2JrK3wciNpUiZB6a0gL5cFVQ0UsgsUCSY0q0KSbxJ4WSvxeoVFW0-Af434ckKedFVMPkKgqE0IMKSeCJREBe0IWkVMxRqYNM-AXFfarsklPFwJ6eGIrclM-AIQaE0lvA3FOYAlOh8lH4VM-ANFABgG-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-8LSD+PU-Uz+M6L5wxH8xAACyAuieXn8O95999750RMZHfa8VtOBE4FBPOGbhCz5EYAxDvXvcPaPQUwIOJhQ6FemEYMh43SCoFJhMmAEr0TfVW8EPzB6xCfxWnhnr9G19m2zCdGDJDHTzDHDL0nbczD+1d-wdPQ+XywkIYAoxAU58LhTfzdIAAMQEAAAcNeOXyh4oheObqcRPidFPMvfNOQ8vSvBAqvtuZnwP3yRgMPD9F4vW14t4e0ar4Vil0sfoO7VAGAOVm+8v0A5A7ZnZlQZ5uVpqGAAAjvkMMH6ONy4t8VrMYp+NO5rFlkkDDUkI4DIFsNVFRnLdZQ1IW7wCugErwMRncXoP4-fYE3fo+PwPrXoJxYCKvOvA5E5ONHoMUa7wBVH7VXpT+c7DkJ-SrjTJ2QJYCKFCRW5HjX1XoFlMP+8pTL5Y+UyJ2eZ5rZX9IK+LSLX-1ZMohUnjA71W32y39ZTJIA1DRTXJeIoNX1QErJ1Gqz3zmWpXrbP9RxP4v-jTZaen0X1U+Sujn9bA1Hd4rpl+ulAAUgEL4gAIszNUvtIHL6w9tsSVP8ABC34+QDm13Lrgf237xhQW8QIBrxFmq41I45AVIiOXIBkd4YTIVoKzR8hucGIKdE2JNR+T0RCBXCcgSQIsRuQmQTQagTpEFYwt9u9-LAUUH+KAkU8ADUKiJSP741QWKLNyEtSjgTNEyNMU-jRTv76UkqhlQQVTF5KHA82vgHaOZQ8r40nycdfGlN1AF6BhgilRJH5RpAuQZKSzWYGhCqy5xPAPkEgMbF2j8hdy9PQQYK1AFT54ASbRToBnxo+QYQ6PdSrvVLi54sg2PCdFP1kD8EIh4MYQnWXkEpCUWGPUuEMAJTsUaYPkQ7vky2zfBdo6kWEFPH1DQpyhW2BUM5k1iYEPQyYGEPjVPTcVHBzgs9MmGAAwhyhDQ-gKULFDQgKhmBKobmD4iwBah9QrbAvypgegYQDhLQZTAcHQonBLmLoT23liJDZh7-PqvwGCGCAt+7VSZLEM-qPwB6MQ0ogfRx4bBEhyjH5CsKgBrCXB8gpTlcO7a1kjCAAHy+ElEE8n9LIVEMHq5DSgUFJYXoEeHPC1AGAUAjJXbTqskhDwqISQA6HrCZ6EQsICPBYjQIHsNgXwCqHe5JV4hbYU4R8PSE-C-heeZFsmGyECBPe8GUEd3wRFCCqixQqeIML6FbYxhNQqeHUPUAzCGIkIzoa4OZFtC+0qIlwTCOQL+Q1yIw80JSSh5sjMCHIiYf0KoDciJhUw-kVPGEpatjBPlGkAv2d59V2M+sOICyA4RiZWSk9F3kRF0aP1nCARJwP-1d45w-Q--UiLvW4gWj7Y-DG0X1R0YMgmQbnR0T4JdFEQ-Qboj0VCE8FFAfRnCP0RyipiBiHQIY4oLGO8EQQ5acAh+sBF0RO82WToBIK6AjF5iu+VsV3mWOj7eI2CmsLvsACdBQAEgCiN2rR3tiJAwUbAFkowyaBtjOERAIMI4hzC+NWkPzNfr3Ed6Ngdu0CQqndFUDJRaRWsEESbgoyrDYgZuZxqRCkC2IByUcdQAhBWJoYIya2a9ukDgxRAIsE0G+I4CgAzBiEtPE6ODnFBZAPCVkeGsaRm5dY-Y5BGdFDjnECRswWsZGsqTPLX9BGCI4RvZ1UJ19U2R9DUjCHIjDiCe0E7aLtEUJaJD+ooJ9goT0R+UMQx-BEVUH3FoxTECImwdTGW6NgV+kIYYWqMRCMMUASAYhuzixD0ARAnMf2JCFjDEhWA7EmOEyMzr80nEH6GiPRDVa7BRE5EHIKewGAIEIRi8VgDkAQAvA5JBFYUTkApAaZvmzEUINIAAB+7LJkZ4JnJUACMykxSdIDQC0dVJQwB1k4DMnKALJrQWjo-GPTLNiAB2VSbUBgDLwHJLwHIFZOGDaTPhRkgwWEBY5eTTcy8HIAjBcmGBrJXIFcJqG9DgQCMgkw3soCgBeTeA4xfgNOCI555gpcsJAFTT1YyJxJgQSSaUGklWhZJNIAcBYCUmOTVJKgAQARj2ydiLJQwfdJFJ8lagCMcNLsfDDcgJS3BRINsAolHQqglQJgbsUVNgAlSyYJ6CqdOyzA1T1K4QVSdxImlRwqgW0wqFTXWDMBgpOgIevhhZwsYg6arJjo0EYiqSxiDRI4tMQWokATpHvC3OgTS7XTxOt0zyHfT95Rk0yG5JWCVMCFMiJJa02nhtK2njSBA8cTwFUDqGrTEJMKC3JmlmAmBZpOQCkW+UBAKJ3iVYF3FGXWKT8PkkAikVlQfhHkOaguXUR0BxkIU8ZVMj4kTPHLL8NWZM6QBSN3EdBqZ0APGpANMTvMtAhgTNGq3SkvYspY0GiUqIRAiA0AaAVEGiGbhAA
