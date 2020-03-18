const sh = require('shelljs')
const fs = require('fs')
const path = require('path')
const inquirer = require("inquirer")
const {checkCommands} = require('./utils')

function funcTransformSystemNewDatToSystemImg() {
    if (!checkCommands(['brotli', 'python'])) {
        return
    }
    console.log('OK.')
}

async function main() {

    const funcs = [
        { short: '1', name: '转换 system.new.dat 为 system.img', value: funcTransformSystemNewDatToSystemImg },
        { short: '', name: '挂载 system.img', value: () => { } },
        { short: '', name: '保存修改过后的 system', value: () => { } },
        { short: '', name: '转换 system_new.img 为 system.new.dat', value: () => { } },
        { short: '', name: '退出程序', value: () => { console.log('Bye.'); process.exit(0) } }
    ]

    await inquirer.prompt([
        {
            type: 'list',
            name: 'func',
            message: '欢迎使用ROM工具箱，你需要做什么？',
            choices: funcs,
        }
    ]).then(answers => {
        answers.func()

        console.log('\n====== 执行结束 ======')
        setTimeout(() => {
            main()
        }, 500);
    })
}

main()