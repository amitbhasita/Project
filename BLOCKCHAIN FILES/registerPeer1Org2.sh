#!/bin/bash

export PATH=$PATH:${PWD}/../bin
export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/org2.example.com/

echo "🔵 Registering peer1 for Org2..."
fabric-ca-client register --caname ca-org2 --id.name peer1 --id.secret peer1pw --id.type peer --tls.certfiles ${PWD}/organizations/fabric-ca/org2/tls-cert.pem

mkdir -p organizations/peerOrganizations/org2.example.com/peers/peer1.org2.example.com

echo "🔵 Enrolling MSP for peer1.org2.example.com..."
fabric-ca-client enroll -u https://peer1:peer1pw@localhost:8054 --caname ca-org2 -M ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/msp --csr.hosts peer1.org2.example.com --tls.certfiles ${PWD}/organizations/fabric-ca/org2/tls-cert.pem

cp ${PWD}/organizations/peerOrganizations/org2.example.com/msp/config.yaml ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/msp/config.yaml

echo "🔵 Enrolling TLS for peer1.org2.example.com..."
fabric-ca-client enroll -u https://peer1:peer1pw@localhost:8054 --caname ca-org2 -M ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls --enrollment.profile tls --csr.hosts peer1.org2.example.com --csr.hosts localhost --tls.certfiles ${PWD}/organizations/fabric-ca/org2/tls-cert.pem

cp ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls/tlscacerts/* ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls/ca.crt
cp ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls/signcerts/* ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls/server.crt
cp ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls/keystore/* ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls/server.key

echo "✅ Peer1.org2 registration and enrollment done!"
