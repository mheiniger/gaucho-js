Gaucho
===========================================

Gaucho is simply some Python scripts to access the
[Rancher](https://github.com/rancher/rancher)'s API to perform tasks which
I need to have executed through my deployment workflow.

At this point, it does not contain much but it might grow as I get more
requirements.

Contributions are welcome if you want to use it and add to it.

## Usage

Gaucho can be run directly on a command line provided you have Python installed
as well as the dependencies listed below.

It can also be run as a Docker container:

```
docker run --rm -it etlweather/gaucho query 1s245
```

### Rancher Host, Access Key and Secret

Gaucho needs to know the Rancher host and must be given an access key and access
secret to be able to interact with the Rancher's API. This can be done through
environment variables:

   - `CATTLE_ACCESS_KEY`
   - `CATTLE_SECRET_KEY`
   - `CATTLE_URL`

#### SSL Validation

If you want to turn off SSL validation because you are using a self-signed certificate
or a private CA-signed certificate, you can pass the environment variable:

    - `SSL_VERIFY=false`

You can also mount the SSL certificate chain into the container, and pass the path to the
certificate as an environment variable:

   - `-v /path/to/ca_chain.crt:/root/ca.crt`
   - `-e SSL_VERIFY=/root/ca.crt`

#### Rancher Agent Container

If you run Gaucho in a container on Rancher, rather than set the environment
variables manually, use the following labels to have Rancher automatically do it
for you.

```
io.rancher.container.create_agent=true
io.rancher.container.agent.role=environment
```

See [Service Accounts in Rancher](http://docs.rancher.com/rancher/latest/en/rancher-services/service-accounts/)
for more information on this feature.

## Supported API

### query

```
Usage: ./services.py query [<service_id>]

Retrieves the service information.

    If you don't specify an ID, data for all services will be retrieved.

Options:

   --service_id  The ID of the service to read (optional)
```

### id_of

Retrieves the ID of a service given its name.

```
 $ ./services.py id_of cassandra
1s130
 $
```

### id_of_env

```
Usage: ./gaucho id_of_env <environment_name>

Retrieves the ID of a environment given its name.

Required Arguments:

  environment_name   The name of the environment
```

### start_service

```
Usage: ./gaucho start_service <service_id>

Starts the containers of a given service, typically a Start Once service.

Required Arguments:

  service_id   The ID of the service to start the containers of.
```

### stop_service

```
Usage: ./gaucho stop_service <service_id>

Stop the containers of a given service.

Required Arguments:

  service_id   The ID of the service to stop the containers of.
```

### restart_service

```
Usage: ./gaucho restart_service <service_id>

Restart the containers of a given service.

Required Arguments:

  service_id   The ID of the service to restart the containers of.
```

### upgrade

```
Usage: ./services.py upgrade <service_id> [<start_first>] [<complete_previous>] [<imageUuid>] [<auto_complete>] [<batch_size>] [<interval_millis>] [<replace_env_name>] [<replace_env_value>]

Upgrades a service

    Performs a service upgrade, keeping the same configuration, but
    otherwise pulling new image as needed and starting new containers,
    dropping the old ones.

Required Arguments:

  service_id   The ID of the service to upgrade.

Options:

   --start_first        Whether or not to start the new instance first before
                        stopping the old one.
   --complete_previous  If set and the service was previously upgraded but the
                        upgrade wasn't completed, it will be first marked as
                        Finished and then the upgrade will occur.
   --imageUuid          If set the config will be overwritten to use new
                        image. Don't forget Rancher Formatting
                        'docker:<Imagename>:tag'
   --auto_complete      Set this to automatically 'finish upgrade' once
                        upgrade is complete
   --batch_size
   --interval_millis
   --replace_env_name   The name of an environment variable to be changed in
                        the launch config (requires replace_env_value).
   --replace_env_value  The value of the environment variable to be replaced
                        (requires replace_env_name).
   --timeout            How many seconds to wait until an upgrade fails
```

### rollback

```
Usage: ./services.py rollback <service_id>

Rolls back service

    Performs a service rollback

Required Arguments:

  service_id   The ID of the service to roll back.

Options:

   --timeout            How many seconds to wait until an upgrade fails
```

### execute command

```
Usage: ./gaucho execute <service_id> <command>

Runs the given *command* on the first container found for the given *service id*.

Required Arguments:

  service_id   The ID of the service to perform the command on.
  command      shell command to execute
```

### activate command

```
Usage: ./gaucho activate <service_id>

Activate the given *service id*.

Required Arguments:

  service_id   The ID of the service to perform the command on.

Options:

   --timeout            How many seconds to wait until get back prompt on activation
```

### deactivate command

```
Usage: ./gaucho deactivate <service_id>

Deactivate the given *service id*.

Required Arguments:

  service_id   The ID of the service to perform the command on.

Options:

   --timeout            How many seconds to wait until get back prompt on deactivation
```

### remove command

```
Usage: ./gaucho remove <service_id>

Remove the given *service id*.

Required Arguments:

  service_id   The ID of the service to perform the command on.

Options:

   --timeout            How many seconds to wait until get back prompt on remove
```

### deactivate environment command

```
Usage: ./gaucho deactivate_env <environment_id>

Deactivate the given *environment id*.

Required Arguments:

  environment_id   The ID of the environment to perform the command on.

Options:

   --timeout            How many seconds to wait until get back prompt on deactivation
```

### remove environment command

```
Usage: ./gaucho remove_env <environment_id>

Remove the given *environment id*.

Required Arguments:

  environment_id   The ID of the environment to perform the command on.

Options:

   --timeout            How many seconds to wait until get back prompt on remove
```

### Get service's state

```
Usage: ./gaucho state <service_id>

Print state of the given *service id*.

Required Arguments:

  service_id   The ID of the service to check.
```


## Dependencies

 - requests==2.18.4 
 - baker==1.3 
 - websocket-client==0.44.0

