import parser from '@typescript-eslint/parser'
import { test } from 'eslint-rule-tester'

import { default as rule } from './test-case-new-line.mjs'

export default test(
	{
		rules: { 'test-case-new-line': rule },
	},
	{
		valid: [
			{
				code: `
describe('xxx', function() {
	beforeAll(() => {})

	const a = 1

	it('aaa', async function() {})

	it.skip('bbb', function() {})

	test('ccc', function() {})
})

describe('yyy', function() {})
				`,
			},
			{
				code: `
it('aaa', function() {
	expect(1).toBe(1)
	expect(2).not.toBe(2)
})
				`,
			},
			{
				code: `
it('aaa', function() {
	expect(1).toBe(1)

	// Comment
	expect(2).not.toBe(2)
})
				`,
			},
			{
				code: `
it('aaa', async function() {
	setUp()

	expect(1).toBe(1)
	expect(2).toBe(2)

	doSomething()

	expect(3).not.toBe(3)
	await expect(() => Promise.resolve(4)).resolves.toBe(4)

	done()
})
				`,
			},
		],
		invalid: [
			{
				code: `
describe('xxx', function() {
	beforeAll(() => {})
	const a = 1
	it('aaa', async function() {})
	it.skip('bbb', function() {})
	test('ccc', function() {})
})
describe('yyy', function() {})
				`,
				errors: [
					{
						message: 'Expected a blank line after this statement',
						line: 3,
					},
					{
						message: 'Expected a blank line before this statement',
						line: 5,
					},
					{
						message: 'Expected a blank line before this statement',
						line: 6,
					},
					{
						message: 'Expected a blank line before this statement',
						line: 7,
					},
					{
						message: 'Expected a blank line before this statement',
						line: 9,
					},
				],
				output: `
describe('xxx', function() {
	beforeAll(() => {})

	const a = 1

	it('aaa', async function() {})

	it.skip('bbb', function() {})

	test('ccc', function() {})
})

describe('yyy', function() {})
				`,
			},
			{
				code: `
it('aaa', function() {

	expect(1).toBe(1)

	expect(2).not.toBe(2)

})
				`,
				errors: [
					{
						message: 'Expected no blank line between `expect` statements',
					},
				],
				output: `
it('aaa', function() {

	expect(1).toBe(1)
	expect(2).not.toBe(2)

})
				`,
			},
			{
				code: `
it('aaa', async function() {
	setUp()
	expect(1).toBe(1)

	expect(2).toBe(2)
	doSomething()
	expect(3).not.toBe(3)

	await expect(() => Promise.resolve(4)).resolves.toBe(4)
	done()
})
				`,
				errors: [
					{
						message: 'Expected a blank line before this statement',
						line: 4,
					},
					{
						message: 'Expected no blank line between `expect` statements',
						line: 6,
					},
					{
						message: 'Expected a blank line after this statement',
						line: 6,
					},
					{
						message: 'Expected a blank line before this statement',
						line: 8,
					},
					{
						message: 'Expected no blank line between `expect` statements',
						line: 10,
					},
					{
						message: 'Expected a blank line after this statement',
						line: 10,
					},
				],
				output: `
it('aaa', async function() {
	setUp()

	expect(1).toBe(1)
	expect(2).toBe(2)

	doSomething()

	expect(3).not.toBe(3)
	await expect(() => Promise.resolve(4)).resolves.toBe(4)

	done()
})
				`,
			},
		],
	},
	{
		languageOptions: {
			parser,
		},
	}
)