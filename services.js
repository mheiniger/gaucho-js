import * as baker from 'baker'
import * as json from 'json'
import * as requests from 'requests'
import * as sys from 'sys'
import * as time from 'time'
import * as websocket from 'websocket'
import * as base64 from 'base64'

let HOST, PASSWORD, USERNAME, kwargs
function _pjSnippets (container) {
  function inES6 (left, right) {
    if (((right instanceof Array) || ((typeof right) === 'string'))) {
      return (right.indexOf(left) > (-1))
    } else if (((right instanceof Map) || (right instanceof Set) || (right instanceof WeakMap) || (right instanceof WeakSet))) {
      return right.has(left)
    } else {
      return (left in right)
    }
  }
  container['inES6'] = inES6
  return container
}
const _pj = {}
_pjSnippets(_pj)
HOST = 'http://rancher.local:8080/v1'
const URL_SERVICE = '/services/'
const URL_ENVIRONMENT = '/projects/'
USERNAME = 'userid'
PASSWORD = 'password'
kwargs = {}
// HTTP
function getRequest (url) {
  const r = requests.get(url, {'auth': [USERNAME, PASSWORD]})
  r.raise_for_status()
  return r
}
function postRequest (url, data = '') {
  let r
  if (data) {
    r = requests.post(url, {'data': json.dumps(data), 'auth': [USERNAME, PASSWORD]})
  } else {
    r = requests.post(url, {'data': '', 'auth': [USERNAME, PASSWORD]})
  }
  r.raise_for_status()
  return r.json()
}
function deleteRequest (url, data = '') {
  let r
  if (data) {
    r = requests.delete(url, {'data': json.dumps(data), 'auth': [USERNAME, PASSWORD]})
  } else {
    r = requests.delete(url, {'data': '', 'auth': [USERNAME, PASSWORD]})
  }
  r.raise_for_status()
  return r.json()
}

// Websocket
function ws (url) {
  const webS = websocket.create_connection(url)
  const resp = base64.b64decode(webS.recv())
  webS.close()
  return resp
}

// Helper
function printJson (data) {
  console.log(json.dumps(data, {'sort_keys': true, 'indent': 3, 'separators': [',', ': ']}))
}

//
// Query the service configuration.
//
// @baker.command(default=True, params={"service_id": "The ID of the service to read (optional)"})
function query (service_id = '') {
  /* Retrieves the service information.

    If you don't specify an ID, data for all services
    will be retrieved.
    */
  const r = getRequest(((HOST + URL_SERVICE) + service_id))
  printJson(r.json())
}

//
// Converts a service name into an ID
//
// @baker.command(params={
//                         "name": "The name of the service to lookup.",
//                         "newest": "From list of IDs, return newest (optional)"})
function id_of (name = '', newest = false) {
  /* Retrieves the ID of a service, given its name.
    */
  let index
  if (newest) {
    index = (-1)
  } else {
    index = 0
  }
  const service = getRequest((`${HOST}/services?name=${name}`)).json()
  return service['data'][index]['id']
}

//
// Converts a environment name into an ID
//
// @baker.command(params={"name": "The name of the environment to lookup."})
function id_of_env (name = '') {
  /* Retrieves the ID of a project, given its name.
    */
  const environment = getRequest((`${HOST}/project?name=${name}`)).json()
  return environment['data'][0]['id']
}

//
// Start containers within a service (e.g. for Start Once containers).
//
// @baker.command(params={"service_id": "The ID of the service to start the containers of."})
function start_containers (service_id) {
  /* Starts the containers of a given service, typically a Start Once service.
    */
  start_service(service_id)
}

//
// Start containers within a service (e.g. for Start Once containers).
//
// @baker.command(params={"service_id": "The ID of the service to start the containers of."})
function start_service (service_id) {
  /* Starts the containers of a given service, typically a Start Once service.
    */
  let containers, startUrl
  containers = getRequest((`${(HOST + URL_SERVICE) + service_id}/instances`)).json()['data']
  for (var container, _pj_c = 0, _pj_a = containers, _pj_b = _pj_a.length; (_pj_c < _pj_b); _pj_c += 1) {
    container = _pj_a[_pj_c]
    startUrl = container['actions']['start']
    console.log(('Starting container %s with url %s' % [container['name'], startUrl]))
    postRequest(startUrl, '')
  }
}

