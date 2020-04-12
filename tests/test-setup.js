import {setDocument} from "../src/util.js"
import jsdom from "jsdom"
const {JSDOM} = jsdom

const {Node, document} = new JSDOM().window
global.Node = Node
setDocument(document)
