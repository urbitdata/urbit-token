const fs = require('fs');
const solc = require('solc');
const Web3 = require('web3');

const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const args = process.argv.slice(2);

if (args.length != 2) {
  console.log('Usage: nodejs prepare.js admin_eth sales_eth '); // eslint-disable-line no-console
  process.exit(1);
}

for (let i = 0; i < args.length; i += 1) {
  if (!web3.utils.isAddress(args[i])) {
    console.log(`Invalid address: ${args[i]}`); // eslint-disable-line no-console
    process.exit(1);
  }
}
const code = fs.readFileSync('build/merged/UrbitToken.sol', 'utf8');
const output = solc.compile(code, 1);

console.log(`Using solc ${solc.version()}, optimization on.`); // eslint-disable-line no-console

const token = output.contracts[':UrbitToken'];
const factory = new web3.eth.Contract(JSON.parse(token.interface));

const byteCode = factory.deploy({ data: token.runtimeBytecode, arguments: args }).encodeABI();
const params = byteCode.substr(token.runtimeBytecode.length, byteCode.length - token.runtimeBytecode.length);
fs.writeFileSync('bytecode.txt', byteCode);
fs.writeFileSync('arguments.txt', params);
console.log('Files created: bytecode.txt and arguments.txt.'); // eslint-disable-line no-console
