var axios = require('axios');

// user variables
// hard-coded for now
baseCurrency = 'DAI'
quoteCurrency = 'USDT' // default
buy = true
quantity = 10000

matcha = function() {
    config = {
        method: 'get',
        url: `https://api.0x.org/swap/v1/price?buyToken=${baseCurrency}&sellToken=${quoteCurrency}&sellAmount=${quantity}`
    }
    axios(config)
    .then(function (response) {
        console.log(response.data["price"])
        // "estimatedPriceImpact"
        // "value"
        // "gasPrice"
        // "gas"
        // "estimatedGas"
        // "protocolFee"
        // "minimumProtocolFee"
        // console.log(price)
    })
    .catch(function (error) {
        console.log(error);
    });
}

matcha()

class Cex {
    // Constructor function
    constructor(baseUrl) {
        this.baseUrl = baseUrl
        this.config = {
            method: 'get',
            url: this.baseUrl
        }
    }

    // Methods created on Cex.prototype
    getOrderBook = function() {
        axios(this.config)
        .then(function (response) {
            console.log(JSON.stringify(response.data));
        })
        .catch(function (error) {
            console.log(error);
        });
    }
}

// Initialize
const ftx = new Cex('https://ftx.com/api/markets/BTC/USDC/orderbook?depth=20')
ftx.getOrderBook = function() {
    axios(config)
    .then(function (response) {
        console.log(JSON.stringify(response.data));
    })
    .catch(function (error) {
        console.log(console.log(error["response"]["data"]["error"]));
    });
}

const kucoin = new Cex('https://api.kucoin.com/api/v1/market/orderbook/level2_20?symbol=BTC-USDC')

// ftx.getOrderBook()
// kucoin.getOrderBook()