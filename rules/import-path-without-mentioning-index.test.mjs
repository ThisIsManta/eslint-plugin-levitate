import { test } from 'eslint-rule-tester'

import { default as rule } from './import-path-without-mentioning-index.mjs'

export default test(
	{
		rules: { 'import-path-without-mentioning-index': rule },
	},
	{
		valid: [
			{
				code: `import AAA from 'aaa'`,
			},
			{
				code: `import AAA from './aaa'`,
			},
			{
				code: `import AAA from '../aaa'`,
			},
			{
				code: `import XXX from './index'`,
			},
			{
				code: `import XXX from '../../../index'`,
			},
		],
		invalid: [
			{
				code: `import XXX from '../src/index'`,
				errors: [{ message: 'Expected "../src/index" to be "../src".' }],
				output: `import XXX from '../src'`,
			},
		]
	}
)