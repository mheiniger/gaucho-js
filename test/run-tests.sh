#!/usr/bin/env bash


docker run -d --restart=unless-stopped -p 8080:8080 rancher/server

wait-port 8080

#http://0.0.0.0:8080/v2-beta
#http://0.0.0.0:8080/v1
cd test
export RANCHER_URL=http://localhost:8080

if [[ ! -f ./rancher ]]; then
    RANCHER_CLI_VERSION="v0.6.1"
    curl -sL https://github.com/rancher/cli/releases/download/${RANCHER_CLI_VERSION}/rancher-linux-amd64-${RANCHER_CLI_VERSION}.tar.gz | tar -xz && mv rancher-${RANCHER_CLI_VERSION}/rancher ./
fi

./rancher -w --wait-state active up -d

cd ..
#./gaucho.js query #| jq .statusText
./gaucho.js query
serviceId=$(./gaucho.js id_of Test-Service)
./gaucho.js deactivate $serviceId
./gaucho.js activate $serviceId

envId=$(./gaucho.js id_of_env Default)
./gaucho.js deactivateEnv $envId
# ./gaucho.js deleteEnv
# ./gaucho.js deleteRequest
# ./gaucho.js execute
# 
# 
# ./gaucho.js query | grep statusText
# ./gaucho.js remove | grep statusText
# ./gaucho.js restartService | grep statusText
# ./gaucho.js rollback | grep statusText
# ./gaucho.js startContainers | grep statusText
# ./gaucho.js startService | grep statusText
# ./gaucho.js state | grep statusText
# ./gaucho.js stopService | grep statusText
# ./gaucho.js upgrade
