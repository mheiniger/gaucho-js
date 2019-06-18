#!/usr/bin/env node

const yargs = require('yargs')
const requests = require('axios')
const WebSocket = require('ws')
const util = require('util')

const URL_SERVICE = '/services/'
const URL_ENVIRONMENT = '/projects/'
let HOST = 'http://rancher.local:8080/v1'
let USERNAME = 'userid'
let PASSWORD = 'password'

// Attempts to read environment variables to configure the program.
if (process.env['CATTLE_ACCESS_KEY']) {
  USERNAME = process.env['CATTLE_ACCESS_KEY']
}
if (process.env['CATTLE_SECRET_KEY']) {
  PASSWORD = process.env['CATTLE_SECRET_KEY']
}
if (process.env['CATTLE_URL']) {
  HOST = process.env['CATTLE_URL']
}
if (process.env['RANCHER_ACCESS_KEY']) {
  USERNAME = process.env['RANCHER_ACCESS_KEY']
}
if (process.env['RANCHER_SECRET_KEY']) {
  PASSWORD = process.env['RANCHER_SECRET_KEY']
}
if (process.env['RANCHER_URL']) {
  HOST = process.env['RANCHER_URL']
}
if (process.env['SSL_VERIFY']) {
  if ((process.env['SSL_VERIFY'].lower() === 'false')) {
    process.env['SSL_VERIFY'] = false
  }
}
if (HOST && HOST.search(/\/v1$/) < 0) {
  HOST = (`${HOST}/v1`)
}

// HTTP
async function getRequest (url, options = {}) {
  try {
    return await requests.get(url, {'auth': {username: USERNAME, password: PASSWORD}})
  } catch (err) {
    if (!options.silentError === true) {
      console.log(err, err.message)
    }
    return 
  }
}

async function postRequest (url, data = '') {
  try {
    if (data) {
      return await requests.post(url, {'data': JSON.stringify(data), 'auth': {username: USERNAME, password: PASSWORD}})
    } else {
      return await requests.post(url, {'data': '', 'auth': {username: USERNAME, password: PASSWORD}})
    }
  } catch (err) {
    return console.log(err, err.message)
  }
}

async function deleteRequest (url, data = '') {
  try {
    if (data) {
      return await requests.delete(url, {
        'data': JSON.stringify(data),
        'auth': {username: USERNAME, password: PASSWORD}
      })
    } else {
      return await requests.delete(url, {'data': '', 'auth': {username: USERNAME, password: PASSWORD}})
    }
  } catch (err) {
    return console.log(err, err.message)
  }
}

// Websocket
function ws (url) {
  const ws = new WebSocket(url)

  return new Promise((resolve, reject) => {
    ws.on('message', function incoming (data) {
      return resolve(data)
    })
  })
}

// Helper
function printJson (data) {
  console.log(util.inspect(data))
}

async function sleep (seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000))
}

//
// Query the service configuration.
//
yargs.command('query [service_id]', 'The ID of the service to read (optional)', () => {
}, (argv) => {
  query(argv.service_id)
})

async function query (serviceId = '') {
  /* Retrieves the service information.

    If you don't specify an ID, data for all services
    will be retrieved.
    */
  const r = await getRequest(((HOST + URL_SERVICE) + serviceId))
  printJson(r.data)
}

//
// Wait for Rancher to come up
//
yargs.command('wait_for_rancher [options]', 'Wait for Rancher to start with an active project', (yargs) => {
  yargs.positional('timeout', {describe: 'How many seconds to wait until waiting fails'})
}, async (argv) => {
  console.log(await waitForRancher(argv.timeout))
})

async function waitForRancher (timeout = 120) {
  let sleepCount = 0
  let firstProjecctState, r
  while ((firstProjecctState !== 'active') && (sleepCount < (timeout / 2))) {
    console.log('Waiting for rancher to start...')
    await sleep(2)
    r = await getRequest(HOST + URL_ENVIRONMENT, {silentError: true})
    if (r && r.data && r.data.data && r.data.data[0] && r.data.data[0].state) {
      firstProjecctState = r.data.data[0].state
      console.log('First projects state is:' + firstProjecctState)
    }
    
    sleepCount += 1
  }
  return 'rancher started'
}

