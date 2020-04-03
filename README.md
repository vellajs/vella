# `vella`

pre-alpha, post-vdom Web framework

**CAVEAT:** This is a very preliminary release, more of a proof of concept (and then, one that has already been explored by others). Some corners of the API must still be rounded. There are bugs, and missing features.

At this point the documentation is intended for people familiar with Mithril. There's quite a paradigm shift though, and it doesn't fit every niche that Mithril would. While the view language and model becomes simpler (no vdom to factor in), the data layer becomes more complex (because you must provide streams of fine granularity to the view if you want good perf) and will require either strong patterns or libraries for ergonomic state management.

## S.js tutorial

`vella` is currently built on top of [S.js](https://github.com/adamhaile/S) by Adam Haile. It is more or less Surplus, but with Hyperscript (and composability cranked to eleven). We may end up forking or replacing S, but the core ideas will persist (it is a work of beauty/genius). Understanding S is required to get `vella`.

Lexicon: in the `S` docs, streams are called "signals", and dependent streams are called "computations". I'll use the same terminology for now here to make it easier for you if you're also scouring the `S` docs. They are mostly push streams AFAIU, but the author descrbes them as hybrid push/pull somewhere in the issues, not sure what he meant.

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

Using this API lets us achieve what people thought `m.prop` should have done in the Mithril v0.1/0.2 days: namely, update the DOM automatically when set. Also, you don't have to call the signals from view code (unless doing conditional rendering or combining values in complex ways), since the hyperscipt factory understands streams naively: 

- bad `foo() + " " + bar()`
- good `[foo, " ", bar]`

## Core API

### `v(tagName [, attrs [, children ] ])` -> `Element`

where:

- `tagName` is a string
- `attrs` is either
  - `null`, `undefined`, `true` or `false`. These values are ignored.
  - a plain objects whose keys represent element attributes, properties, or events, and whose keys may be either the value, you want to assign, a stream of such values (on stream update, the attrs will be diffed, and updated efficiently), or a function.
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
- `onRender` schedules a callback that will be  triggered a microtask just after the current sync update finishes
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

A live zone is a function that will wrapped as a contextualized `S` computation (i.e. a dependent stream). Depending on the context (`attrs`, `attrsValue` or `children`, it is expected to return a corresponding value (or a stream, or array of values, composable at will).

When one of its dependencies is updated, the function is called again and the new result replaces the previous one in the DOM tree (entirely for `children` and `attrValue`, by diffing for `attrs`).

### DOMRanges

A `DOMRange` is an object that represents a portion of the live DOM. It has a `parentNode`, which points to the parent of the elements it contains, a `firstNode` and a `lastNode` which are identical for one node ranges, and different for "fragments". At last, it contains a "parentDOMRange" which is defined if there are serveral nested DOMRanges that have the same parent (this is an implementation detail, only here for completude).

DOMRanges are a stateful. If they represent a live zone, the `firstNode` and `lastNode` will be updated when the zone is redrawn. They are used internally for book keeping on redraw, and are also exposed by the `emitWithDOMRange` function.

We also provide a `forEach(DOMRange, (Element) => void) => void` and `toList(DOMRange) => Element[]` helpers, but this may change, I just went for something simple for the initial demos.

## The `lists.js` module

... provides key diffing and efficient list rendering. Still a bit buggy.

### `v(List, streamOfKeys, renderer)`
### `list(renderer, streamOfKeys)`/`list(renderer)(streamOfKeys)`

Both provide the same funcitonality; one is nice to inline in the view, the other is nice for wrapping a reusable renderer (though it could be a bit of a gimmick since you can just pass the renderer around).

- `streamOfKeys` is a stream of arrays of unique values (there can't be dupes at any given time)
- `renderer` is either
  - a `render(key) => children` function
  - a `{render, beforeRemove?, beforeUpdate? onUpdate?}` object where `render()` has the same signature as on the previous line, and the other hooks are in flux API-wise. `update`-related hooks provide enough info to create lists animations (see the FLIP demo), by provinding DOMRanges and a keyed mapping.
