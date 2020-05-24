export {Emitable, FragmentIndex, Skippable}

type Skippable = null | undefined | boolean

type Emitable = Skippable | Node | String | (() => Emitable) | Emitable[]

interface FragmentIndex {
	fragmentIndex: number,
	lastFragmentIndex: number
}
