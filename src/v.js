import * as render from './render.js'

const { boot, v, S: s } = render
const { root, data, value, sample, on } = s
Object.assign(v, { boot, root, data, value, sample, on, s })
export { v }