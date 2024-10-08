// @ts-check

const _ = require('lodash')

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
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
	create: function (context) {
		const bannedHash = context.options[0]
		if (_.isEmpty(bannedHash)) {
			return {}
		}

		return {
			FunctionDeclaration: checkFunctionLike,
			FunctionExpression: checkFunctionLike,
			ArrowFunctionExpression: checkFunctionLike,
			VariableDeclarator: function (root) {
				if ('name' in root.id) {
					check(root.id)
				}
			},
			TSTypeAliasDeclaration: function (root) {
				check(root.id)
			},
			TSEnumDeclaration: function (root) {
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
	},
	tests: process.env.TEST && {
		valid: [
			{
				code: `
        function findIdx() {}
				const findIdx2 = function (idx) {}
				const findIdx3 = (idx) => {}
				type Idx = {}
				enum TABLE_IDX {}
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
		],
		invalid: [
			{
				code: `
        function findIdx() {}
				const findIdx2 = function (idx) {}
				const findIdx3 = (idx) => {}
				type Idx = {}
				enum _TABLE_IDX_ {}
				`,
				options: [{ idx: 'index' }],
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
				errors: [
					{
						message: 'Unexpected the abbreviation "Idx" as in `findIdx`',
						line: 2,
						suggestions: [
							{
								desc: 'Did you mean "findIndex"?',
								output: `
        function findIndex() {}
				const findIdx2 = function (idx) {}
				const findIdx3 = (idx) => {}
				type Idx = {}
				enum _TABLE_IDX_ {}
				`,
							}
						]
					},
					{
						message: 'Unexpected the abbreviation "Idx" as in `findIdx2`',
						line: 3,
						suggestions: [
							{
								desc: 'Did you mean "findIndex2"?',
								output: `
        function findIdx() {}
				const findIndex2 = function (idx) {}
				const findIdx3 = (idx) => {}
				type Idx = {}
				enum _TABLE_IDX_ {}
				`,
							}
						]
					},
					{
						message: 'Unexpected the abbreviation "idx"',
						line: 3,
						suggestions: [
							{
								desc: 'Did you mean "index"?',
								output: `
        function findIdx() {}
				const findIdx2 = function (index) {}
				const findIdx3 = (idx) => {}
				type Idx = {}
				enum _TABLE_IDX_ {}
				`,
							}
						]
					},
					{
						message: 'Unexpected the abbreviation "Idx" as in `findIdx3`',
						line: 4,
						suggestions: [
							{
								desc: 'Did you mean "findIndex3"?',
								output: `
        function findIdx() {}
				const findIdx2 = function (idx) {}
				const findIndex3 = (idx) => {}
				type Idx = {}
				enum _TABLE_IDX_ {}
				`,
							}
						]
					},
					{
						message: 'Unexpected the abbreviation "idx"',
						line: 4,
						suggestions: [
							{
								desc: 'Did you mean "index"?',
								output: `
        function findIdx() {}
				const findIdx2 = function (idx) {}
				const findIdx3 = (index) => {}
				type Idx = {}
				enum _TABLE_IDX_ {}
				`,
							}
						]
					},
					{
						message: 'Unexpected the abbreviation "Idx"',
						line: 5,
						suggestions: [
							{
								desc: 'Did you mean "Index"?',
								output: `
        function findIdx() {}
				const findIdx2 = function (idx) {}
				const findIdx3 = (idx) => {}
				type Index = {}
				enum _TABLE_IDX_ {}
				`,
							}
						]
					},
					{
						message: 'Unexpected the abbreviation "IDX" as in `_TABLE_IDX_`',
						line: 6,
						suggestions: [
							{
								desc: 'Did you mean "_TABLE_INDEX_"?',
								output: `
        function findIdx() {}
				const findIdx2 = function (idx) {}
				const findIdx3 = (idx) => {}
				type Idx = {}
				enum _TABLE_INDEX_ {}
				`,
							}
						]
					},
				],
			},
		],
	},
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
