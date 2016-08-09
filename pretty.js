#! /usr/bin/env node

'use strict'

var split = require('split2')
var Parse = require('fast-json-parse')
var chalk = require('chalk')

var standardKeys = [
    'pid',
    'hostname',
    'name',
    'level',
    'msg',
    'time',
    'v'
]

function withSpaces(value) {
    var lines = value.split('\n')
    for (var i = 1; i < lines.length; i++) {
        lines[i] = '    ' + lines[i]
    }
    return lines.join('\n')
}

function filter(value) {
    var keys = Object.keys(value)
    var result = ''

    for (var i = 0; i < keys.length; i++) {
        if (standardKeys.indexOf(keys[i]) < 0) {
            result += '    ' + keys[i] + ': ' + withSpaces(JSON.stringify(value[keys[i]], null, 2)) + '\n'
        }
    }

    return result
}

function pretty(opts) {
    var timeTransOnly = opts && opts.timeTransOnly

    var stream = split(mapLine)
    var ctx
    var levelColors

    var pipe = stream.pipe

    stream.pipe = function (dest, opts) {
        ctx = new chalk.constructor({
            enabled: !!(chalk.supportsColor && dest.isTTY)
        })

        levelColors = {
            fatal: ctx.bgRed,
            error: ctx.red,
            warn: ctx.yellow,
            info: ctx.green,
            debug: ctx.blue,
            trace: ctx.grey
        }

        pipe.call(stream, dest, opts)
    }

    return stream

    function mapLine(line) {
        var parsed = new Parse(line)
        var value = parsed.value

        if (parsed.err) {
            // pass through
            return line + '\n'
        }

        if (timeTransOnly) {
            value.time = new Date(value.time).toISOString()
            return JSON.stringify(value) + '\n'
        }

        line = '[' + new Date(value.time).toISOString() + '] ' + asColoredLevel(value)
        line += ' ('
        if (value.name) {
            line += value.name + '/'
        }
        line += value.pid + ' on ' + value.hostname + ')'
        line += ': '
        if (value.msg || value.message) {
            line += ctx.cyan(value.msg || value.message)
        }
        line += '\n'
        if (value.type === 'Error') {
            line += '    ' + withSpaces(value.stack) + '\n'
        } else {
            line += filter(value)
        }
        return line
    }

    function asColoredLevel(value) {
        return levelColors[value.level](value.level.toUpperCase())
    }
}

module.exports = pretty

if (require.main === module) {
    if (arg('-h') || arg('--help')) {
        usage().pipe(process.stdout)
    } else if (arg('-v') || arg('--version')) {
        console.log(require('./package.json').version)
    } else {
        process.stdin.pipe(pretty({
            timeTransOnly: arg('-t')
        })).pipe(process.stdout)
    }
}

function usage() {
    return require('fs')
        .createReadStream(require('path').join(__dirname, 'usage.txt'))
}

function arg(s) {
    return !!~process.argv.indexOf(s)
}
