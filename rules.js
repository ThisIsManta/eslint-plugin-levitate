const fs = require('fs')
module.exports = fs.readdirSync(__dirname + '/edge').map(name => name.replace(/\.js$/, ''))
