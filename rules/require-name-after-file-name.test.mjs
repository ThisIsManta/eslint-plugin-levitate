import { test } from 'eslint-rule-tester'

import { default as rule } from './require-name-after-file-name.mjs'

export default test(
	{
		rules: { 'require-name-after-file-name': rule },
	},
	{
		valid: [
			{ code: 'var something = require("shawn-mendes")' },
			{ code: 'var JamesArthur = require("./james-arthur")' },
			{
				code: 'var JamesArthur = require("./james-arthur")',
				filename: './rules/use-require-name-after-file-path.mjs',
				options: [['./rules/*.mjs']],
			},
			{
				code: 'var something = require("./james-arthur")',
				filename: './rules/use-require-name-after-file-path.mjs',
				options: [['./nada.mjs']],
			},
		],
		invalid: [
			{
				code: 'var something = require("./james-arthur")',
				errors: [{ message: 'Expected "something" to be "JamesArthur".', }]
			},
			{
				code: 'var something = require("./james-arthur")',
				filename: './rules/require-name-after-file-name.mjs',
				options: [['./rules/*.mjs']],
				errors: [{ message: 'Expected "something" to be "JamesArthur".', }]
			},
		]
	}
)