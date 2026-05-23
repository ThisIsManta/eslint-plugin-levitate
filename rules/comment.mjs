// @ts-check

import { defineRule } from '@oxlint/plugins'

const FORMAL = /^\s(HACK|TODO):(\s\S|$)/
const HACK = /^\s*(HACK|XXX)\W\s*/i
const TODO = /^\s*TODO\W\s*/i
const FIXME = /^\s*FIXME\W\s*/i
const NOTE = /^\s*(Note\W)\s/i
const URL = /^\s(?:See\s*:\s*)?(\w+:\/\/.+)/i
const ESLINT = /^(es|ox)lint-(disable|enable)/

export default defineRule({
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce starting a single-line comment with either `TODO:`, `HACK:`, `See {url}`, or a first-capitalized word',
		},
	},
	createOnce(context) {
		return {
			Program(root) {
				const commentNodes = (root.comments || []).filter(node => node.type === 'Line')
				for (let index = 0; index <= commentNodes.length - 1; index++) {
					const node = commentNodes[index]
					if (!node.loc) {
						continue
					}

					if (FORMAL.test(node.value)) {
						return
					}

					if (HACK.test(node.value)) {
						context.report({
							loc: node.loc,
							message: `Expected the comment to be written as "HACK: ..."`,
						})
						return
					}

					if (TODO.test(node.value)) {
						context.report({
							loc: node.loc,
							message: `Expected the comment to be written as "TODO: ..."`,
						})
						return
					}

					if (FIXME.test(node.value)) {
						context.report({
							loc: node.loc,
							message: `Expected the comment to be written as "TODO: ..."`,
						})
						return
					}

					const [, url] = node.value.match(URL) || []
					if (url) {
						context.report({
							loc: node.loc,
							message: `Expected the comment to be written as "See ${url}"`,
						})
						return
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
						return
					}

					// Skip if this is a single word or an ESLint directive
					const text = node.value.trim()
					if (
						text.includes(' ') === false ||
						ESLINT.test(text)
					) {
						return
					}

					// Capitalize the first word
					const firstChar = text.charAt(0)
					if (firstChar !== firstChar.toUpperCase()) {
						context.report({
							loc: node.loc,
							message: `Expected the comment to start with a capital letter`,
						})
						return
					}
				}
			},
		}
	}
})