//
// Converts a service name into an ID
//
yargs.command('id_of <name> [options]', 'Converts a service name into an ID', (yargs) => {
  yargs.positional('name', {describe: 'The name of the service to lookup.'})
    .positional('newest', {describe: 'From list of IDs, return newest (optional)'})
}, async (argv) => {
  console.log(await idOf(argv.name, argv.newest))
})

async function idOf (name = '', newest = false) {
  const response = await getRequest(`${HOST}/services?name=${name}`)
  const service = response.data
  if (newest) {
    return service.data[service.data.length - 1].id
  }
  return service.data[0].id
}

//
// Converts a environment name into an ID
//
yargs.command('id_of_env <name>', 'Converts a environment name into an ID', (yargs) => {
  yargs.positional('name', {describe: 'The name of the environment to lookup'})
}, async (argv) => {
  console.log(await idOfEnv(argv.name))
})

async function idOfEnv (name = '') {
  const environment = await getRequest((`${HOST}/project?name=${name}`))
  return environment.data['data'][0]['id']
}

//
// Start containers within a service (e.g. for Start Once containers).
//
yargs.command('start_containers <service_id>', 'Start containers within a service (e.g. for Start Once containers).', (yargs) => {
  yargs.positional('service_id', {describe: 'The ID of the service to start the containers of.'})
}, async (argv) => {
  console.log(await startContainers(argv.service_id))
})

function startContainers (serviceId) {
  startService(serviceId)
}

//
// Start containers within a service (e.g. for Start Once containers).
//
yargs.command('start_service <service_id>', 'Start containers within a service (e.g. for Start Once containers).', (yargs) => {
  yargs.positional('service_id', {describe: 'The ID of the service to start the containers of.'})
}, async (argv) => {
  console.log(await startService(argv.service_id))
})

async function startService (serviceId) {
  const containers = await getRequest((`${(HOST + URL_SERVICE) + serviceId}/instances`)).data
  containers.forEach(async (container) => {
    const startUrl = container.actions.start
    console.log(('Starting container %s with url %s' % [container['name'], startUrl]))
    await postRequest(startUrl, '')
  })
}

//
// Stop containers within a service.
//
yargs.command('stop_service <service_id>', 'Stop containers within a service.', (yargs) => {
  yargs.positional('service_id', {describe: 'The ID of the service to stop the containers of.'})
}, async (argv) => {
  console.log(await stopService(argv.service_id))
})

async function stopService (serviceId) {
  const containers = await getRequest((`${(HOST + URL_SERVICE) + serviceId}/instances`)).data
  containers.forEach(async (container) => {
    const stopUrl = container['actions']['stop']
    console.log(('Stopping container %s with url %s' % [container['name'], stopUrl]))
    await postRequest(stopUrl, '')
  })
}


//
// Restart containers within a service
//
yargs.command('restart_service <service_id>', 'Restart containers within a service.', (yargs) => {
  yargs.positional('service_id', {describe: 'The ID of the service to restart the containers of.'})
}, async (argv) => {
  console.log(await restartService(argv.service_id))
})

async function restartService (serviceId) {
  const containers = await getRequest((`${(HOST + URL_SERVICE) + serviceId}/instances`)).data
  containers.forEach(async (container) => {
    const restartUrl = container['actions']['restart']
    console.log((`Restarting container: ${container['name']}`))
    await postRequest(restartUrl)
  })
}

