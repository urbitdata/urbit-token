
# UrbitToken

## Setup

`npm install`

## Test

`npm test`

## Analysis

Solium is used for static analysis of Solidity files.

`npm run solium`

eslint is used for linting of JavaScript (tests).

`npm run lint`

## Code coverage

`npm run coverage`

Note: leaves an instance of ganache hanging: `killall node` will stop it so you can run the coverage task again.

Configured for coveralls.io; requires setup in the GitHub organization and repository.

## Continuous Integration

Configured for travisci.org; requires setup in the GitHub organization and repository.
