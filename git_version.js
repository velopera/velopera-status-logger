const { gitDescribeSync } = require('git-describe')
const fs = require('fs')
const util = require('util')

try {
    const gitInfo = gitDescribeSync(__dirname)
    console.log(gitInfo)

    let version = {
        tag: gitInfo.tag || 'untagged',
        raw: gitInfo.raw
    }

    const GitCommandLine = require('git-command-line')
    const Git = new GitCommandLine(__dirname)

    const ref = gitInfo.tag ? `${gitInfo.tag} -1` : 'HEAD'

    Git.log(`${ref} --pretty`)
        .then(log => {
            let logParsable = log.res.trim()
            let splitTest = logParsable.split(/\n|commit|Author|Date|: /)

            for (let i = 0; i < splitTest.length; i++) {
                if (splitTest[i] === '') {
                    splitTest.splice(i, 1)
                    i--
                } else {
                    splitTest[i] = splitTest[i].trim()
                }
            }

            version['Commit'] = splitTest[0] || 'unknown'
            version['Author'] = splitTest[1] || 'unknown'
            version['Date'] = splitTest[2] || 'unknown'
            version['Message'] = splitTest[3] || 'unknown'

            fs.writeFileSync(
                './src/version_info.ts',
                'export const version = ' + util.inspect(version),
                'utf-8'
            )
            console.log(
                'Version info written to ./src/version_info.ts: ' +
                JSON.stringify(version, null, 2)
            )
        })
        .catch(err => {
            console.error('Error getting git log:', err)
            // Write basic version info even if log fails
            fs.writeFileSync(
                './src/version_info.ts',
                'export const version = ' + util.inspect(version),
                'utf-8'
            )
        })
} catch (err) {
    console.error('Error getting git info:', err)
    // Write minimal version info if everything fails
    fs.writeFileSync(
        './src/version_info.ts',
        'export const version = { tag: "unknown", raw: "unknown" }',
        'utf-8'
    )
}