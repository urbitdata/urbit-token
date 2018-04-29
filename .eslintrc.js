module.exports = {
    "extends": "airbnb-base",
    "globals" : {
        "artifacts": false,
        "contract": false,
        "assert": false,
        "web3": false
    },
    "rules": {
        "max-len": ["error", { "code": 150 }]
    }
};
