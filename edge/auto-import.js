const _ = require('lodash')
const fs = require('fs')
const pt = require('path')
const glob = require('glob')

module.exports = {
	meta: {
		docs: {
			description: 'enforce valid paths in `import` statements',
			category: 'ECMAScript 6',
		},
		fixable: 'code'
	},
	create: function (context) {
		return {
			ImportDeclaration: function (rootNode) {
				const filePath = rootNode.source.value
				if (filePath.startsWith('.') === false) {
					return null
				}

				const workPath = pt.resolve(context.getFilename(), '..')
				const testPath = pt.resolve(workPath, filePath)
				if (fs.existsSync(testPath) || fs.existsSync(testPath + '.js')) {
					return null
				}

				const rootPath = (function () {
					const parts = workPath.split(pt.sep)
					let index = parts.length
					while (--index > 0) {
						const temp = pt.join(parts.slice(0, index).join(pt.sep), 'package.json')
						if (fs.existsSync(temp)) {
							return pt.resolve(temp, '..')
						}
					}
					return null
				})()
				if (rootPath === null) {
					return null
				}

				const check = function (pattern, extension) {
					const files = glob.sync(pattern + extension, { cwd: rootPath })
					if (files.length === 1) {
						const workGrab = _.trimStart(workPath.substring(rootPath.length), pt.sep).split(pt.sep)
						const fileGrab = _.trimStart(pt.resolve(rootPath, files[0]).substring(rootPath.length), pt.sep).split(pt.sep)
						let index = -1
						while (++index < workGrab.length) {
							if (workGrab[index] !== fileGrab[index]) {
								break
							}
						}

						let lastGrab
						if (workGrab.length === index) {
							lastGrab = './' + fileGrab.slice(index).join('/')
						} else {
							lastGrab = _.repeat('../', workGrab.length - index) + fileGrab.slice(index).join('/')
						}

						if (extension && filePath.endsWith(extension) === false) {
							lastGrab = lastGrab.substring(0, lastGrab.length - 3)
						}

						return context.report({
							node: rootNode,
							message: 'Unexpected a non-existing file path.',
							fix: fixer => fixer.replaceText(rootNode.source, `'${lastGrab}'`)
						})
					}
				}

				const parts = filePath.split('/').filter(part => part !== '.' && part !== '..')
				let index = parts.length
				while (--index >= 0) {
					const pattern = '**/' + parts.slice(index).join('/')
					if (check(pattern, '') || check(pattern, '.js')) {
						break
					}
				}
			}
		}
	},
	test: {
		valid: [
			{
				code: `import x from 'node'`,
				filename: 'edge/something.js',
				options: ['module'],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import x from './auto-import'`,
				filename: 'edge/something.js',
				options: ['module'],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: `import x from '../auto-import'`,
				filename: 'edge/something.js',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Unexpected a non-existing file path.' }],
				output: `import x from './auto-import'`,
			},
			{
				code: `import x from '../auto-import.js'`,
				filename: 'edge/something.js',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Unexpected a non-existing file path.' }],
				output: `import x from './auto-import.js'`,
			},
		]
	}
}
