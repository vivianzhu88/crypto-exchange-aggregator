var axios = require('axios');

class Cex {
    // Constructor function
    constructor(baseUrl) {
        this.baseUrl = baseUrl
    }

    // Methods created on Cex.prototype
    getOrderBook = function() {
        var config = {
            method: 'get',
            url: this.baseUrl
        }
        axios(config)
        .then(function (response) {
            console.log(JSON.stringify(response.data));
        })
        .catch(function (error) {
            console.log(error);
        });
    }
}

// Initialize 
const ftx = new Cex('https://ftx.com/api/markets/BTC/USDT/orderbook?depth=20')
const kucoin = new Cex('https://api.kucoin.com/api/v1/market/orderbook/level2_20?symbol=BTC-USDT')

ftx.getOrderBook()
kucoin.getOrderBook()