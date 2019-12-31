import { client } from 'nightwatch-api'

function cleanupLogMessage (message) {
  message = message.replace(/\\u003C/gi, '')
  // revive newlines
  message = message.replace(/\\n/g, '\n')
  return message
}

exports.getAllLogs = async function () {
  let logs = []
  await client.getLog('browser', (entries) => {
    logs = entries
  })
  return logs
}

exports.getAllLogsWithDateTime = async function () {
  const logs = await exports.getAllLogs()
  return logs.filter(entry => !entry.message.includes('favicon.ico'))
    .map(entry => new Date(entry.timestamp).toUTCString() + ' - ' + cleanupLogMessage(entry.message))
}

exports.checkConsoleErrors = async function () {
  const logs = await exports.getAllLogs()
  return logs.filter((entry) => {
    return entry.level === 'SEVERE'
  }).map((entry) => {
    if (entry.message.indexOf('favicon.ico') >= 0) {
      return
    }
    return new Date(entry.timestamp).toUTCString() + ' - ' + cleanupLogMessage(entry.message)
  })
}
