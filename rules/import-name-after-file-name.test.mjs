import { test } from 'eslint-rule-tester'

import { default as rule } from './import-name-after-file-name.mjs'

export default test(
	{
		rules: { 'import-name-after-file-name': rule },
	},
	{
		valid: [
			{
				code: `import { a } from './aaa'`,
			},
			{
				code: `import * as Aaa from './aaa'`,
			},
			{
				code: `import aaa from './aaa'`,
			},
			{
				code: `import aaa from './aaa.js'`,
			},
			{
				code: `import aaa from './aaa.react.js'`,
			},
			{
				code: `import aaa from '../xxx-yyy/aaa'`,
			},
			{
				code: `import XxxYyy from '../xxx-yyy/index'`,
			},
			{
				code: `import createIO from '../createIO'`,
			},
			{
				code: `import operationQueue from '../operation-queue'`,
			},
			{
				code: `import * as FlashMessage from '../tw-flash-message'`,
				options: ['^tw-'],
			},
			{
				code: `import * as MessageAPI from '../messages/api'`,
			},
			{
				code: `import * as MessageURLs from '../messages/urls'`,
			},
			{
				code: `import bbb from './aaa'; const aaa = 1`,
			},
			{
				code: `import bbb from './aaa'; export function aaa() {}`,
			},
			{
				code: `import bbb from './aaa'; export default function aaa() {}`,
			},
			{
				code: `import aaa from './aaa/reducer'; import bbb from './aaa/reducer'`,
			},
		],
		invalid: [
			{
				code: `import XXX from './aaa'`,
				errors: [{ message: 'Expected "XXX" to be "aaa"' }],
			},
			{
				code: `import * as XXX from './aaa'`,
				errors: [{ message: 'Expected "XXX" to be "Aaa"' }],
			},
			{
				code: `import * as XXX from '../xxx-yyy/index'`,
				errors: [{ message: 'Expected "XXX" to be "XxxYyy"' }],
			},
		]
	}
)