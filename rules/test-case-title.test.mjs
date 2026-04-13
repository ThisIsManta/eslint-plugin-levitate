import { test } from 'eslint-rule-tester'

import { default as rule } from './test-case-title.mjs'

export default test(
	{
		rules: { 'test-case-title': rule },
	},
	{
		valid: [
			{
				code: 'it("returns something", function() {})',
			},
			{
				code: 'it("renders something", function() {})',
			},
			{
				code: 'it("calls something", function() {})',
			},
			{
				code: 'it("fetches something", function() {})',
			},
			{
				code: 'it("sets something", function() {})',
			},
			{
				code: 'it("throws an error", function() {})',
			},
			{
				code: 'it("does not return something", function() {})',
			},
			{
				code: 'it(`returns ${something}`, function() {})',
			},
		],
		invalid: [
			{
				code: 'it("does not renders something", function() {})',
				errors: [{ messageId: 'start' }],
			},
			{
				code: 'it("displays something", function() {})',
				errors: [{ messageId: 'start' }],
			},
			{
				code: 'it("should do something", function() {})',
				errors: [{ messageId: 'start' }],
			},
			{
				code: 'it("renders properly", function() {})',
				errors: [{ messageId: 'vague' }],
			},
			{
				code: 'it("renders proper data", function() {})',
				errors: [{ messageId: 'vague' }],
			},
			{
				code: 'it(`${something}returns`, function() {})',
				errors: [{ messageId: 'start' }],
			},
		],
	}
)