//
// Stop containers within a service.
//
// @baker.command(params={"service_id": "The ID of the service to stop the containers of."})
function stop_service (service_id) {
  /* Stop the containers of a given service.
    */
  let containers, stopUrl
  containers = getRequest((`${(HOST + URL_SERVICE) + service_id}/instances`)).json()['data']
  for (var container, _pj_c = 0, _pj_a = containers, _pj_b = _pj_a.length; (_pj_c < _pj_b); _pj_c += 1) {
    container = _pj_a[_pj_c]
    stopUrl = container['actions']['stop']
    console.log(('Stopping container %s with url %s' % [container['name'], stopUrl]))
    postRequest(stopUrl, '')
  }
}


//
// Restart containers within a service
//
// @baker.command(params={"service_id": "The ID of the service to restart the containers of."})
function restart_service (service_id) {
  /* Restart the containers of a given service.
    */
  let containers, restartUrl
  containers = getRequest((`${(HOST + URL_SERVICE) + service_id}/instances`)).json()['data']
  for (var container, _pj_c = 0, _pj_a = containers, _pj_b = _pj_a.length; (_pj_c < _pj_b); _pj_c += 1) {
    container = _pj_a[_pj_c]
    restartUrl = container['actions']['restart']
    console.log((`Restarting container: ${container['name']}`))
    postRequest(restartUrl)
  }
}

