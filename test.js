process.env.TEST = true

const { rules } = require('./build')

const { RuleTester } = require('eslint')
const tester = new RuleTester()

for (const { name, path } of rules) {
	const rule = require(path)

	if (typeof rule.tests === 'object' && rule.tests !== null) {
		console.log('🟡', name)

		tester.run(name, rule, rule.tests)

		deleteLastLine()
		console.log('🟢', name)
	} else {
		console.log('⚪', name)
	}
}

function deleteLastLine() {
	process.stdout.write('\x1b[F\x1b[K')
}
