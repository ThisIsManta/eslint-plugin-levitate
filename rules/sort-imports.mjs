// @ts-check

import fs from 'fs'
import _ from 'lodash'

const getNodeAPIs = _.memoize(() => {
	try {
		const text = fs.readFileSync('node_modules/@types/node/index.d.ts', 'utf-8')
		return _.compact(
			text.match(/^\/\/\/ \<reference path="(.+?)"/gm)?.map(line => line.match(/path="(.+?)\.d\.ts"/)?.[1])
		).filter(name => name !== 'globals.global')
	} catch {
		return []
	}
})

/**
 * @param {import('estree').ImportDeclaration} node
 * @return {string}
 */
function getImportPath(node) {
	return String(node.source.value || '')
}

/**
 * @param {string} path
 * @return {number}
 */
function countDots(path) {
	return path.match(/\.\./g)?.length || 0
}

/**
 * @type {Record<string, Array<(node: import('estree').ImportDeclaration, options: { longestDotCount: number }) => boolean | number | string>>}
 */
const SORT_TYPES = {
	module: [
		// See https://github.com/renke/import-sort/tree/master/packages/import-sort-style-module
		node => node.specifiers.length === 0 && getImportPath(node).startsWith('.') === false,
		node => node.specifiers.length === 0,
		node => (getNodeAPIs().includes(getImportPath(node)) || getImportPath(node).startsWith('node:')) && getImportPath(node).toLowerCase(),
		node => getImportPath(node).startsWith('.') === false && getImportPath(node).toLowerCase(),
		(node, { longestDotCount }) => {
			const currentDotCount = countDots(getImportPath(node))
			const reverseDotCount = Math.abs(currentDotCount - longestDotCount)
			return _.padStart(reverseDotCount.toString(), longestDotCount.toString().length, '0') + getImportPath(node).toLowerCase()
		},
	],
	manta: [
		node => node.specifiers.length > 0 && getImportPath(node).startsWith('.') === false && (getImportPath(node).startsWith('react') ? '0' : '1') + getImportPath(node).toLowerCase(),
		node => node.specifiers.length > 0 && getImportPath(node).toLowerCase(),
		node => getImportPath(node).toLowerCase(),
	]
}

