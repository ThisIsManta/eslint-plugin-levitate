import * as ESLint from 'eslint'
import * as ESTree from 'estree'
import * as TSTypes from './node_modules/@typescript-eslint/types/dist/generated/ast-spec.d.ts'

declare global {
	interface RuleModule extends ESLint.Rule.RuleModule {
		tests?: {
			valid?: Array<ESLint.RuleTester.ValidTestCase>
			invalid?: Array<ESLint.RuleTester.InvalidTestCase>
		}
	}

	namespace Rule {
		export = ESLint.Rule
	}

	type BaseNode<T> = T extends TS.Node ? TS.Node : ES.Node

	type WithParent<T extends object> = T & {
		parent: WithParent<BaseNode<T>>
	}

	namespace ES {
		export = ESTree
	}

	namespace TS {
		export = TSTypes
	}
}