// @ts-check

import _ from 'lodash'

const ALLOWED_TEST_PATTERN = /^(returns|renders|calls|fetches|sets|throws|does not (return|render|call|fetch|set|throw) )/
const DISALLOWED_WORDS = ['proper', 'correct', 'appropriate', 'accurate', 'perfect']
const DISALLOWED_PATTERN = new RegExp('\\W((' + DISALLOWED_WORDS.join('|') + ')(ly)?)(\\W|$)', 'i')

/**
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce writing consistent test case titles for `it` and `test` function calls; the allowed pattern of the test case title is `"(does not) return/render/call/fetch/set/throw(s) ... (, given ...)"`; this also disallows writing some vague words, such ' + DISALLOWED_WORDS.join(', '),
		},
		messages: {
			start: 'Expected the test case title to start with "(does not) return/render/call/fetch/set/throw(s) ... (, given ...)" only',
			vague: 'Expected the test case title to provide more details rather using the word "{{word}}"',
			direct: 'Expected the description title to be the direct reference of the function (removing the string quotes)',
		},
	},
	create(context) {
		return {
			ExpressionStatement(root) {
				if (
					root.expression.type !== 'CallExpression' ||
					root.expression.callee.type !== 'Identifier' ||
					root.expression.arguments.length < 2
				) {
					return
				}

				const functionCall = root.expression.callee.name
				if (functionCall !== 'it' && functionCall !== 'test') {
					return
				}

				const titleNode = root.expression.arguments[0]
				const titleText = getText(titleNode)
				if (typeof titleText !== 'string') {
					return
				}


				if (ALLOWED_TEST_PATTERN.test(titleText) === false) {
					return context.report({
						node: titleNode,
						messageId: 'start',
					})
				}

				const bannedWord = titleText.match(DISALLOWED_PATTERN)?.[1]
				if (bannedWord) {
					return context.report({
						node: titleNode,
						messageId: 'vague',
						data: {
							word: bannedWord
						}
					})
				}
			},
		}
	},
}

/**
 * @param {import('estree').Node} node
 * @return {string | undefined}
 */
export function getText(node) {
	if (!node) {
		return undefined
	}

	if (node.type === 'Literal' && typeof node.value === 'string') {
		return node.value
	}

	if (node.type === 'TemplateLiteral') {
		return _.get(node, 'quasis.0.value.cooked', undefined)
	}
}
