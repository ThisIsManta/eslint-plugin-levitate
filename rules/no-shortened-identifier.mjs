// @ts-check

import _ from 'lodash'

/**
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce naming an identifier without the user-defined abbreviations',
		},
		schema: [
			{
				type: 'object',
			}
		],
		hasSuggestions: true,
	},
	create(context) {
		const bannedHash = context.options[0]
		if (_.isEmpty(bannedHash)) {
			return {}
		}

		return {
			FunctionDeclaration: checkFunctionLike,
			FunctionExpression: checkFunctionLike,
			ArrowFunctionExpression: checkFunctionLike,
			VariableDeclarator(root) {
				if ('name' in root.id) {
					check(root.id)
				}
			},
			TSTypeAliasDeclaration(root) {
				check(root.id)
			},
			TSEnumDeclaration(root) {
				check(root.id)
			},
		}

		/**
		 * @param {import('estree').FunctionDeclaration} root
		 */
		function checkFunctionLike(root) {
			check(root.id)

			for (const node of root.params) {
				if ('name' in node) {
					check(node)
				}
			}
		}

		/**
		 * @param {import('estree').Node & { name: string }} node 
		 */
		function check(node) {
			if (!node) {
				return
			}

			const words = _.words(node.name).map(word => {
				const bannedWord = bannedHash[word.toLowerCase()]
				const suggestedWord = sameCase(word, bannedWord)
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
						? context.sourceCode.getText(/** @type {import('estree').Node} */(node.typeAnnotation))
						: ''
					return [{
						desc: `Did you mean "${suggestedName}"?`,
						fix: fixer => fixer.replaceText(node, suggestedName + optionalTypeAnnotation)
					}]
				})()
			})
		}
	}
}

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
