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

// matcha()


// CEX order books
ftx = function() {
    config = {
        method: 'get', 
        url: `https://ftx.com/api/markets/${baseCurrency}/${quoteCurrency}/orderbook?depth=20`
    }
    axios(config)
    .then(function (response) {
        orderbook = response.data["result"]
        bids = orderbook["bids"]
        asks = orderbook["asks"]
        console.log(bids)
        console.log(asks)
    })
    .catch(function (error) {
        console.log(console.log(error["response"]["data"]["error"]));
    });
}

kucoin = function() {
    config = {
        method: 'get', 
        url: `https://api.kucoin.com/api/v1/market/orderbook/level2_20?symbol=BTC-USDC`
    }
    axios(config)
    .then(function (response) {
        orderbook = response.data["data"]
        bids = orderbook["bids"]
        asks = orderbook["asks"]
        console.log(bids)
        console.log(asks)
    })
    .catch(function (error) {
        console.log(console.log(error));
    });
}

ftx()
// kucoin()