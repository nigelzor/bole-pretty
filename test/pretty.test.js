'use strict'

var test = require('tap').test
var bole = require('bole')
var pretty = require('../pretty')
var os = require('os')
var split = require('split2')
var hostname = os.hostname()

// fake the pino interface with bole behind the scenes
function pino (p, name) {
  var instance = bole(name || 'test/pretty')
  bole.reset()
  bole.output([
    {level: 'debug', stream: p}
  ])
  return instance
}

test('pino transform prettifies', function (t) {
  t.plan(4)
  var prettier = pretty()
  prettier.pipe(split(function (line) {
    t.ok(line.match(/.*hello world$/), 'end of line matches')
    t.ok(line.match(/(?!^)INFO.*/), 'includes level')
    t.ok(line.indexOf('' + process.pid) > 0, 'includes pid')
    t.ok(line.indexOf('' + hostname) > 0, 'includes hostname')
    return line
  }))
  var instance = pino(prettier)

  instance.info('hello world')
})

test('pino pretty moves level to start on flag', function (t) {
  t.plan(4)
  var prettier = pretty({ levelFirst: true })
  prettier.pipe(split(function (line) {
    t.ok(line.match(/.*hello world$/), 'end of line matches')
    t.ok(line.match(/^INFO.*/), 'level is at start of line')
    t.ok(line.indexOf('' + process.pid) > 0, 'includes pid')
    t.ok(line.indexOf('' + hostname) > 0, 'includes hostname')
    return line
  }))
  var instance = pino(prettier)

  instance.info('hello world')
})

test('pino pretty force color on flag', function (t) {
  t.plan(1)
  var prettier = pretty({ forceColor: true })
  prettier.pipe(split(function (line) {
    t.ok(line.match(/.*\u001b\[32mINFO\u001b\[39m.*\u001b\[36mhello world\u001b\[39m$/), 'color coding information is encoded in the line')
    return line
  }))
  var instance = pino(prettier)

  instance.info('hello world')
})
test('pino transform can just parse the dates', function (t) {
  t.plan(1)
  var prettier = pretty({ timeTransOnly: true })
  prettier.pipe(split(function (line) {
    var obj = JSON.parse(line)
    t.ok(typeof obj.time === 'string', 'time is a string')
    return line
  }))
  var instance = pino(prettier)

  instance.info('hello world')
})

test('pino transform can format with a custom function', function (t) {
  t.plan(1)
  var prettier = pretty({ formatter: function (line) {
    return 'msg: ' + line.message + ', foo: ' + line.foo
  } })
  prettier.pipe(split(function (line) {
    t.ok(line === 'msg: hello world, foo: bar', 'line matches')
    return line
  }))
  var instance = pino(prettier)

  instance.info({foo: 'bar'}, 'hello world')
})

// TODO: this doesn't actually test the error formatting
// test('pino transform prettifies Error', function (t) {
//   var prettier = pretty()
//   var err = new Error('hello world')
//   var expected = err.stack.split('\n')
//   expected.unshift(err.message)
//
//   t.plan(expected.length)
//
//   prettier.pipe(split(function (line) {
//     console.log(line, expected)
//     t.ok(line.indexOf(expected.shift()) >= 0, 'line matches')
//     return line
//   }))
//
//   var instance = pino(prettier)
//
//   instance.info(err)
// })

test('pino transform preserve output if not valid JSON', function (t) {
  t.plan(1)
  var prettier = pretty()
  var lines = []
  prettier.pipe(split(function (line) {
    lines.push(line)
    return line
  }))

  prettier.write('this is not json\nit\'s just regular output\n')
  prettier.end()

  t.deepEqual(lines, ['this is not json', 'it\'s just regular output'], 'preserved lines')
})

test('handles missing time', function (t) {
  t.plan(1)
  var prettier = pretty()
  var lines = []
  prettier.pipe(split(function (line) {
    lines.push(line)
    return line
  }))

  prettier.write('{"hello":"world"}')
  prettier.end()

  t.deepEqual(lines, ['{"hello":"world"}'], 'preserved lines')
})

test('pino transform prettifies properties', function (t) {
  t.plan(1)
  var prettier = pretty()
  var first = true
  prettier.pipe(split(function (line) {
    if (first) {
      first = false
    } else {
      t.equal(line, '    a: "b"', 'prettifies the line')
    }
    return line
  }))
  var instance = pino(prettier)

  instance.info({ a: 'b' }, 'hello world')
})

test('pino transform treats the name with care', function (t) {
  t.plan(1)
  var prettier = pretty()
  prettier.pipe(split(function (line) {
    t.ok(line.match(/\(matteo\/.*$/), 'includes the name')
    return line
  }))
  var instance = pino(prettier, 'matteo')

  instance.info('hello world')
})

test('handles `null` input', function (t) {
  t.plan(1)
  var prettier = pretty()
  prettier.pipe(split(function (line) {
    t.is(line, 'null')
    return line
  }))
  prettier.write('null')
  prettier.end()
})

test('handles `undefined` input', function (t) {
  t.plan(1)
  var prettier = pretty()
  prettier.pipe(split(function (line) {
    t.is(line, 'undefined')
    return line
  }))
  prettier.write('undefined')
  prettier.end()
})

test('handles `true` input', function (t) {
  t.plan(1)
  var prettier = pretty()
  prettier.pipe(split(function (line) {
    t.is(line, 'true')
    return line
  }))
  prettier.write('true')
  prettier.end()
})
