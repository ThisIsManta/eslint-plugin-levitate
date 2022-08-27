const _ = require('lodash')

const focusedAPI = /^(it|test|describe|(after|before)(All|Each))$/

module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce having a new line between `it`, `test`, `describe` and before `expect` function calls; this applies to _*.{test,spec}_ files only',
		},
		fixable: 'code',
	},
	create: function (context) {
		return {
			Program: check,
			BlockStatement: check,
		}

		function check(root) {
			const nodeList = root.body.map((node, rank) => ({
				node,
				rank,
				name: getLeftMostIdentifier(node.expression) || ''
			}))

			const sourceCode = context.getSourceCode()

			for (const { node, rank, name } of nodeList) {
				const prev = nodeList[rank - 1]
				const next = nodeList[rank + 1]
				const aboveBlankLineCount = prev ? (node.loc.start.line - prev.node.loc.end.line - 1) : NaN
				const belowBlankLineCount = next ? (next.node.loc.start.line - node.loc.end.line - 1) : NaN

				if (focusedAPI.test(name)) {
					if (aboveBlankLineCount <= 0) {
						context.report({
							node: sourceCode.getFirstToken(node),
							message: 'Expected a blank line before this statement',
							fix: fixer => fixer.insertTextAfter(prev.node, '\n')
						})
					}

					if (belowBlankLineCount <= 0 && !focusedAPI.test(next.name)) {
						context.report({
							node: sourceCode.getLastToken(node),
							message: 'Expected a blank line after this statement',
							fix: fixer => fixer.insertTextAfter(node, '\n')
						})
					}
				}

				if (name == 'expect') {
					if (aboveBlankLineCount <= 0 && prev.name !== 'expect') {
						context.report({
							node: sourceCode.getFirstToken(node),
							message: 'Expected a blank line before this statement',
							fix: fixer => fixer.insertTextAfter(prev.node, '\n')
						})
					} else if (aboveBlankLineCount >= 1 && prev.name === 'expect' && !sourceCode.commentsExistBetween(prev.node, node)) {
						context.report({
							node: sourceCode.getFirstToken(node),
							message: 'Expected no blank line between `expect` statements',
							fix: fixer => {
								const range = [prev.node.range[1], node.range[0]]
								// Preserve the existing indentations
								const replacement = _.get(sourceCode.getText().substring(range[0], range[1]).match(/\n(.*)$/), '0', '\n')
								return fixer.replaceTextRange(range, replacement)
							}
						})
					}

					if (belowBlankLineCount <= 0 && next.name !== 'expect') {
						context.report({
							node: sourceCode.getLastToken(node),
							message: 'Expected a blank line after this statement',
							fix: fixer => fixer.insertTextAfter(node, '\n')
						})
					}
				}
			}
		}
	},
	tests: {
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
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
it('aaa', function() {
	expect(1).toBe(1)
	expect(2).not.toBe(2)
})
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
it('aaa', function() {
	expect(1).toBe(1)

	// Comment
	expect(2).not.toBe(2)
})
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
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
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
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
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
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
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
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
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
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
}

function getLeftMostIdentifier(root) {
	if (!root) {
		return null
	}

	if (root.type === 'Identifier') {
		return root.name
	}

	if (root.type === 'CallExpression') {
		return getLeftMostIdentifier(root.callee)
	}

	if (root.type === 'MemberExpression') {
		return getLeftMostIdentifier(root.object)
	}

	if (root.type === 'AwaitExpression') {
		return getLeftMostIdentifier(root.argument)
	}

	return null
}
