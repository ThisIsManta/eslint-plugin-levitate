import type * as ESTree from 'estree'
import type { TSESTree } from '@typescript-eslint/types'
import type * as Plugin from 'eslint-plugin-local'

declare global {
	type Rule = Plugin.Rule

	type BaseNode<T> = T extends TS.Node ? TS.Node : ESTree.Node

	type WithParent<T extends object> = T & {
		parent: WithParent<BaseNode<T>>
	}

	namespace ES {
		export type Node = WithParent<ESTree.Node>
		export = ESTree
	}

	namespace TS {
		export = TSESTree
	}
}