const TestRunner = require('eslint').RuleTester
const chalk = require('chalk')
const _ = require('lodash')
const { parseArguments } = require('@thisismanta/pessimist')

const tester = new TestRunner({
	parserOptions: { ecmaVersion: 6, sourceType: 'module' }
})

const { debug: debugging, ...options } = parseArguments(
	process.argv.slice(2),
	{
		debug: !!process.env.DEBUG,
	},
	{
		aliases: [['d', 'debug']]
	}
)

const exclusiveTestCases = []
global.only = function only(testCase) {
	exclusiveTestCases.push(testCase)
	return testCase
}

const narrowingWords = Array.from(options)
const ruleNames = require('./rules')
	.filter(name => narrowingWords.length > 0 ? narrowingWords.some(text => name.includes(text)) : true)

if (ruleNames.length === 0) {
	console.error(chalk.red('Could not find any rules to test.'))
	process.exit(1)
}

for (const name of ruleNames) {
	const rule = require('./edge/' + name)
	if (!rule.tests) {
		console.log('🟡 ' + name)
		continue
	}

	if (debugging) {
		console.log('⬜ ' + name)
	}

	let skipped = false
	for (const type of ['valid', 'invalid']) {
		for (const test of rule.tests[type]) {
			if (!test || !test.code) {
				continue
			}

			if (exclusiveTestCases.length > 0 && !exclusiveTestCases.includes(test)) {
				skipped = true
				continue
			}

			if (debugging) {
				console.log()
				console.log(offset(getPrettyCode(test.code), chalk.bgWhiteBright))
				console.log()
			}

			try {
				tester.run(name, rule, { valid: [], invalid: [], [type]: [test] })

			} catch (error) {
				console.log('🔴 ' + chalk.bold(name))

				console.log()
				console.log(offset(getPrettyCode(test.code), chalk.bgRed))
				console.log()

				console.error(offset(error.message, chalk.red))
				if (debugging && error.stack) {
					console.error(offset(error.stack, chalk.red))
				}

				process.exit(1)
			}
		}
	}

	console.log((skipped ? '🟡' : '✅') + ' ' + name)
}

console.log()
console.log(`Done testing ${ruleNames.length} rules.`)

function offset(text, decorateLine = line => line) {
	return text.split('\n').map(line => '   ' + decorateLine(line)).join('\n')
}

function getPrettyCode(text) {
	const trimmedCode = text.split('\n').filter((line, rank, list) =>
		(rank === 0 || rank === list.length - 1) ? line.trim().length > 0 : true
	)

	const indent = _.minBy(
		trimmedCode
			.filter(line => line.trim().length > 0)
			.map(line => (line.match(/^(\t|\s)+/) || [''])[0]),
		indent => indent.length
	) || ''

	return trimmedCode.map(line => line
		.replace(new RegExp('^' + indent), '')
		.replace(/^\t+/, tabs => '  '.repeat(tabs.length))
	).join('\n')
}
