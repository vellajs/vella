const {rollup} = require("rollup")
const resolve = require("@rollup/plugin-node-resolve")
const alias = require("@rollup/plugin-alias")
const {terser} = require("rollup-plugin-terser")
const path = require("path")
const fs = require("fs-extra")

const input = path.resolve(__dirname, "../index.js")
const normal = path.resolve(__dirname, "../dist/vella.js")
const minified = path.resolve(__dirname, "../dist/vella.min.js")
const dist = path.dirname(minified)

const clear = fs.remove(dist)

const bundle = (...plugins) =>
	clear
		.then(() => rollup({
			input,
			plugins: [
				resolve(),
				...plugins
			]
		}))

const normalOutput =
	bundle()
		.then(x => x.generate({
			format: "umd",
			name: "vella"
		}))
		.then(x =>
			fs.ensureDir(dist).then(
				fs.writeFile(normal, x.output[0].code)
			)
		)


const minifiedOutput =
	bundle([
		alias({find: "./src/errors.js", replacement: "./src/errorsProduction.js"})
	])
		.then(x => x.generate({
			plugins: [
				terser()
			],
			sourcemap: true,
			format: "umd",
			name: "vella"
		}))
		.then(x =>
			fs.ensureDir(dist).then(
				fs.writeFile(minified, x.output[0].code)
			)
		)


Promise.all([minifiedOutput, normalOutput])
	.catch(console.error)
