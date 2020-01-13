import assert from 'assert'
import { setDefaultTimeout, After, Before } from 'cucumber'
import { createSession, closeSession, client, startWebDriver, stopWebDriver } from 'nightwatch-api'
import { rollbackConfigs, setConfigs, cacheConfigs } from './helpers/config'
import { getAllLogsWithDateTime } from './helpers/browserConsole'

const RUNNING_ON_CI = !!process.env.CI
const RUNNING_ON_SAUCELABS = !!process.env.SAUCE_USERNAME

const CUCUMBER_LOCAL_TIMEOUT = 60000
const CUCUMBER_DRONE_TIMEOUT = 180000
const SAUCELABS_ASYNC_SCRIPT_TIMEOUT = 10000
const CUCUMBER_TIMEOUT = RUNNING_ON_CI ? CUCUMBER_DRONE_TIMEOUT : CUCUMBER_LOCAL_TIMEOUT
setDefaultTimeout(CUCUMBER_TIMEOUT)

let env = RUNNING_ON_CI ? 'drone' : 'local'
env = RUNNING_ON_SAUCELABS ? 'saucelabs' : env

Before(function startDriverOnLocal () {
  return RUNNING_ON_CI || startWebDriver({ env })
})

Before(function createSessionForEnv () {
  return createSession({ env })
})

Before(function logSessionInfoOnSauceLabs () {
  if (process.env.SAUCE_USERNAME) {
    return client
      .session(function (session) {
        console.log('  Link to saucelabs job: https://app.saucelabs.com/tests/' + session.sessionId)
      })
      .timeoutsAsyncScript(SAUCELABS_ASYNC_SCRIPT_TIMEOUT)
  }
})

async function cacheAndSetConfigs (server) {
  await cacheConfigs(server)
  return setConfigs(
    server,
    client.globals.backend_admin_username
  )
}

Before(function cacheAndSetConfigsOnLocal () {
  return cacheAndSetConfigs(client.globals.backend_url)
})

Before(function cacheAndSetConfigsOnRemoteIfExists () {
  if (client.globals.remote_backend_url) {
    return cacheAndSetConfigs(client.globals.remote_backend_url)
  }
})

// After hooks are run in reverse order in which they are defined
// https://github.com/cucumber/cucumber-js/blob/master/docs/support_files/hooks.md#hooks
After(function rollbackConfigsOnRemoteIfExists () {
  if (client.globals.remote_backend_url) {
    return rollbackConfigs(client.globals.remote_backend_url)
  }
})

After(function rollbackConfigsOnLocal () {
  return rollbackConfigs(client.globals.backend_url)
})

After(function stopDriverIfOnLocal () {
  return RUNNING_ON_CI || stopWebDriver()
})

After(function closeSessionForEnv () {
  return closeSession()
})

After(async function failIfThereIsConsoleError () {
  const logs = await getAllLogsWithDateTime('SEVERE')
  assert.strictEqual(
    logs.length, 0,
    '\nThe following errors were found in the browser console:\n' +
    logs.join('\n')
  )
})
