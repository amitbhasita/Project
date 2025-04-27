#!/bin/bash

echo "🛑 Bringing down existing network..."
./network.sh down

echo "🧹 Cleaning up old peer containers and volumes..."
docker rm -f peer1.org1.example.com peer1.org2.example.com 2>/dev/null || true
docker volume rm -f docker_peer1.org1.example.com docker_peer1.org2.example.com 2>/dev/null || true


echo "⏳ Waiting 5 seconds for network to stabilize..."
sleep 5

echo "🚀 Step 1: Bringing up network only..."
./network.sh up -ca -s couchdb

echo "⏳ Waiting 10 seconds for network to stabilize..."
sleep 10

echo "🛠 Step 2: Creating channel..."
./network.sh createChannel -c ticketchannel


echo "⏳ Waiting 10 seconds for network to stabilize..."
sleep 10

echo "📦 Deploying chaincode (ticketbooking) on default peers..."
./network.sh deployCC -ccn ticketbooking -ccp ../ticket-booking-chaincode -ccl go -c ticketchannel

echo "⏳ Waiting 10 seconds for network to stabilize..."
sleep 10

export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/../config/
chmod +x organizations/fabric-ca/registerPeer1.sh
chmod +x organizations/fabric-ca/registerPeer1Org2.sh
echo "🔵 Registering peer1.org1..."
cd organizations/fabric-ca
./registerPeer1.sh
cd ../../

echo "🟣 Registering peer1.org2..."
cd organizations/fabric-ca
./registerPeer1Org2.sh
cd ../../

echo "🟦 Bringing up peer1.org1 docker container..."
docker-compose -f compose/docker/docker-compose-peer1org1.yaml up -d

echo "🟪 Bringing up peer1.org2 docker container..."
docker-compose -f compose/docker/docker-compose-peer1org2.yaml up -d

echo "⏳ Waiting 10 seconds for network to stabilize..."
sleep 10

echo "🔌 Joining peer1.org1 to ticketchannel..."
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/../config/

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_ADDRESS=localhost:8051
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/ca.crt
peer channel join -b ./channel-artifacts/ticketchannel.block

echo "🔌 Joining peer1.org2 to ticketchannel..."
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_ADDRESS=localhost:10051
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls/ca.crt
peer channel join -b ./channel-artifacts/ticketchannel.block

echo "⏳ Waiting 10 seconds for network to stabilize..."
sleep 10

echo "📦 Installing chaincode on peer1.org1..."
export CC_NAME=ticketbooking
peer lifecycle chaincode install ${CC_NAME}.tar.gz

echo "⏳ Waiting 10 seconds for network to stabilize..."
sleep 10

echo "📦 Installing chaincode on peer1.org2..."
export CORE_PEER_ADDRESS=localhost:10051
peer lifecycle chaincode install ${CC_NAME}.tar.gz

echo "✅ Network setup complete!"
