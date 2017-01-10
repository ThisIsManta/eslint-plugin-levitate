const ruleList = require('./rules.js')

module.exports = {
	rules: ruleList.reduce(function (hash, name) {
		hash[name] = require('./edge/' + name)
		return hash
	}, {}),
	rulesConfig: ruleList.reduce(function (hash, name) {
		hash[name] = 'off'
		return hash
	}, {})
}
