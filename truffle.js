module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  solc: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
  networks: {
    // for ganache-gui
    ganache: {
      host: 'localhost',
      port: 7545,
      network_id: '5777',
    },
    kovan: {
      gas: 4700000,
      host: 'localhost',
      network_id: '42',
      port: 8545,
    },
    localhost: {
      host: 'localhost',
      port: 8546,
      network_id: '*',
    },
    rinkeby: {
      host: 'localhost',
      port: 8545,
      network_id: '4',
      gas: 6700000,
    },
    ropsten: {
      host: 'localhost',
      port: 8545,
      gas: 4612388,
      network_id: '3',
    },
  },
};
