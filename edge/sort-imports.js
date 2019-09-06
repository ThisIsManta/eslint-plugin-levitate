const _ = require('lodash')

const NODE_APIS = [
	'addon', 'assert', 'buffer', 'child_process', 'cluster', 'console', 'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'http', 'https', 'net', 'os', 'path', 'punycode', 'querystring', 'readline', 'repl', 'stream', 'string_decoder', 'timers', 'tls', 'tty', 'url', 'util', 'v8', 'vm', 'zlib',
].reduce((hash, name) => {
	hash[name] = true
	return hash
}, {})

const SORT_TYPES = {
	module: [ // See https://github.com/renke/import-sort/tree/master/packages/import-sort-style-module
		node => node.specifiers.length === 0 && node.source.value.startsWith('.') === false,
		node => node.specifiers.length === 0,
		node => NODE_APIS[node.source.value] && node.source.value.toLowerCase(),
		node => node.source.value.startsWith('.') === false && node.source.value.toLowerCase(),
		(node, { longestDotCount }) => {
			const currentDotCount = (node.source.value.match(/\./g) || []).length
			const reverseDotCount = Math.abs(currentDotCount - longestDotCount)
			return _.padStart(reverseDotCount, longestDotCount.toString().length, '0') + node.source.value.toLowerCase()
		},
	],
	manta: [
		node => node.specifiers.length > 0 && node.source.value.startsWith('.') === false && (node.source.value.startsWith('react') ? '0' : '1') + node.source.value.toLowerCase(),
		node => node.specifiers.length > 0 && node.source.value.toLowerCase(),
		node => node.source.value.toLowerCase(),
	]
}

const USE_STRICT = {
	type: 'ExpressionStatement',
	expression: {
		value: 'use strict',
	}
}

const JEST_MOCK = {
	type: 'ExpressionStatement',
	expression: {
		type: 'CallExpression',
		callee: {
			type: 'MemberExpression',
			object: {
				type: 'Identifier',
				name: 'jest',
			},
			property: {
				type: 'Identifier',
				name: 'mock',
			},
		}
	}
}

