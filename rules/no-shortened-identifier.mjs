// @ts-check

import { defineRule } from '@oxlint/plugins'
import _ from 'lodash'

export default defineRule({
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce naming an identifier without the user-defined abbreviations',
		},
		schema: [
			{
				type: 'object',
				additionalProperties: {
					type: 'string'
				}
			}
		],
		hasSuggestions: true,
	},
	createOnce(context) {
		/**
		 * @type {Record<string, string>}
		 */
		let dictionary = {}

		const getDictionary = _.memoize((input) => {
			/**
			 * @type {Record<string, string>}
			 */
			const output = {}
			if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
				for (const word in input) {
					if (typeof input[word] === 'string') {
						output[word] = input[word]
					}
				}
			}
			return output
		})

		return {
			before() {
				dictionary = getDictionary(context.options[0])

				if (_.isEmpty(dictionary)) {
					return false
				}
			},
			FunctionDeclaration: checkFunctionLike,
			FunctionExpression: checkFunctionLike,
			ArrowFunctionExpression: checkFunctionLike,
			VariableDeclarator(root) {
				if ('name' in root.id) {
					checkIdentifier(root.id)
				}
			},
			TSTypeAliasDeclaration(root) {
				checkIdentifier(root.id)
			},
			TSEnumDeclaration(root) {
				checkIdentifier(root.id)
			},
		}

		/**
		 * @param {import('@oxlint/plugins').ESTree.Function | import('@oxlint/plugins').ESTree.ArrowFunctionExpression} root
		 */
		function checkFunctionLike(root) {
			if (root.id) {
				checkIdentifier(root.id)
			}

			for (const node of root.params) {
				if ('name' in node) {
					checkIdentifier(node)
				}
			}
		}

		/**
		 * @param {import('@oxlint/plugins').ESTree.BindingIdentifier} node 
		 */
		function checkIdentifier(node) {
			if (!node) {
				return
			}

			const words = _.words(node.name).map(word => {
				const suggestedWord = sameCase(word, dictionary[word.toLowerCase()])
				return { word, suggestedWord }
			})

			if (words.every(({ suggestedWord }) => suggestedWord === undefined)) {
				return
			}

			context.report({
				node,
				message: 'Unexpected the abbreviation ' + words.filter(({ suggestedWord }) => suggestedWord !== undefined).map(({ word }) => '"' + word + '"').join(', ') +
					(words.length === 1 ? '' : ` as in \`${node.name}\``),
				suggest: (() => {
					if (words.some(({ suggestedWord }) => typeof suggestedWord === 'string' && (suggestedWord.trim().length === 0 || suggestedWord.includes(' ')))) {
						return undefined
					}

					// Do not use Array.prototype.join as non-word/separators must be kept
					let suggestedName = ''
					let traversedIndex = 0
					for (const { word, suggestedWord } of words) {
						const wordStartingIndex = node.name.indexOf(word, traversedIndex)
						const originalPortion = node.name.substring(traversedIndex, wordStartingIndex + word.length)
						if (suggestedWord) {
							suggestedName += node.name.substring(traversedIndex, wordStartingIndex) + suggestedWord
						} else {
							suggestedName += originalPortion
						}
						traversedIndex += originalPortion.length
					}
					if (traversedIndex < node.name.length) {
						suggestedName += node.name.substring(traversedIndex)
					}

					const optionalTypeAnnotation = 'typeAnnotation' in node && node.typeAnnotation
						? context.sourceCode.getText(node.typeAnnotation)
						: ''
					return [{
						desc: `Did you mean "${suggestedName}"?`,
						fix: fixer => fixer.replaceText(node, suggestedName + optionalTypeAnnotation)
					}]
				})()
			})
		}
	}
})

/**
 * @param {string} referenceWord
 * @param {string} word
 * @returns {string | undefined}
 */
function sameCase(referenceWord, word) {
	if (word === undefined) {
		return undefined
	}

	if (referenceWord.toLowerCase() === referenceWord) {
		return word.toLowerCase()

	} else if (referenceWord.toUpperCase() === referenceWord) {
		return word.toUpperCase()

	} else if (_.upperFirst(referenceWord) === referenceWord) {
		return _.upperFirst(word)
	}

	return word
}
