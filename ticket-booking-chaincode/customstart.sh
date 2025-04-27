#!/bin/bash

set -e  # Stop the script if any command fails

echo "🔻 Bringing down any existing network..."
./network.sh down || true

echo "🧹 Removing any old peer1 containers and volumes if exist..."
docker rm -f peer1.org1.example.com peer1.org2.example.com 2>/dev/null || true
docker volume rm -f docker_peer1.org1.example.com docker_peer1.org2.example.com 2>/dev/null || true

echo "🔼 Starting new network with CA and CouchDB..."
./network.sh up -ca -s couchdb

sleep 2

echo "🛠️ Creating channel ticketchannel..."
./network.sh createChannel -c ticketchannel

sleep 2

echo "📦 Deploying chaincode ticketbooking on default peers..."
./network.sh deployCC -ccn ticketbooking -ccp ../ticket-booking-chaincode -ccl go -c ticketchannel

echo "🔵 Registering additional peer1.org1..."
./organizations/fabric-ca/registerPeer1.sh

echo "🟣 Registering additional peer1.org2..."
./organizations/fabric-ca/registerPeer1Org2.sh

sleep 2

echo "🚀 Bringing up docker container for peer1.org1..."
docker-compose -f compose/docker/docker-compose-peer1org1.yaml up -d

echo "🚀 Bringing up docker container for peer1.org2..."
docker-compose -f compose/docker/docker-compose-peer1org2.yaml up -d

sleep 5

echo "🔌 Joining peer1.org1 to channel ticketchannel..."
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/../config/
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_ADDRESS=localhost:8051
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/ca.crt

peer channel join -b ./channel-artifacts/ticketchannel.block

echo "🔌 Joining peer1.org2 to channel ticketchannel..."
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_ADDRESS=localhost:10051
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls/ca.crt

peer channel join -b ./channel-artifacts/ticketchannel.block

sleep 2

echo "📦 Installing chaincode on peer1.org1..."
export CC_NAME=ticketbooking
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_ADDRESS=localhost:8051
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/ca.crt

peer lifecycle chaincode install ${CC_NAME}.tar.gz

echo "📦 Installing chaincode on peer1.org2..."
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_ADDRESS=localhost:10051
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls/ca.crt

peer lifecycle chaincode install ${CC_NAME}.tar.gz

echo "✅ All steps completed successfully!"
