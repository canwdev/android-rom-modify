const sh = require('shelljs')
const fs = require('fs')
const path = require('path')
const inquirer = require("inquirer")
const { checkCommands, cdProjectDir, exec } = require('./utils')

const workDir = path.join(__dirname, 'projects')
const sdat2img = path.join(__dirname, 'lib', 'sdat2img.py')
const rimg2sdat = path.join(__dirname, 'lib', 'rimg2sdat.py')

// cd 到项目目录并返回相关路径
let lastProjectFolderName;
async function goProjectDir() {
    const folders = fs.readdirSync(workDir, { withFileTypes: true }).filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)

    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'folder',
            message: '请选择ROM所在目录',
            choices: folders,
            default: lastProjectFolderName
        }
    ])
    const projectFolderName = answers.folder
    lastProjectFolderName = projectFolderName

    cdProjectDir(projectFolderName)

    return {
        projectFolderName: projectFolderName,
        projectPath: path.join(workDir, projectFolderName)
    }
}

/**
 * 转换 system.new.dat 为 system.img
 */
async function funcTransformSystemNewDatToSystemImg() {
    if (!checkCommands(['brotli', 'python'])) {
        return
    }

    const { projectPath } = await goProjectDir()

    if (fs.existsSync(path.join(projectPath, 'system.img'))) {
        console.log('错误：已存在 system.img，请手动删除它再执行此工具')
        return
    }

    // 转换 system.new.dat.br 文件（如果必要）（该功能未测试）
    const system_new_dat_br = path.join(projectPath, 'system.new.dat.br')
    if (fs.existsSync(system_new_dat_br)) {
        exec(`brotli -d ${system_new_dat_br}`)
    }

    // 转换 system.new.dat 为 system.img
    const system_transfer_list = path.join(projectPath, 'system.transfer.list')
    const system_new_dat = path.join(projectPath, 'system.new.dat')
    if (fs.existsSync(system_new_dat) && fs.existsSync(system_transfer_list)) {
        exec(`python ${sdat2img} system.transfer.list system.new.dat system.img`)
    } else {
        console.error('错误：system.transfer.list 或 system.new.dat 不存在！')
        return
    }
}

/**
 * 挂载 system.img 镜像
 */
let lastMountName = 'system'
async function funcMountSystemImg() {
    await goProjectDir()

    await inquirer.prompt([
        {
            type: 'input',
            name: 'name',
            message: '请输入要挂载的文件夹名字',
            default: lastMountName
        }
    ]).then(answers => {
        const name = answers.name
        lastMountName = name

        const mountPath = `/mnt/${name}`

        exec(`sudo mkdir -p ${mountPath}`, `正在创建挂载文件夹：${mountPath}`)
        exec(`sudo mount -o loop system.img ${mountPath}`, `正在挂载 system.img`)


        console.log(`挂载成功！此时可以使用 root 权限随意修改内容了。已挂载到：${mountPath}`)
    })
}

/**
 * 卸载镜像
 * @param {str} mountPath 挂载的位置 
 */
function umountImg(mountPath) {
    exec(`sudo umount ${mountPath}`, `正在卸载 ${mountPath}`)
    console.log('卸载成功！')
    exec(`sudo rm -rf ${mountPath}`, `删除挂载文件夹：${mountPath}`)
}

/**
 * 更新修改过后的 system.img 并卸载镜像
 */
async function funcSaveAndUmount() {
    if (!checkCommands(['make_ext4fs'])) {
        return
    }

    await goProjectDir()

    await inquirer.prompt([
        {
            type: 'input',
            name: 'name',
            message: '请输入之前挂载的文件夹名字（在/mnt/）',
            default: lastMountName
        }
    ]).then(answers => {
        const name = answers.name
        lastMountName = name

        const mountPath = `/mnt/${name}`

        // 保存修改过后的 /mnt/system 为 system_new.img
        exec(`sudo make_ext4fs -T 0 -S file_contexts -l 2048M -a system system_new.img ${mountPath}`, `正在从 ${mountPath} 保存镜像...`)

        // 卸载 /mnt/system
        umountImg(mountPath)

        // 更新文件
        exec(`mv system.img system.img.bak`)
        exec(`mv system_new.img system.img`)
    })
}

/**
 * 转换 system.img 为 system.new.dat
 */
async function funcTransformSystemImgToSystemNewDat() {
    await goProjectDir()

    // 备份旧文件
    exec(`mv system.transfer.list system.transfer.list.bak`)
    exec(`mv system.new.dat system.new.dat.bak`)

    // -v 指定版本为 1（兼容旧TWRP），输出 system.new.dat 和 
    exec(`python ${rimg2sdat} -v 1 system.img`)
}

async function funcClearAndBundleZip() {
    if (!checkCommands(['7z'])) {
        return
    }
    
    const {projectFolderName} = await goProjectDir()
    exec('rm -f *.bak system.img')
    exec(`7z a -tzip -bsp1 ${projectFolderName}.zip`, '正在打包，可能较慢...')
    console.log('成功！')
}

async function main() {
    const funcs = [
        { name: '转换 system.new.dat 为 system.img', value: funcTransformSystemNewDatToSystemImg },
        { name: '挂载 system.img 镜像', value: funcMountSystemImg },
        { name: '更新修改过后的 system.img 并卸载镜像', value: funcSaveAndUmount },
        { name: '转换 system.img 为 system.new.dat', value: funcTransformSystemImgToSystemNewDat },
        { name: '清理并打包 zip 刷机包', value: funcClearAndBundleZip },
        { name: '退出程序', value: () => { console.log('Bye.'); process.exit(0) } }
    ]

    await inquirer.prompt([
        {
            type: 'list',
            name: 'func',
            message: '🌟欢迎使用ROM工具箱！🌟\n先将ROM包解压到 projects 目录（如：projects/crdroid-5.1.1-20151031-Z00A）\n然后，请选择一个操作：',
            choices: funcs
        }
    ]).then(async answers => {
        await answers.func()

        console.log('\n====== 执行结束 ======')
        setTimeout(() => {
            main()
        }, 500);
    })
}

main()

// funcMountSystemImg()