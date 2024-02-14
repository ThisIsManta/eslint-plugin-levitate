/// <reference path="../types.d.ts" />
// @ts-check

const FORMAL = /^\s(HACK|TODO):(\s\S|$)/
const HACK = /^\s*(HACK|XXX)\W\s*/i
const TODO = /^\s*TODO\W\s*/i
const FIXME = /^\s*FIXME\W\s*/i
const NOTE = /^\s*(Note\W)\s/i
const URL = /^\s(?:See\s*:\s*)?(\w+:\/\/.+)/i
const ESLINT = /^eslint-(disable|enable)/

/**
 * @type {Rule}
 */
module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce starting a single-line comment with either `TODO:`, `HACK:`, `See {url}`, or a first-capitalized word',
		},
	},
	create: function (context) {
		return {
			Program: function (root) {
				const commentNodes = (root.comments || []).filter(node => node.type === 'Line')
				for (let index = 0; index <= commentNodes.length - 1; index++) {
					const node = commentNodes[index]
					if (!node.loc) {
						continue
					}

					if (FORMAL.test(node.value)) {
						return null
					}

					if (HACK.test(node.value)) {
						return context.report({
							loc: node.loc,
							message: `Expected the comment to be written as "HACK: ..."`,
						})
					}

					if (TODO.test(node.value)) {
						return context.report({
							loc: node.loc,
							message: `Expected the comment to be written as "TODO: ..."`,
						})
					}

					if (FIXME.test(node.value)) {
						return context.report({
							loc: node.loc,
							message: `Expected the comment to be written as "TODO: ..."`,
						})
					}

					const [, url] = node.value.match(URL) || []
					if (url) {
						return context.report({
							loc: node.loc,
							message: `Expected the comment to be written as "See ${url}"`,
						})
					}

					const [, note] = node.value.match(NOTE) || []
					if (NOTE.test(node.value)) {
						return context.report({
							loc: node.loc,
							message: `Unexpected "${note.trim()}"`,
						})
					}

					// Skip if this is a part of consecutive single-line comments
					if (
						index > 0 &&
						node.loc.start.line === (commentNodes[index - 1].loc?.start.line ?? 0) + 1
					) {
						return null
					}

					// Skip if this is a single word or an ESLint directive
					const text = node.value.trim()
					if (
						text.includes(' ') === false ||
						ESLINT.test(text)
					) {
						return null
					}

					// Capitalize the first word
					const firstChar = text.charAt(0)
					if (firstChar !== firstChar.toUpperCase()) {
						return context.report({
							loc: node.loc,
							message: `Expected the comment to start with a capital letter`,
						})
					}
				}
			},
		}
	},
	tests: {
		valid: [
			{ code: '// HACK: lorem' },
			{ code: '// TODO: lorem' },
			{ code: '// Lorem' },
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
	},
}