//
// Upgrades the service.
//
yargs.command('upgrade <service_id> [options]', 'Upgrades the service.', (yargs) => {
  yargs.positional('service_id', {describe: 'The ID of the service to upgrade.'})
    .positional('complete_previous', {describe: 'If set and the service was previously upgraded but the upgrade wasn\'t completed, it will be first marked as Finished and then the upgrade will occur.'})
    .positional('imageUuid', {describe: 'If set the config will be overwritten to use new image. Don\'t forget Rancher Formatting \'docker:<Imagename>:tag\''})
    .positional('auto_complete', {describe: 'Set this to automatically \'finish upgrade\' once upgrade is complete'})
    .positional('replace_env_name', {describe: 'The name of an environment variable to be changed in the launch config (requires replace_env_value).'})
    .positional('replace_env_value', {describe: 'The value of the environment variable to be replaced (requires replace_env_name).'})
    .positional('timeout', {describe: 'How many seconds to wait until an upgrade fails'})
}, async (argv) => {
  console.log(await upgrade(argv.service_id, argv.start_first, argv.complete_previous, argv.imageUuid, argv.auto_complete, argv.batch_size, argv.interval_millis, argv.replace_env_name, argv.replace_env_value, argv.timeout))
})

async function upgrade (serviceId, startFirst = true, completePrevious = false, imageUuid = null, autoComplete = false, batchSize = 1, intervalMillis = 10000, replaceEnvName = null, replaceEnvValue = null, timeout = 60) {
  /* Upgrades a service

    Performs a service upgrade, keeping the same configuration, but otherwise
    pulling new image as needed and starting new containers, dropping the old
    ones.
    */
  let currentServiceConfig, r, sleepCount, upgradedSleepCount
  const upgradeStrategy = {
    'inServiceStrategy': {
      'batchSize': 1,
      'intervalMillis': 10000,
      'startFirst': true,
      'launchConfig': {},
      'secondaryLaunchConfigs': []
    }
  }
  upgradeStrategy.inServiceStrategy.batchSize = batchSize
  upgradeStrategy.inServiceStrategy.intervalMillis = intervalMillis
  if (startFirst) {
    upgradeStrategy.inServiceStrategy.startFirst = 'true'
  } else {
    upgradeStrategy.inServiceStrategy.startFirst = 'false'
  }
  r = await getRequest(((HOST + URL_SERVICE) + serviceId))
  currentServiceConfig = r.data
  if ((completePrevious && (currentServiceConfig.state === 'upgraded'))) {
    console.log('Previous service upgrade wasn\'t completed, completing it now...')
    await postRequest((`${(HOST + URL_SERVICE) + serviceId}?action=finishupgrade`), '')
    r = await getRequest(((HOST + URL_SERVICE) + serviceId))
    currentServiceConfig = r.data
    sleepCount = 0
    while (((currentServiceConfig['state'] !== 'active') && (sleepCount < (timeout / 2)))) {
      console.log('Waiting for upgrade to finish...')
      await sleep(2)
      r = await getRequest(((HOST + URL_SERVICE) + serviceId))
      currentServiceConfig = r.data
      sleepCount += 1
    }
  }
  if ((currentServiceConfig['state'] !== 'active')) {
    console.log(('Service cannot be updated due to its current state: %s' % currentServiceConfig['state']))
    process.exit(1)
  }
  upgradeStrategy['inServiceStrategy']['launchConfig'] = currentServiceConfig['launchConfig']
  if (((replaceEnvName !== null) && (replaceEnvValue !== null))) {
    console.log(('Replacing environment variable %s from %s to %s' % [replaceEnvName, upgradeStrategy['inServiceStrategy']['launchConfig']['environment'][replaceEnvName], replaceEnvValue]))
    upgradeStrategy['inServiceStrategy']['launchConfig']['environment'][replaceEnvName] = replaceEnvValue
  }
  if ((imageUuid !== null)) {
    upgradeStrategy['inServiceStrategy']['launchConfig']['imageUuid'] = imageUuid
    console.log(('New Image: %s' % upgradeStrategy['inServiceStrategy']['launchConfig']['imageUuid']))
  }
  await postRequest(currentServiceConfig['actions']['upgrade'], upgradeStrategy)
  console.log(('Upgrade of %s service started!' % currentServiceConfig['name']))
  r = await getRequest(((HOST + URL_SERVICE) + serviceId))
  currentServiceConfig = r.data
  console.log(('Service State \'%s.\'' % currentServiceConfig['state']))
  console.log('Waiting for upgrade to finish...')
  sleepCount = 0
  while (((currentServiceConfig['state'] !== 'upgraded') && (sleepCount < (timeout / 2)))) {
    console.log('.')
    await sleep(2)
    r = await getRequest(((HOST + URL_SERVICE) + serviceId))
    currentServiceConfig = r.data
    sleepCount += 1
  }
  if ((sleepCount >= (timeout / 2))) {
    console.log('Upgrading take to much time! Check Rancher UI for more details.')
    process.exit(1)
  } else {
    console.log('Upgraded')
  }
  if ((autoComplete && (currentServiceConfig['state'] === 'upgraded'))) {
    await postRequest((`${(HOST + URL_SERVICE) + serviceId}?action=finishupgrade`), '')
    r = await getRequest(((HOST + URL_SERVICE) + serviceId))
    currentServiceConfig = r.data
    console.log('Auto Finishing Upgrade...')
    upgradedSleepCount = 0
    while (((currentServiceConfig['state'] !== 'active') && (upgradedSleepCount < (timeout / 2)))) {
      console.log('.')
      await sleep(2)
      r = await getRequest(((HOST + URL_SERVICE) + serviceId))
      currentServiceConfig = r.data
      upgradedSleepCount += 1
    }
    if ((currentServiceConfig['state'] === 'active')) {
      console.log('DONE')
    } else {
      console.log('Something has gone wrong!  Check Rancher UI for more details.')
      process.exit(1)
    }
  }
}

