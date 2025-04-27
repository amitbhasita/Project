# Project
Blockchain project


Follow Below Instructions to setup the ticket booking blockchain project on your system.
Expected major installations docker, docker-compose, go-lang, node js, npm, mongodb


1) Pull the hyperledger fabric in your system. Now you will see fabric-samples folder under fabric folder.
    we will majorly use 2 folders for setup. first is test-network that is present under fabric samples & ticket-chaincode-booking folder(this is provided in repo).
2) Copy the ticket-chaincode-booking under fabric-samples.
3) Copy the customstart & stopNetwork.sh( provided in BLOCKCHAIN FILES in repo ) under test-network.
4) Copy the registerPeer1.sh & registerPeer1Org2.sh ( provided in BLOCKCHAIN FILES in repo ) under test-network/organizations/fabric-ca folder
5) Copy both the docker compose yaml ( provided in BLOCKCHAIN FILES in repo ) file under test-network/compose/docker folder

6) In ticket-chaincode-booking/fabric-web-app run npm install to install dependencies
7) In ticket-chaincode-booking run go build & go mod tidy
8) In terminal, start the mongod service by sudo systemctl start mongod.service
9) In test-network, run the customstart.sh to boot up blockchain
10) Once success message, go to fabric-web-app folder & start node server.js
11) you are good to browse localhost:3000
12) Default admin id is admin@blockchain.com & pass is admin123
13) To stop server , press ctrl + c in node terminal, sudo systemctl stop mongod.service. In the test-network, run the stopNetwork.sh
14) We had tunned the project to web.rocketbooking.com
 