import { test } from 'eslint-rule-tester'

import { default as rule } from './require-name-after-predefined-name.mjs'

export default test(
	{
		rules: { 'require-name-after-predefined-name': rule },
	},
	{
		valid: [
			{
				code: `const AAA = require('aaa')`,
				options: [{ AAA: 'aaa' }],
			},
			{
				code: `const AAA = require('./aaa')`,
				options: [{ 'AAA': '//aaa$/' }],
			},
			{
				code: `const AAA = require('aaa123')`,
				options: [{ 'AAA$1': '/aaa(\d+)/' }],
			},
			{
				code: `const XXX = require('AAA')`,
				options: [{ 'XXX': '/aaa/i' }],
			},
			{
				code: `const XXX = require('xxx')`,
				options: [{ AAA: 'aaa' }],
			},
			{
				code: `const AAA = require('aaa')`,
				options: [{ AAA: '//aaa$' }],
			},
		],
		invalid: [
			{
				code: `const XXX = require('aaa')`,
				options: [{ AAA: 'aaa' }],
				errors: [{ message: 'Expected "XXX" to be "AAA".' }],
				output: `const AAA = require('aaa')`,
			},
			{
				code: `const { AAA } = require('aaa')`,
				options: [{ AAA: 'aaa' }],
				errors: [{ message: 'Expected "{ AAA }" to be "AAA".' }],
				output: `const AAA = require('aaa')`,
			},
		]
	}
)