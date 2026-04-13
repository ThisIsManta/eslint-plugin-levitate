import { test } from 'eslint-rule-tester'

import { default as rule } from './promise-all-with-static-array.mjs'

export default test(
	{
		rules: { 'promise-all-with-static-array': rule },
	},
	{
		valid: [
			{ code: 'Promise.all()' },
			{ code: 'Promise.all([])' },
			{ code: 'Promise.all([1, 2, 3])' },
			{
				code: `
					const Bluebird = require('bluebird')
					Bluebird.all([1, 2, 3])
				`,
			},
		],
		invalid: [
			{
				code: 'Promise.all([1, 2, 3, ...x])',
				errors: [{ messageId: 'error', }]
			},
			{
				code: 'Promise.all(x)',
				errors: [{ messageId: 'error', }]
			},
		]
	}
)