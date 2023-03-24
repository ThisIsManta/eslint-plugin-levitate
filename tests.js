const TestRunner = require('eslint').RuleTester
const detectIndent = require('detect-indent')
const chalk = require('chalk')

const tester = new TestRunner({
	parserOptions: { ecmaVersion: 6, sourceType: 'module' }
})

const narrowingWords = process.argv.slice(2).filter(word => !word.startsWith('-'))
const ruleNames = require('./rules')
	.filter(name => narrowingWords.length > 0 ? narrowingWords.some(text => name.includes(text)) : true)

const debugging = !!process.env.DEBUG || process.argv.includes('--debug') || process.argv.includes('-d')

if (ruleNames.length === 0) {
	console.error(chalk.red('Could not find any rules to test.'))
	process.exit(1)
}

for (const name of ruleNames) {
	const rule = require('./edge/' + name)
	if (!rule.tests) {
		console.log('🚧 ' + name)
		continue
	}

	if (debugging) {
		console.log('🟡 ' + name)
	}

	for (const type of ['valid', 'invalid']) {
		for (const test of rule.tests[type]) {
			if (!test || !test.code) {
				continue
			}

			const { indent } = detectIndent(test.code)
			const code = test.code.split('\n')
				.filter((line, rank, list) =>
					(rank === 0 || rank === list.length - 1) ? line.trim().length > 0 : true
				)
				.map(line => line.replace(new RegExp('^' + indent), ''))
				.join('\n')

			if (debugging) {
				console.log()
				console.log(chalk.bgWhiteBright(code))
				console.log()
			}

			try {
				tester.run(name, rule, { valid: [], invalid: [], [type]: [test] })

			} catch (error) {
				console.log('🔴 ' + chalk.bold(name))

				console.log()
				console.log(chalk.bgRed(code))
				console.log()

				console.error(chalk.red(error.message))
				process.exit(1)
			}
		}
	}

	if (narrowingWords.length > 0) {
		console.log('🟢 ' + name)
	}
}

console.log()
console.log(`Done testing ${ruleNames.length} rules.`)