//
// Upgrades the service.
//
// @baker.command(params={
//                         "service_id": "The ID of the service to upgrade.",
//                         "start_first": "Whether or not to start the new instance first before stopping the old one.",
//                         "complete_previous": "If set and the service was previously upgraded but the upgrade wasn't completed, it will be first marked as Finished and then the upgrade will occur.",
//                         "imageUuid": "If set the config will be overwritten to use new image. Don't forget Rancher Formatting 'docker:<Imagename>:tag'",
//                         "auto_complete": "Set this to automatically 'finish upgrade' once upgrade is complete",
//                         "replace_env_name": "The name of an environment variable to be changed in the launch config (requires replace_env_value).",
//                         "replace_env_value": "The value of the environment variable to be replaced (requires replace_env_name).",
//                         "timeout": "How many seconds to wait until an upgrade fails"
//                        })
function upgrade (service_id, start_first = true, complete_previous = false, imageUuid = null, auto_complete = false, batch_size = 1, interval_millis = 10000, replace_env_name = null, replace_env_value = null, timeout = 60) {
  /* Upgrades a service

    Performs a service upgrade, keeping the same configuration, but otherwise
    pulling new image as needed and starting new containers, dropping the old
    ones.
    */
  let current_service_config, r, sleep_count, upgrade_strategy, upgraded_sleep_count
  upgrade_strategy = json.loads('{"inServiceStrategy": {"batchSize": 1,"intervalMillis": 10000,"startFirst": true,"launchConfig": {},"secondaryLaunchConfigs": []}}')
  upgrade_strategy['inServiceStrategy']['batchSize'] = batch_size
  upgrade_strategy['inServiceStrategy']['intervalMillis'] = interval_millis
  if (start_first) {
    upgrade_strategy['inServiceStrategy']['startFirst'] = 'true'
  } else {
    upgrade_strategy['inServiceStrategy']['startFirst'] = 'false'
  }
  r = getRequest(((HOST + URL_SERVICE) + service_id))
  current_service_config = r.json()
  if ((complete_previous && (current_service_config['state'] === 'upgraded'))) {
    console.log("Previous service upgrade wasn't completed, completing it now...")
    postRequest((`${(HOST + URL_SERVICE) + service_id}?action=finishupgrade`), '')
    r = getRequest(((HOST + URL_SERVICE) + service_id))
    current_service_config = r.json()
    sleep_count = 0
    while (((current_service_config['state'] !== 'active') && (sleep_count < (timeout / 2)))) {
      console.log('Waiting for upgrade to finish...')
      time.sleep(2)
      r = getRequest(((HOST + URL_SERVICE) + service_id))
      current_service_config = r.json()
      sleep_count += 1
    }
  }
  if ((current_service_config['state'] !== 'active')) {
    console.log(('Service cannot be updated due to its current state: %s' % current_service_config['state']))
    sys.exit(1)
  }
  upgrade_strategy['inServiceStrategy']['launchConfig'] = current_service_config['launchConfig']
  if (((replace_env_name !== null) && (replace_env_value !== null))) {
    console.log(('Replacing environment variable %s from %s to %s' % [replace_env_name, upgrade_strategy['inServiceStrategy']['launchConfig']['environment'][replace_env_name], replace_env_value]))
    upgrade_strategy['inServiceStrategy']['launchConfig']['environment'][replace_env_name] = replace_env_value
  }
  if ((imageUuid !== null)) {
    upgrade_strategy['inServiceStrategy']['launchConfig']['imageUuid'] = imageUuid
    console.log(('New Image: %s' % upgrade_strategy['inServiceStrategy']['launchConfig']['imageUuid']))
  }
  postRequest(current_service_config['actions']['upgrade'], upgrade_strategy)
  console.log(('Upgrade of %s service started!' % current_service_config['name']))
  r = getRequest(((HOST + URL_SERVICE) + service_id))
  current_service_config = r.json()
  console.log(("Service State '%s.'" % current_service_config['state']))
  console.log('Waiting for upgrade to finish...')
  sleep_count = 0
  while (((current_service_config['state'] !== 'upgraded') && (sleep_count < (timeout / 2)))) {
    console.log('.')
    time.sleep(2)
    r = getRequest(((HOST + URL_SERVICE) + service_id))
    current_service_config = r.json()
    sleep_count += 1
  }
  if ((sleep_count >= (timeout / 2))) {
    console.log('Upgrading take to much time! Check Rancher UI for more details.')
    sys.exit(1)
  } else {
    console.log('Upgraded')
  }
  if ((auto_complete && (current_service_config['state'] === 'upgraded'))) {
    postRequest((`${(HOST + URL_SERVICE) + service_id}?action=finishupgrade`), '')
    r = getRequest(((HOST + URL_SERVICE) + service_id))
    current_service_config = r.json()
    console.log('Auto Finishing Upgrade...')
    upgraded_sleep_count = 0
    while (((current_service_config['state'] !== 'active') && (upgraded_sleep_count < (timeout / 2)))) {
      console.log('.')
      time.sleep(2)
      r = getRequest(((HOST + URL_SERVICE) + service_id))
      current_service_config = r.json()
      upgraded_sleep_count += 1
    }
    if ((current_service_config['state'] === 'active')) {
      console.log('DONE')
    } else {
      console.log('Something has gone wrong!  Check Rancher UI for more details.')
      sys.exit(1)
    }
  }
}

//
// Execute remote command on container.
//
// @baker.command(params={
//                         "service_id": "The ID of the service to execute on",
//                         "command": "The command to execute"
//                       })
function execute (service_id, command) {
  /* Execute remote command

    Executes a command on one container of the service you specified.
    */
  let containers, execution_url, intermediate, payload, ws_token, ws_url
  containers = getRequest((`${(HOST + URL_SERVICE) + service_id}/instances`)).json()['data']
  if ((containers.length <= 0)) {
    console.log('No container available')
    sys.exit(1)
  }
  execution_url = containers[0]['actions']['execute']
  console.log(("Executing '%s' on container '%s'" % [command, containers[0]['name']]))
  payload = json.loads('{"attachStdin": true,"attachStdout": true,"command": ["/bin/sh","-c"],"tty": true}')
  payload['command'].append(command)
  intermediate = postRequest(execution_url, payload)
  ws_token = intermediate['token']
  ws_url = (`${intermediate['url']}?token=${ws_token}`)
  console.log(('> \n%s' % ws(ws_url)))
  console.log('DONE')
}