/**
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce sorting `import` statements. By default, this will sort according to [Renke](https://github.com/renke/import-sort/tree/master/packages/import-sort-style-module)',
		},
		schema: [
			{ enum: Object.keys(SORT_TYPES) }
		],
		fixable: 'code'
	},
	create(context) {
		/**
		 * @type {Map<import('estree').Node, Array<import('estree').Comment>>}
		 */
		const rightComments = new Map()

		/**
		 * @type {Map<import('estree').Node, Array<import('estree').Comment>>}
		 */
		const aboveComments = new Map()

		return {
			Program(root) {
				const totalImportList = root.body.filter(/** @return {node is import('estree').ImportDeclaration} */(node) => node.type === 'ImportDeclaration')
				if (totalImportList.length === 0) {
					return
				}

				for (const thisNode of totalImportList) {
					rightComments.set(
						thisNode,
						context.sourceCode.getCommentsAfter(thisNode).filter(node => node.loc?.start.line === thisNode.loc?.end.line)
					)
				}

				for (let index = 0; index < totalImportList.length; index++) {
					const thisNode = totalImportList[index]
					const prevNode = totalImportList[index - 1]
					aboveComments.set(
						thisNode,
						_.differenceWith(
							context.sourceCode.getCommentsBefore(thisNode),
							rightComments.get(prevNode) || [],
							(a, b) => _.isEqual(a.loc, b.loc)
						)
					)
				}

				let workingImportList = _.clone(totalImportList)

				const longestDotCount = _.chain(totalImportList)
					.map(node => countDots(getImportPath(node)))
					.max()
					.value()

				const nestedImportList = SORT_TYPES[context.options[0] || 'module'].map(rule => {
					const pendingImportList = _.chain(workingImportList)
						.filter(node => !!rule(node, { longestDotCount }))
						.sortBy(node => rule(node, { longestDotCount }))
						.value()
					workingImportList = _.difference(workingImportList, pendingImportList)
					return pendingImportList
				}).filter(list => list.length > 0)

				const sortedImportList = _.flatten(nestedImportList)

				const firstOfGroupImportList = nestedImportList.map(list => list[0])

				const totalMixedList = root.body.slice(
					root.body.indexOf(/** @type {any} */(_.first(totalImportList))),
					root.body.indexOf(/** @type {any} */(_.last(totalImportList))) + 1
				)

				const sortedOtherList = totalMixedList.filter(node => node.type !== 'ImportDeclaration')

				const sortedMixedList = [...sortedImportList, ...sortedOtherList]

				for (let index = 0; index < sortedMixedList.length; index++) {
					const realNode = totalMixedList[index]
					const sortNode = sortedMixedList[index]

					if (realNode === sortNode) {
						if (index === 0 || realNode.type !== 'ImportDeclaration') {
							continue
						}

						const prevNode = sortedMixedList[index - 1]
						const workNode = sortNode

						const lastNode = _.maxBy([prevNode, ...(rightComments.get(prevNode) || [])], node => node.loc?.end.line)
						const nextNode = _.minBy([workNode, ...(aboveComments.get(workNode) || [])], node => node.loc?.start.line)
						if (!lastNode || !lastNode.loc || !lastNode.range || !nextNode || !nextNode.loc || !nextNode.range) {
							continue
						}

						const lineDiff = nextNode.loc.start.line - lastNode.loc.end.line

						if (firstOfGroupImportList.includes(/** @type {any} */(workNode))) {
							if (lineDiff !== 2) {
								const { range } = nextNode
								context.report({
									node: workNode,
									message: 'Expected a blank line before this import statement.',
									fix: fixer => fixer.insertTextBeforeRange(range, '\n')
								})
							}

						} else {
							if (lineDiff !== 1) {
								/**
								 * @type {[number, number]}
								 */
								const range = [lastNode.range[1], nextNode.range[0]]
								context.report({
									node: workNode,
									message: 'Unexpected a blank line before this import statement.',
									fix: fixer => fixer.replaceTextRange(range, '\n')
								})
							}
						}

						continue
					}

					const [reportedNode, reportedMessage] = (() => {
						if (realNode.type === 'ImportDeclaration') {
							const expectedIndex = sortedMixedList.indexOf(realNode)
							const referenceNode = sortedMixedList[expectedIndex - 1]
							return [
								realNode,
								`Expected this import statement to be placed after ${referenceNode.type === 'ImportDeclaration' ? `"${getImportPath(referenceNode)}"` : context.sourceCode.getText(referenceNode)}.`
							]
						} else {
							return [
								/** @type {import('estree').ImportDeclaration} */ (totalMixedList.slice(index).find(node => node.type === 'ImportDeclaration')),
								'Expected import statements to be placed consecutively.'
							]
						}
					})()

					const firstNode = totalMixedList[0]
					const lastNode = totalMixedList[totalMixedList.length - 1]

					return context.report({
						node: reportedNode,
						message: reportedMessage,
						fix: fixer => (
							fixer.replaceTextRange(
								[
									_.chain([
										firstNode,
										...(aboveComments.get(firstNode) || [])
									])
										.map(node => node.range?.[0])
										.min()
										.value(),
									_.chain([lastNode, ...(rightComments.get(lastNode) || [])])
										.map(node => node.range?.[1])
										.max()
										.value()
								],
								(
									nestedImportList.map(
										list => [
											'',
											...list.map(node => (
												aboveComments.get(node)
													?.map(node => context.sourceCode.getText(/** @type {any} */(node)))
													.join('\n') + '\n' +
												context.sourceCode.getText(node) + ' ' +
												rightComments.get(node)
													?.map(node => context.sourceCode.getText(/** @type {any} */(node)))
													.join(' ')
											).trim())
										].join('\n')
									).join('\n').trim() +
									'\n' + '\n' +
									sortedOtherList.map(node => context.sourceCode.getText(node)).join('\n')
								).trim()
							)
						)
					})
				}

				const lastImport = _.last(sortedImportList)
				if (!lastImport || !lastImport.range) {
					return
				}

				const afterLastImport = root.body[root.body.indexOf(lastImport) + 1]
				if (!afterLastImport || !afterLastImport.range) {
					return
				}

				const afterLastImportText = context.sourceCode.getText(afterLastImport)
				// TODO
				const betweenTheLines = context.sourceCode.getText(afterLastImport, afterLastImport.range[0] - lastImport.range[1])
				const newLineCount = (betweenTheLines.substring(0, betweenTheLines.length - afterLastImportText.length).match(/\n/g) || []).length
				if (newLineCount < 2) {
					context.report({
						node: lastImport,
						message: 'Expected a blank line after the last import statement.',
						fix: fixer => fixer.replaceText(lastImport, context.sourceCode.getText(lastImport) + '\n')
					})
				}
			}
		}
	}
}
