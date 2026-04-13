// @ts-check

import fp from 'path'
import _ from 'lodash'
import { getImportFullPath } from './import-path-from-closest-index.mjs'
import pluralize from 'pluralize'

const validIdentifierPattern = /^[A-Z_$][0-9A-Z_$]*$/i
const acronym = /^(https?|xhr|html|xml|yml|url|pwa|io|ui|api|sdk)$/i

/**
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce naming a default imported identifier after the file or the directory name (for an index file)',
		},
		schema: [
			{ type: 'string' }
		],
	},
	create(context) {
		const stripper = new RegExp(context.options[0] || '')

		const takenNames = new Set()

		const reports = []

		return {
			Program(root) {
				_.chain(root.body)
					.flatMap(node => {
						if (node.type === 'ExportNamedDeclaration' && node.declaration) {
							return context.sourceCode.getDeclaredVariables(node.declaration)
						}
						if (node.type === 'ExportDefaultDeclaration' && node.declaration) {
							// TODO: fix the bug where `MaybeNamedFunctionDeclaration` is not part of `NodeMap` from estree
							const declaration = /** @type {any} */ (node.declaration)
							return context.sourceCode.getDeclaredVariables(declaration)
						}
						return context.sourceCode.getDeclaredVariables(node)
					})
					.map(variable => variable.name)
					.compact()
					.value()
					.forEach(name => {
						takenNames.add(name)
					})
			},
			ImportDeclaration(root) {
				if (!root.specifiers || root.specifiers.length === 0) {
					return
				}

				const workPath = String(root.source.value)
				if (workPath.startsWith('.') === false) {
					return
				}

				const workNode = root.specifiers.find(node => node.type === 'ImportNamespaceSpecifier' || node.type === 'ImportDefaultSpecifier')
				if (workNode === undefined) {
					return
				}

				const absoluteFilePath = getImportFullPath(context.filename, workPath) || workPath
				const strippedFileName = fp.basename(absoluteFilePath).replace(stripper, '').replace(/\..+/, '')
				const strippedDirectoryName = fp.basename(fp.dirname(absoluteFilePath)).replace(stripper, '')

				const expectedNames = _.uniq(_.compact((() => {
					if (strippedFileName === 'index') {
						const _DirectoryName = upperAllIfAcronym(upperEach(noLeadingDigits(strippedDirectoryName)))
						return [_DirectoryName]
					}

					const _fileName = validIdentifierPattern.test(strippedFileName)
						? strippedFileName
						: upperSecond(noLeadingDigits(strippedFileName))

					if (workNode.type === 'ImportNamespaceSpecifier') {
						const _FileName = _.upperFirst(_fileName)
						const _CombinedName = upperEach(pluralize.singular(strippedDirectoryName) + '/' + upperAllIfAcronym(strippedFileName))

						return [_FileName, _CombinedName]
					}

					return [_fileName]
				})()))

				// Do nothing if one of the expected names is conflicting with the existing names in the same file
				if (expectedNames.some(name => takenNames.has(name))) {
					return
				}

				if (expectedNames.every(expectedName => expectedName !== workNode.local.name)) {
					reports.push({
						node: workNode.local,
						expectedNames,
					})
				}
			},
			'Program:exit'() {
				const expectedNameToReportedNodes = {}
				for (const { node, expectedNames } of reports) {
					for (const name of expectedNames) {
						const nodes = expectedNameToReportedNodes[name] || []
						nodes.push(node)
						expectedNameToReportedNodes[name] = nodes
					}
				}

				for (const { node, expectedNames } of reports) {
					const nonConflictingExpectedNames = expectedNames.filter(name => expectedNameToReportedNodes[name].length === 1)
					if (nonConflictingExpectedNames.length === 0) {
						return
					}

					context.report({
						node,
						message: `Expected "${node.name}" to be "${nonConflictingExpectedNames.join('" or "')}"`,
					})
				}
			},
		}
	}
}

function upperEach(text) {
	return _.words(text).map(word => _.upperFirst(word)).join('')
}

/**
 * Returns capitalized first character of each word, except the first word, while keeping everything else untouched
 * @param {string} text
 * @return {string}
 */
function upperSecond(text) {
	return _.words(text).map((word, rank) => rank === 0 ? _.toLower(word) : _.upperFirst(word)).join('')
}

/**
 * @param {string} text
 * @return {string}
 */
function upperAllIfAcronym(text) {
	const single = pluralize.singular(text)
	if (acronym.test(single)) {
		return _.toUpper(single) + text.substring(single.length)
	}

	return text
}

const digitOnly = /^\d+$/

/**
 * @param {string} text
 * @return {string}
 */
function noLeadingDigits(text) {
	return _.dropWhile(_.words(text), word => digitOnly.test(word)).join('-')
}
