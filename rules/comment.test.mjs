import { test } from 'eslint-rule-tester'

import { default as rule } from './comment.mjs'

export default test(
	{
		rules: { comment: rule },
	},
	{
		valid: [
			{ code: '// HACK: lorem' },
			{ code: '// TODO: lorem' },
			{ code: '// Lorem' },
			{ code: '// eslint-disable' },
			{ code: '// oxlint-disable' },
		],
		invalid: [
			{
				code: '// Hack lorem',
				errors: [{ message: 'Expected the comment to be written as "HACK: ..."' }],
			},
			{
				code: '// XXX: lorem',
				errors: [{ message: 'Expected the comment to be written as "HACK: ..."' }],
			},
			{
				code: '// Todo: lorem',
				errors: [{ message: 'Expected the comment to be written as "TODO: ..."' }],
			},
			{
				code: '// FIXME: lorem',
				errors: [{ message: 'Expected the comment to be written as "TODO: ..."' }],
			},
			{
				code: '// http://www.example.com/xxx',
				errors: [{ message: 'Expected the comment to be written as "See http://www.example.com/xxx"' }],
			},
			{
				code: '// See: http://www.example.com/xxx',
				errors: [{ message: 'Expected the comment to be written as "See http://www.example.com/xxx"' }],
			},
			{
				code: '// Note: lorem',
				errors: [{ message: 'Unexpected "Note:"' }],
			},
			{
				code: ['// lorem ipsum', '// dolor sit'].join('\n'),
				errors: [{ message: 'Expected the comment to start with a capital letter' }],
			},
		],
	}
)