//
// Execute remote command on container.
//
yargs.command('execute <service_id> [command]', 'Execute remote command on container.', (yargs) => {
  yargs.positional('service_id', {describe: 'The ID of the service to execute on'})
    .positional('command', {describe: 'The command to execute'})
}, async (argv) => {
  console.log(await execute(argv.service_id, argv.command))
})


async function execute (serviceId, command) {
  /* Execute remote command

    Executes a command on one container of the service you specified.
    */
  const containers = await getRequest((`${(HOST + URL_SERVICE) + serviceId}/instances`))['data']
  if ((containers.length <= 0)) {
    console.log('No container available')
    process.exit(1)
  }
  const executionUrl = containers[0]['actions']['execute']
  console.log(('Executing \'%s\' on container \'%s\'' % [command, containers[0]['name']]))
  const payload = {'attachStdin': true, 'attachStdout': true, 'command': ['/bin/sh', '-c'], 'tty': true}
  payload['command'].append(command)
  const intermediate = await postRequest(executionUrl, payload)
  const wsToken = intermediate['token']
  const wsUrl = (`${intermediate['url']}?token=${wsToken}`)
  console.log(('> \n%s' % ws(wsUrl)))
  console.log('DONE')
}

//
// Rollback the service.
//
yargs.command('rollback <service_id> [options]', 'Rollback the service.', (yargs) => {
  yargs.positional('service_id', {describe: 'The ID of the service to execute on'})
    .positional('timeout', {describe: 'How many seconds to wait until an rollback fails'})
}, async (argv) => {
  console.log(await rollback(argv.service_id, argv.timeout))
})

async function rollback (serviceId, timeout = 60) {
  /* Performs a service rollback
    */
  let currentServiceConfig, r, sleepCount
  r = await getRequest(((HOST + URL_SERVICE) + serviceId))
  currentServiceConfig = r.data
  if ((currentServiceConfig['state'] !== 'upgraded')) {
    console.log(('Service cannot be updated due to its current state: %s' % currentServiceConfig['state']))
    process.exit(1)
  }
  await postRequest(currentServiceConfig['actions']['rollback'], '')
  console.log(('Rollback of %s service started!' % currentServiceConfig['name']))
  r = await getRequest(((HOST + URL_SERVICE) + serviceId))
  currentServiceConfig = r.data
  console.log(('Service State \'%s.\'' % currentServiceConfig['state']))
  console.log('Waiting for rollback to finish...')
  sleepCount = 0
  while (((currentServiceConfig['state'] !== 'active') && (sleepCount < (timeout / 2)))) {
    console.log('.')
    await sleep(2)
    r = await getRequest(((HOST + URL_SERVICE) + serviceId))
    currentServiceConfig = r.data
    sleepCount += 1
  }
  if ((sleepCount >= (timeout / 2))) {
    console.log('Rolling back take to much time! Check Rancher UI for more details.')
    process.exit(1)
  } else {
    console.log('Rolled back')
  }
}


