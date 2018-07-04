#!/bin/bash

# The branch may use a custom manifest
MANIFEST=manifest.yml
PREFIX=""
if [ -f ${REPO_BRANCH}-manifest.yml ]; then
  MANIFEST=${REPO_BRANCH}-manifest.yml
  PREFIX=$REPO_BRANCH"-"
fi
echo "Using manifest file: $MANIFEST"
echo "Using prefix: $PREFIX"

# Create CF services
cf create-service conversation free insurance-bot-conversation
cf create-service cloudantNoSQLDB Lite ${PREFIX}insurance-bot-db
cf create-service AppID graduated-tier insurance-bot-appid
# Set app's env vars
domain=".mybluemix.net"
case "${REGION_ID}" in
  ibm:yp:eu-gb)
    domain=".eu-gb.mybluemix.net"
  ;;
  ibm:yp:au-syd)
  domain=".au-syd.mybluemix.net"
  ;;
  ibm:yp:eu-de)
  domain=".eu-de.mybluemix.net"
  ;;
esac
if ! cf app $CF_APP; then
  cf push $CF_APP -n $CF_APP -f $MANIFEST --no-start
  if [ ! -z "$CONVERSATION_WORKSPACE" ]; then
    cf set-env $CF_APP CONVERSATION_WORKSPACE $CONVERSATION_WORKSPACE
  fi
  cf start $CF_APP
else
  OLD_CF_APP=${CF_APP}-OLD-$(date +"%s")
  rollback() {
    set +e
    if cf app $OLD_CF_APP; then
      cf logs $CF_APP --recent
      cf delete $CF_APP -f
      cf rename $OLD_CF_APP $CF_APP
    fi
    exit 1
  }
  set -e
  trap rollback ERR
  cf rename $CF_APP $OLD_CF_APP
  cf push $CF_APP -n $CF_APP -f $MANIFEST --no-start
  if [ ! -z "$CONVERSATION_WORKSPACE" ]; then
    cf set-env $CF_APP CONVERSATION_WORKSPACE $CONVERSATION_WORKSPACE
  fi
  cf start $CF_APP
  cf delete $OLD_CF_APP -f
fi
