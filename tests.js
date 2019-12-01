const TestRunner = require('eslint').RuleTester
const ruleList = require('./rules')

ruleList.forEach(function (name) {
	const rule = require('./edge/' + name)
	if (rule.test) {
		console.log('Testing ' + name)
		new TestRunner().run(name, rule, rule.test)
	} else {
		console.log('Skipping ' + name)
	}
})
console.log('Done')