//
// Activate a service.
//
yargs.command('activate <service_id> [options]', 'Activate a service.', (yargs) => {
  yargs.positional('service_id', {describe: 'The ID of the service to activate.'})
    .positional('timeout', {describe: 'How many seconds to wait until an upgrade fails'})
}, async (argv) => {
  console.log(await activate(argv.service_id, argv.timeout))
})

async function activate (serviceId, timeout = 60) {
  /* Activate the containers of a given service.
    */
  let currentServiceConfig, r, sleepCount
  r = await getRequest(((HOST + URL_SERVICE) + serviceId))
  currentServiceConfig = r.data
  if (currentServiceConfig['state'] !== 'inactive') {
    console.log('Service cannot be deactivated due to its current state: ' + currentServiceConfig['state'])
    process.exit(1)
  }
  await postRequest(currentServiceConfig['actions']['activate'], '')
  sleepCount = 0
  while ((currentServiceConfig['state'] !== 'active') && (sleepCount < (timeout / 2))) {
    console.log('Waiting for activation to finish...')
    await sleep(2)
    r = await getRequest(((HOST + URL_SERVICE) + serviceId))
    currentServiceConfig = r.data
    sleepCount += 1
  }
  return 'ok'
}

//
// Deactivate a service.
yargs.command('deactivate <service_id> [options]', 'Deactivate a service.', (yargs) => {
  yargs.positional('service_id', {describe: 'The ID of the service to deactivate.'})
    .positional('timeout', {describe: 'How many seconds to wait until an upgrade fails'})
}, async (argv) => {
  console.log(await deactivate(argv.service_id, argv.timeout))
})

async function deactivate (serviceId, timeout = 60) {
  /* Stops the containers of a given service. (e.g. for maintenance purposes)
    */
  let currentServiceConfig, r, sleepCount
  r = await getRequest(((HOST + URL_SERVICE) + serviceId))
  currentServiceConfig = r.data
  if ((currentServiceConfig['state'] !== 'active') && (currentServiceConfig['state'] !== 'updating-active')) {
    console.log('Service cannot be deactivated due to its current state: ' + currentServiceConfig['state'])
    process.exit(1)
  }
  await postRequest(currentServiceConfig['actions']['deactivate'], '')
  sleepCount = 0
  while (((currentServiceConfig['state'] !== 'inactive') && (sleepCount < (timeout / 2)))) {
    console.log('Waiting for deactivation to finish...')
    await sleep(2)
    r = await getRequest(((HOST + URL_SERVICE) + serviceId))
    currentServiceConfig = r.data
    sleepCount += 1
  }
  return 'ok'
}

//
// Deactivate a env.
//
yargs.command('deactivate_env <environment_id> [options]', 'Deactivate a env.', (yargs) => {
  yargs.positional('environment_id', {describe: 'The ID of the environment to deactivate.'})
    .positional('timeout', {describe: 'How many seconds to wait until an upgrade fails'})
}, async (argv) => {
  console.log(await deactivateEnv(argv.environment_id, argv.timeout))
})

async function deactivateEnv (environmentId, timeout = 60) {
  /* Stops the environment
    */
  let currentEnvironmentConfig, r, sleepCount
  r = await getRequest(((HOST + URL_ENVIRONMENT) + environmentId))
  currentEnvironmentConfig = r.data
  if ((currentEnvironmentConfig['state'] !== 'active')) {
    console.log(('Environment cannot be deactivated due to its current state: %s' % currentEnvironmentConfig['state']))
    process.exit(1)
  }
  await postRequest(currentEnvironmentConfig['actions']['deactivate'], '')
  sleepCount = 0
  while (((currentEnvironmentConfig['state'] !== 'inactive') && (sleepCount < (timeout / 2)))) {
    console.log('Waiting for deactivation to finish...')
    await sleep(2)
    r = await getRequest(((HOST + URL_ENVIRONMENT) + environmentId))
    currentEnvironmentConfig = r.data
    sleepCount += 1
  }
}

