import type * as ESTree from 'estree'
import type * as TSTypes from '@typescript-eslint/types/dist/generated/ast-spec.d.ts'
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
		export = TSTypes
	}
}