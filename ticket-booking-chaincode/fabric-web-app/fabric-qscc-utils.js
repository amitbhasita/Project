const { BlockDecoder } = require('fabric-common');

async function qsccContract(gateway) {
  const network = await gateway.getNetwork('ticketchannel'); // ✅ must await
  return network.getContract('qscc');
}

function parseBlockNumber(buffer) {
  const block = BlockDecoder.decode(buffer);
  return block.header.number;
}

module.exports = { qsccContract, parseBlockNumber };
