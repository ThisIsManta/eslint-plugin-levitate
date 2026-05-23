// @ts-check

import { eslintCompatPlugin } from '@oxlint/plugins'
import { test } from 'eslint-rule-tester'

import { default as rule } from './import-path-without-mentioning-index.mjs'

export default test(
	eslintCompatPlugin({
		rules: { 'import-path-without-mentioning-index': rule },
	}),
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
				code: `
				import AAA from './index'
				import BBB from './index.js'
				import CCC from './index.jsx'
				import DDD from './index.mjs'
				import EEE from './index.cjs'
				import FFF from './index.ts'
				import GGG from './index.tsx'
				import HHH from './index.mts'
				import III from './index.cts'
				`,
			},
			{
				code: `
				import AAA from '../../../index'
				import BBB from '../../../index.js'
				import CCC from '../../../index.jsx'
				import DDD from '../../../index.mjs'
				import EEE from '../../../index.cjs'
				import FFF from '../../../index.ts'
				import GGG from '../../../index.tsx'
				import HHH from '../../../index.mts'
				import III from '../../../index.cts'
				`,
			},
		],
		invalid: [
			{
				code: `import XXX from '../src/index'`,
				errors: [
					{
						message: 'Unexpected /index here.'
					}
				],
				output: `import XXX from '../src'`,
			},
			{
				code: `import XXX from '.'`,
				errors: [
					{
						message: 'Expected /index here.'
					}
				],
				output: `import XXX from './index'`,
			},
		]
	}
)