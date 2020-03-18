const sh = require('shelljs')
const path = require('path')

function cd(dir, tip) {
  const result = sh.cd(dir)
  if (result.code === 1) throw new Error('shell execute fail: ', result.code)
  tip && console.log(tip, sh.pwd().toString())
  return result
}

function exec(command, description) {
  console.log(`${description ? '✴️' : '🚀' }  ${description || command}`)
  const result = sh.exec(command)
  if (result.code === 1) throw new Error('shell execute fail: ', result.code)

  return result
}

module.exports = {
  cd, exec,
  checkCommands(commands = []) {
    let cmdNotFound = []

    commands.forEach(command => {
      if (!sh.which(command)) cmdNotFound.push(command)
    })

    if (cmdNotFound.length > 0) {
      sh.echo(`抱歉，此工具需要 [${commands}] 才能运行，但你的系统里缺少这些命令：[${cmdNotFound}]`)
      return false
    } else {
      return true
    }
  },
  // 跳转到项目目录
  cdProjectDir(projectName) {
    cd(path.join(__dirname, 'projects', projectName), 'ROM目录：')
  },
}