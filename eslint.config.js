const standard = require('eslint-config-standard')

module.exports = [
    standard,
    {
      "parserOptions": {
        "ecmaVersion": 6,
        "sourceType": "module",
        "ecmaFeatures": {
          "jsx": true
        }
      }
    }
] 