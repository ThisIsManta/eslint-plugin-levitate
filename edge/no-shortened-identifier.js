const _ = require('lodash')

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
				check(root.id)
			},
			TSTypeAliasDeclaration: function (root) {
				check(root.id)
			},
			TSEnumDeclaration: function (root) {
				check(root.id)
			},
		}

		function checkFunctionLike(root) {
			check(root.id)

			for (const node of root.params) {
				check(node)
			}
		}

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

					const sourceCode = context.getSourceCode()
					const optionalTypeAnnotation = node.typeAnnotation ? sourceCode.getText(node.typeAnnotation) : ''
					return [
						{
							desc: `Did you mean "${suggestedName}"?`,
							fix: fixer => fixer.replaceText(node, suggestedName + optionalTypeAnnotation)
						}
					]
				})()
			})
		}
	},
	tests: {
		valid: [
			{
				code: `
        function findIdx() {}
				const findIdx2 = function (idx) {}
				const findIdx3 = (idx) => {}
				type Idx = {}
				enum TABLE_IDX {}
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
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
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
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