//
// Delete a env.
//
yargs.command('delete_env <environment_id> [options]', 'Delete a env.', (yargs) => {
  yargs.positional('environment_id', {describe: 'The ID of the environment to delete.'})
    .positional('timeout', {describe: 'How many seconds to wait until an upgrade fails'})
}, async (argv) => {
  console.log(await deleteEnv(argv.environment_id, argv.timeout))
})

async function deleteEnv (environmentId, timeout = 60) {
  /* Stops the environment
    */
  let currentEnvironmentConfig, r, sleepCount
  r = await getRequest(((HOST + URL_ENVIRONMENT) + environmentId))
  currentEnvironmentConfig = r.data
  if ((currentEnvironmentConfig['state'] !== 'inactive')) {
    console.log(('Environment cannot be deactivated due to its current state: %s' % currentEnvironmentConfig['state']))
    process.exit(1)
  }
  await deleteRequest(currentEnvironmentConfig['actions']['delete'], '')
  sleepCount = 0
  while (((currentEnvironmentConfig['state'] !== 'removed') && (sleepCount < (timeout / 2)))) {
    console.log('Waiting for delete to finish...')
    await sleep(2)
    r = await getRequest(((HOST + URL_ENVIRONMENT) + environmentId))
    currentEnvironmentConfig = r.data
    sleepCount += 1
  }
}

//
// Remove a service.
//

yargs.command('remove <service_id> [options]', 'Deactivate a env.', (yargs) => {
  yargs.positional('service_id', {describe: 'The ID of the service to remove.'})
    .positional('timeout', {describe: 'How many seconds to wait until an upgrade fails'})
}, async (argv) => {
  console.log(await remove(argv.service_id, argv.timeout))
})

async function remove (serviceId, timeout = 60) {
  /* Remove the service
    */
  let currentServiceConfig, r, sleepCount
  r = await getRequest(((HOST + URL_SERVICE) + serviceId))
  currentServiceConfig = r.data
  if ((currentServiceConfig['state'] !== 'inactive')) {
    console.log(('Service cannot be removed due to its current state: %s' % currentServiceConfig['state']))
    process.exit(1)
  }
  await postRequest(currentServiceConfig['actions']['remove'], '')
  sleepCount = 0
  while (((currentServiceConfig['state'] !== 'removed') && (sleepCount < (timeout / 2)))) {
    console.log('Waiting for remove to finish...')
    await sleep(2)
    r = await getRequest(((HOST + URL_SERVICE) + serviceId))
    currentServiceConfig = r.data
    sleepCount += 1
  }
}

//
// Get a service state
//
// baker.command(state, {name: 'state', default: true, opts: {'service_id': 'The ID of the service to read'}})

yargs.command('state <service_id> [options]', 'Get a service state', (yargs) => {
  yargs.positional('service_id', {describe: 'The ID of the service to read'})
}, async (argv) => {
  console.log(await state(argv.service_id))
})

async function state (serviceId = '') {
  /* Retrieves the service state information.
    */
  const r = await getRequest(((HOST + URL_SERVICE) + serviceId))
  console.log(r.data['state'])
}


yargs.usage(`$0 <cmd> [args]
 Define the environment Variables:
 RANCHER_ACCESS_KEY
 RANCHER_SECRET_KEY
 RANCHER_URL
 optional: SSL_VERIFY=false`)
yargs.demandCommand(1, 'You need at least one command before moving on')

if (require.main === module) {
  // Provide commandline-cli if started from commandline
  yargs.help().argv
} else {
  // Provide exports if included as dependency
  module.exports = {
    activate,
    deactivate,
    deactivateEnv,
    deleteEnv,
    deleteRequest,
    execute,
    idOf,
    idOfEnv,
    query,
    remove,
    restartService,
    rollback,
    startContainers,
    startService,
    state,
    stopService,
    upgrade
  }
}
