#!/usr/bin/env bash


docker run -d --restart=unless-stopped -p 8080:8080 rancher/server

./gaucho.js wait_for_rancher

cd test
export RANCHER_URL=http://localhost:8080

if [[ ! -f ./rancher ]]; then
    RANCHER_CLI_VERSION="v0.6.1"
    curl -sL https://github.com/rancher/cli/releases/download/${RANCHER_CLI_VERSION}/rancher-linux-amd64-${RANCHER_CLI_VERSION}.tar.gz | tar -xz && mv rancher-${RANCHER_CLI_VERSION}/rancher ./
fi

./rancher -w --wait-state active up -d

cd ..

serviceId=$(./gaucho.js id_of Test-Service)
./gaucho.js query $serviceId
./gaucho.js deactivate $serviceId
./gaucho.js activate $serviceId

# ./gaucho.js execute
# ./gaucho.js remove
# ./gaucho.js restart_service
# ./gaucho.js rollback
# ./gaucho.js start_containers
# ./gaucho.js start_service
# ./gaucho.js state
# ./gaucho.js stop_service
# ./gaucho.js upgrade

envId=$(./gaucho.js id_of_env Default)
./gaucho.js deactivate_env $envId
# ./gaucho.js deleteEnv