module.exports = {
	meta: {
		docs: {
			description: 'enforce sorting `import` statements',
			category: 'ECMAScript 6',
		},
		messages: {
			first: 'Expected import statements to be here.',
			blankLineBefore: 'Expected a blank line before this import statement.',
			blankLineNot: 'Unexpected a blank line before this import statement.',
			blankLineAfter: 'Expected a blank line after the last import statement.',
			orderlyFashion: 'Expected import statements to be sorted in orderly fashion.',
			consecutive: 'Expected import statements to be placed consecutively.',
		},
		schema: [
			{ enum: Object.keys(SORT_TYPES) }
		],
		fixable: 'code'
	},
	create: function (context) {
		return {
			Program: function (root) {
				if (root.sourceType !== 'module' || root.body.length === 0) {
					return null
				}

				const totalImportList = root.body.filter(node => node.type === 'ImportDeclaration')
				if (totalImportList.length === 0) {
					return null
				}

				const firstImportIndex = root.body.indexOf(totalImportList[0])
				if (firstImportIndex > 0) {
					const nonImportList = _.dropWhile(root.body.slice(0, firstImportIndex), node => _.isMatch(node, USE_STRICT) || _.isMatch(node, JEST_MOCK))
					if (nonImportList.length > 0) {
						return context.report({
							node: nonImportList[0],
							messageId: 'first',
						})
					}
				}

				let workingImportList = _.clone(totalImportList)

				const longestDotCount = _.chain(totalImportList).map(node => (node.source.value.match(/\./g) || []).length).max().value()

				const nestedImportList = SORT_TYPES[context.options[0] || 'module'].map(rule => {
					const func = node => rule(node, { longestDotCount })
					const pendingImportList = _.chain(workingImportList).filter(func).sortBy(func).value()
					workingImportList = _.difference(workingImportList, pendingImportList)
					return pendingImportList
				}).filter(list => list.length > 0)

				const sortedImportList = _.flatten(nestedImportList)

				const firstOfGroupImportList = nestedImportList.map(list => list[0])

				const totalMixedList = root.body.slice(root.body.indexOf(_.first(totalImportList)), root.body.indexOf(_.last(totalImportList)) + 1)

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
						const workLine = context.getSourceCode().getText(workNode)
						const betweenTheLines = context.getSourceCode().getText(workNode, workNode.range[0] - prevNode.range[1])
						const newLineCount = (betweenTheLines.substring(0, betweenTheLines.length - workLine.length).match(/\n/g) || []).length
						if (firstOfGroupImportList.includes(workNode)) {
							if (newLineCount < 2) {
								context.report({
									node: workNode,
									messageId: 'blankLineBefore',
									fix: fixer => fixer.replaceText(workNode, '\n' + context.getSourceCode().getText(workNode))
								})
							}

						} else {
							if (newLineCount > 1) {
								context.report({
									node: workNode,
									messageId: 'blankLineNot',
									fix: fixer => fixer.replaceTextRange([prevNode.range[1], workNode.range[0]], '\n')
								})
							}
						}

						continue
					}

					let reportedNode
					let reportedMessageId
					if (realNode.type === 'ImportDeclaration') {
						reportedNode = realNode
						reportedMessageId = 'orderlyFashion'

					} else {
						reportedNode = totalMixedList.slice(index).find(node => node.type === 'ImportDeclaration')
						reportedMessageId = 'consecutive'
					}

					return context.report({
						node: reportedNode,
						messageId: reportedMessageId,
						fix: fixer => (
							fixer.replaceTextRange(
								[_.first(totalMixedList).range[0], _.last(totalMixedList).range[1]],
								(
									nestedImportList.map(list => ['', ...list.map(node => context.getSourceCode().getText(node))].join('\n')).join('\n').trim() +
									'\n' + '\n' +
									sortedOtherList.map(node => context.getSourceCode().getText(node)).join('\n')
								).trim()
							)
						)
					})
				}

				const lastImport = _.last(sortedImportList)
				const afterLastImport = root.body[root.body.indexOf(lastImport) + 1]
				if (afterLastImport) {
					const afterLastImportText = context.getSourceCode().getText(afterLastImport)
					const betweenTheLines = context.getSourceCode().getText(afterLastImport, afterLastImport.range[0] - lastImport.range[1])
					const newLineCount = (betweenTheLines.substring(0, betweenTheLines.length - afterLastImportText.length).match(/\n/g) || []).length
					if (newLineCount < 2) {
						context.report({
							node: lastImport,
							messageId: 'blankLineAfter',
							fix: fixer => fixer.replaceText(lastImport, context.getSourceCode().getText(lastImport) + '\n')
						})
					}
				}
			}
		}
	},
	test: {
		valid: [
			{
				code: `
'use strict'
jest.mock('../../config/main')

import crypto from 'crypto'
				`,
				options: ['module'],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
import crypto from 'crypto'

import Config from '../../config/main'
import UserConstants from './UserConstants'
				`,
				options: ['module'],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
import 'a'
import 'c'
import 'b'

import './a'
import './c'
import './b'

import { readFile, writeFile } from 'fs'
import * as path from 'path'

import classNames from 'classnames'
import _ from 'lodash'
import Moment from 'moment'
import React from 'react'
import ReactDOM from 'react-dom'

import aaa from '../../aaa'
import bbb from '../../bbb'
import aaaa from '../aaaa'
import bbbb from '../bbbb'
import aaaaa from './aaaaa'
import bbbbb from './bbbbb'
				`,
				options: ['module'],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
import React from 'react'
import ReactDOM from 'react-dom'
import classNames from 'classnames'
import { readFile, writeFile } from 'fs'
import _ from 'lodash'
import Moment from 'moment'
import * as path from 'path'

import aaa from '../../aaa'
import bbb from '../../bbb'
import aaaa from '../aaaa'
import bbbb from '../bbbb'
import aaaaa from './aaaaa'
import bbbbb from './bbbbb'

import './a'
import './b'
import './c'
import 'a'
import 'b'
import 'c'
				`,
				options: ['manta'],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: `
const e = 3.14
import 'aa'
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ messageId: 'first' }],
			},
			{
				code: `
'use strict'
const e = 3.14
import 'aa'
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ messageId: 'first' }],
			},
			{
				code: `
import 'aa'
const e = 3.14
import 'bb'
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ messageId: 'consecutive' }],
				output: `
import 'aa'
import 'bb'

const e = 3.14
				`
			},
			{
				code: `
import aa from 'aa'
import * as path from 'path'
import { readFile, writeFile } from 'fs'
import bbbbb from './bbbbb'
import bbbb from '../bbbb'
import bbb from '../../bbb'
import aaaaa from './aaaaa'
import aaaa from '../aaaa'
import aaa from '../../aaa'
import './a'
import 'a'
				`,
				options: ['module'],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ messageId: 'orderlyFashion' }],
				output: `
import 'a'

import './a'

import { readFile, writeFile } from 'fs'
import * as path from 'path'

import aa from 'aa'

import aaa from '../../aaa'
import bbb from '../../bbb'
import aaaa from '../aaaa'
import bbbb from '../bbbb'
import aaaaa from './aaaaa'
import bbbbb from './bbbbb'
				`,
			},
			{
				code: `
import 'a'
import './a'
				`,
				options: ['module'],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ messageId: 'blankLineBefore' }],
				output: `
import 'a'

import './a'
				`,
			},
			{
				code: `
import './a'

import './b'
				`,
				options: ['module'],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ messageId: 'blankLineNot' }],
				output: `
import './a'
import './b'
				`,
			},
		]
	}
}
