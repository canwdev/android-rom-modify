const sh = require('shelljs')

module.exports = {
  checkCommands(commands = []) {
    let cmdNotFound = []

    commands.forEach(command => {
      if (!sh.which(command)) cmdNotFound.push(command)
    })

    if (cmdNotFound.length > 0) {
      sh.echo(`Sorry, this script requires [${commands}] but [${cmdNotFound}] command not found`)
      return false
    } else {
      return true
    }
  }
}