//
// Rollback the service.
//
// @baker.command(params={
//                         "service_id": "The ID of the service to rollback.",
//                         "timeout": "How many seconds to wait until an rollback fails"
//                        })
function rollback (service_id, timeout = 60) {
  /* Performs a service rollback
    */
  let current_service_config, r, sleep_count
  r = getRequest(((HOST + URL_SERVICE) + service_id))
  current_service_config = r.json()
  if ((current_service_config['state'] !== 'upgraded')) {
    console.log(('Service cannot be updated due to its current state: %s' % current_service_config['state']))
    sys.exit(1)
  }
  postRequest(current_service_config['actions']['rollback'], '')
  console.log(('Rollback of %s service started!' % current_service_config['name']))
  r = getRequest(((HOST + URL_SERVICE) + service_id))
  current_service_config = r.json()
  console.log(("Service State '%s.'" % current_service_config['state']))
  console.log('Waiting for rollback to finish...')
  sleep_count = 0
  while (((current_service_config['state'] !== 'active') && (sleep_count < (timeout / 2)))) {
    console.log('.')
    time.sleep(2)
    r = getRequest(((HOST + URL_SERVICE) + service_id))
    current_service_config = r.json()
    sleep_count += 1
  }
  if ((sleep_count >= (timeout / 2))) {
    console.log('Rolling back take to much time! Check Rancher UI for more details.')
    sys.exit(1)
  } else {
    console.log('Rolled back')
  }
}


//
// Activate a service.
//
// @baker.command(params={"service_id": "The ID of the service to activate.",
//                        "timeout": "How many seconds to wait until an upgrade fails"})
function activate (service_id, timeout = 60) {
  /* Activate the containers of a given service.
    */
  let current_service_config, r, sleep_count
  r = getRequest(((HOST + URL_SERVICE) + service_id))
  current_service_config = r.json()
  if ((current_service_config['state'] !== 'inactive')) {
    console.log(('Service cannot be deactivated due to its current state: %s' % current_service_config['state']))
    sys.exit(1)
  }
  postRequest(current_service_config['actions']['activate'], '')
  sleep_count = 0
  while (((current_service_config['state'] !== 'active') && (sleep_count < (timeout / 2)))) {
    console.log('Waiting for activation to finish...')
    time.sleep(2)
    r = getRequest(((HOST + URL_SERVICE) + service_id))
    current_service_config = r.json()
    sleep_count += 1
  }
}

//
// Deactivate a service.
//
// @baker.command(params={"service_id": "The ID of the service to deactivate.",
//                        "timeout": "How many seconds to wait until an upgrade fails"})
function deactivate (service_id, timeout = 60) {
  /* Stops the containers of a given service. (e.g. for maintenance purposes)
    */
  let current_service_config, r, sleep_count
  r = getRequest(((HOST + URL_SERVICE) + service_id))
  current_service_config = r.json()
  if (((current_service_config['state'] !== 'active') && (current_service_config['state'] !== 'updating-active'))) {
    console.log(('Service cannot be deactivated due to its current state: %s' % current_service_config['state']))
    sys.exit(1)
  }
  postRequest(current_service_config['actions']['deactivate'], '')
  sleep_count = 0
  while (((current_service_config['state'] !== 'inactive') && (sleep_count < (timeout / 2)))) {
    console.log('Waiting for deactivation to finish...')
    time.sleep(2)
    r = getRequest(((HOST + URL_SERVICE) + service_id))
    current_service_config = r.json()
    sleep_count += 1
  }
}

//
// Deactivate a env.
//
// @baker.command(params={"environment_id": "The ID of the environment to deactivate.",
//                        "timeout": "How many seconds to wait until an upgrade fails"})
function deactivate_env (environment_id, timeout = 60) {
  /* Stops the environment
    */
  let current_environment_config, r, sleep_count
  r = getRequest(((HOST + URL_ENVIRONMENT) + environment_id))
  current_environment_config = r.json()
  if ((current_environment_config['state'] !== 'active')) {
    console.log(('Environment cannot be deactivated due to its current state: %s' % current_environment_config['state']))
    sys.exit(1)
  }
  postRequest(current_environment_config['actions']['deactivate'], '')
  sleep_count = 0
  while (((current_environment_config['state'] !== 'inactive') && (sleep_count < (timeout / 2)))) {
    console.log('Waiting for deactivation to finish...')
    time.sleep(2)
    r = getRequest(((HOST + URL_ENVIRONMENT) + environment_id))
    current_environment_config = r.json()
    sleep_count += 1
  }
}

