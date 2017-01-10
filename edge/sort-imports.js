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
			return padLeft(reverseDotCount, longestDotCount.toString().length) + node.source.value.toLowerCase()
		},
	],
	manta: [
		node => node.specifiers.length > 0 && node.source.value.startsWith('.') === false && (node.source.value.startsWith('react') ? '0' : '1') + node.source.value.toLowerCase(),
		node => node.specifiers.length > 0 && node.source.value.toLowerCase(),
		node => node.source.value.toLowerCase(),
	]
}

module.exports = {
	meta: {
		docs: {
			description: 'enforce sorting `import` statements',
			category: 'ECMAScript 6',
		},
		schema: [
			{ enum: Object.keys(SORT_TYPES) }
		],
		fixable: 'code'
	},
	create: function (context) {
		return {
			Program: function (rootNode) {
				if (rootNode.sourceType !== 'module' || rootNode.body.length === 0) {
					return null
				}

				const totalImportList = rootNode.body.filter(node => node.type === 'ImportDeclaration')
				if (totalImportList.length === 0) {
					return null
				}

				let firstImportIndex = 0
				if (rootNode.body.indexOf(totalImportList[0]) !== 0) {
					if (rootNode.body[0].type === 'ExpressionStatement' && rootNode.body[0].expression.value === 'use strict') {
						if (rootNode.body[1].type === 'ImportDeclaration') {
							firstImportIndex = 1
						} else {
							return context.report({
								node: rootNode.body[0],
								message: 'Expected import statements to be placed after "use strict".',
							})
						}
					} else {
						return context.report({
							node: rootNode.body[0],
							message: 'Expected import statements to be placed at the top of the module.',
						})
					}
				}

				for (let index = firstImportIndex + 1; index < totalImportList.length; index++) {
					const workNode = totalImportList[index]
					if (rootNode.body.indexOf(workNode) !== firstImportIndex + index) {
						return context.report({
							node: workNode,
							message: 'Expected import statements to be placed consecutively.',
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

				const sortedImportHead = nestedImportList.map(list => list[0])

				for (let index = 0; index < totalImportList.length; index++) {
					if (totalImportList[index] !== sortedImportList[index]) {
						return context.report({
							node: totalImportList[index],
							message: 'Expected import statements to be sorted in orderly fashion.',
							fix: fixer => (
								fixer.replaceTextRange(
									[totalImportList[0].start, totalImportList[totalImportList.length - 1].end],
									nestedImportList
										.map(list => ['', ...list.map(node => context.getSourceCode().getText(node))].join('\n'))
										.join('\n')
										.trim()
								)
							)
						})
					} else if (index > 0) {
						const prevNode = sortedImportList[index - 1]
						const workNode = sortedImportList[index]
						const workLine = context.getSourceCode().getText(workNode)
						const prevTillWorkLine = context.getSourceCode().getText(workNode, workNode.start - prevNode.end)
						const newLineCount = (prevTillWorkLine.substring(0, prevTillWorkLine.length - workLine.length).match(/\n/g) || []).length
						if (sortedImportHead.includes(workNode)) {
							if (newLineCount < 2) {
								context.report({
									node: workNode,
									message: 'Expected a blank line before this import statement.',
									fix: fixer => fixer.replaceText(workNode, '\n' + context.getSourceCode().getText(workNode))
								})
							}
						} else {
							if (newLineCount > 1) {
								context.report({
									node: workNode,
									message: 'Unexpected a blank line before this import statement.',
									fix: fixer => fixer.replaceTextRange([prevNode.end, workNode.start], '\n')
								})
							}
						}
					}
				}
			}
		}
	},
	test: {
		valid: [
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
				errors: [
					{ message: 'Expected import statements to be placed at the top of the module.' }
				],
			},
			{
				code: `
'use strict'
const e = 3.14
import 'aa'
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [
					{ message: 'Expected import statements to be placed after "use strict".' }
				],
			},
			{
				code: `
import 'aa'
const e = 3.14
import 'bb'
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [
					{ message: 'Expected import statements to be placed consecutively.' }
				],
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
				errors: [
					{ message: 'Expected import statements to be sorted in orderly fashion.' }
				],
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
				errors: [
					{ message: 'Expected a blank line before this import statement.' }
				],
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
				errors: [
					{ message: 'Unexpected a blank line before this import statement.' }
				],
				output: `
import './a'
import './b'
				`,
			},
		]
	}
}

function padLeft(text, numb) {
	text = (text || '').toString()
	while (text.length < numb) {
		text = '0' + text
	}
	return text
}
