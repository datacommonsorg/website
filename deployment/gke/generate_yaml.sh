#!/bin/bash

# TODO(shifucun): merge this with ../minikube/generate_yaml.sh

. env.sh

yq merge -a=append ../website.yaml.tmpl ../../mixer/deployment/template/esp.yaml.tmpl > deployment.yaml
yq merge -i -a=append deployment.yaml ../../mixer/deployment/template/mixer.yaml.tmpl

# Pod replicas
yq w -i deployment.yaml spec.replicas $REPLICAS

# Website resource
yq w -i --style=double deployment.yaml spec.template.spec.containers[0].resources.requests.memory $WEBSITE_MEM_REQ
yq w -i --style=double deployment.yaml spec.template.spec.containers[0].resources.requests.cpu $WEBSITE_CPU_REQ
yq w -i --style=double deployment.yaml spec.template.spec.containers[0].resources.limits.memory $WEBSITE_MEM_LIMIT
yq w -i --style=double deployment.yaml spec.template.spec.containers[0].resources.limits.cpu $WEBSITE_CPU_LIMIT

# Website container
yq w -i deployment.yaml spec.template.spec.containers[0].image $WEBSITE_IMAGE
yq w -i deployment.yaml spec.template.spec.containers[0].imagePullPolicy $WEBSITE_PULL_POLICY
yq w -i deployment.yaml spec.template.spec.containers[0].env[1].value "kubernetes"


# Mixer resource
yq w -i --style=double deployment.yaml spec.template.spec.containers[2].resources.requests.memory $MIXER_MEM_REQ
yq w -i --style=double deployment.yaml spec.template.spec.containers[2].resources.requests.cpu $MIXER_CPU_REQ
yq w -i --style=double deployment.yaml spec.template.spec.containers[2].resources.limits.memory $MIXER_MEM_LIMIT
yq w -i --style=double deployment.yaml spec.template.spec.containers[2].resources.limits.cpu $MIXER_CPU_LIMIT

# Mixer container
yq w -i deployment.yaml spec.template.spec.containers[2].image $MIXER_IMAGE
yq w -i deployment.yaml spec.template.spec.containers[2].imagePullPolicy $MIXER_PULL_POLICY

# Mixer argumennts
yq w -i --style=double deployment.yaml spec.template.spec.containers[2].args[1] $BQ_DATASET
yq w -i --style=double deployment.yaml spec.template.spec.containers[2].args[3] $BT_TABLE
yq w -i --style=double deployment.yaml spec.template.spec.containers[2].args[5] $BT_PROJECT
yq w -i --style=double deployment.yaml spec.template.spec.containers[2].args[7] $BT_INSTANCE
yq w -i --style=double deployment.yaml spec.template.spec.containers[2].args[9] $PROJECT_ID
yq w -i --style=double deployment.yaml spec.template.spec.containers[2].args[11] $BRANCH_FOLDER

# ESP service name
yq w -i --style=double deployment.yaml spec.template.spec.containers[1].args[1] $SERVICE_NAME

# ESP resource
yq w -i --style=double deployment.yaml spec.template.spec.containers[1].resources.requests.memory $ESP_MEM_REQ
yq w -i --style=double deployment.yaml spec.template.spec.containers[1].resources.requests.cpu $ESP_CPU_REQ
yq w -i --style=double deployment.yaml spec.template.spec.containers[1].resources.limits.memory $ESP_MEM_LIMIT
yq w -i --style=double deployment.yaml spec.template.spec.containers[1].resources.limits.cpu $ESP_CPU_LIMIT

# ESP service configuration
yq w --style=double ../../mixer/deployment/template/endpoints.yaml.tmpl name $SERVICE_NAME > endpoints.yaml