//
// Delete a env.
//
// @baker.command(params={"environment_id": "The ID of the environment to delete.",
//                        "timeout": "How many seconds to wait until an upgrade fails"})
function delete_env (environment_id, timeout = 60) {
  /* Stops the environment
    */
  let current_environment_config, r, sleep_count
  r = getRequest(((HOST + URL_ENVIRONMENT) + environment_id))
  current_environment_config = r.json()
  if ((current_environment_config['state'] !== 'inactive')) {
    console.log(('Environment cannot be deactivated due to its current state: %s' % current_environment_config['state']))
    sys.exit(1)
  }
  deleteRequest(current_environment_config['actions']['delete'], '')
  sleep_count = 0
  while (((current_environment_config['state'] !== 'removed') && (sleep_count < (timeout / 2)))) {
    console.log('Waiting for delete to finish...')
    time.sleep(2)
    r = getRequest(((HOST + URL_ENVIRONMENT) + environment_id))
    current_environment_config = r.json()
    sleep_count += 1
  }
}

//
// Remove a service.
//
// @baker.command(params={"service_id": "The ID of the service to remove.",
//                        "timeout": "How many seconds to wait until an upgrade fails"})
function remove (service_id, timeout = 60) {
  /* Remove the service
    */
  let current_service_config, r, sleep_count
  r = getRequest(((HOST + URL_SERVICE) + service_id))
  current_service_config = r.json()
  if ((current_service_config['state'] !== 'inactive')) {
    console.log(('Service cannot be removed due to its current state: %s' % current_service_config['state']))
    sys.exit(1)
  }
  postRequest(current_service_config['actions']['remove'], '')
  sleep_count = 0
  while (((current_service_config['state'] !== 'removed') && (sleep_count < (timeout / 2)))) {
    console.log('Waiting for remove to finish...')
    time.sleep(2)
    r = getRequest(((HOST + URL_SERVICE) + service_id))
    current_service_config = r.json()
    sleep_count += 1
  }
}

//
// Get a service state
//
// @baker.command(default=True, params={"service_id": "The ID of the service to read"})
function state (service_id = '') {
  /* Retrieves the service state information.
    */
  let r
  r = getRequest(((HOST + URL_SERVICE) + service_id))
  console.log(r.json()['state'])
}

//
// Script's entry point, starts Baker to execute the commands.
// Attempts to read environment variables to configure the program.
//
if (_pj.inES6('CATTLE_ACCESS_KEY', process.env)) {
  USERNAME = process.env['CATTLE_ACCESS_KEY']
}
if (_pj.inES6('CATTLE_SECRET_KEY', process.env)) {
  PASSWORD = process.env['CATTLE_SECRET_KEY']
}
if (_pj.inES6('CATTLE_URL', process.env)) {
  HOST = process.env['CATTLE_URL']
}
if (_pj.inES6('RANCHER_ACCESS_KEY', process.env)) {
  USERNAME = process.env['RANCHER_ACCESS_KEY']
}
if (_pj.inES6('RANCHER_SECRET_KEY', process.env)) {
  PASSWORD = process.env['RANCHER_SECRET_KEY']
}
if (_pj.inES6('RANCHER_URL', process.env)) {
  HOST = process.env['RANCHER_URL']
}
if (_pj.inES6('SSL_VERIFY', process.env)) {
  if ((process.env['SSL_VERIFY'].lower() === 'false')) {
    kwargs['verify'] = false
  } else {
    kwargs['verify'] = process.env['SSL_VERIFY']
  }
}
if ((!_pj.inES6('/v1', HOST))) {
  HOST = (`${HOST}/v1`)
}
baker.run()

// # sourceMappingURL=services.js.map
