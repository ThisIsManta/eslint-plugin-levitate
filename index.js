const fs = require('fs')

const rules = fs.readdirSync(__dirname + '/rules')
	.map(name => name.replace(/\.js$/, ''))
	.reduce(function (hash, name) {
		hash[name] = require('./rules/' + name)
		return hash
	}, {})

module.exports = { rules }
