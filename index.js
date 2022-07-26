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
        console.log(error["response"]["data"]["error"]);
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
        console.log(error);
    });
}

kraken = function() {
    config = {
        method: 'get',
        url: `https://api.kraken.com/0/public/Depth?pair=XBTUSD&count=5`
    }
    axios(config)
    .then(function (response) {
        orderbook = response.data["result"]["XXBTZUSD"]

        // for every bid/ask, filter out the timestamp (third element)
        function reformat(key, value) {
            if (key == 2 && typeof(value) == "number")
                return; // now null
            return value; 
        }
        bids = JSON.parse(JSON.stringify(orderbook["bids"], reformat))
        asks = JSON.parse(JSON.stringify(orderbook["asks"], reformat))
        Object.keys(bids).forEach((k) => bids[k][2] == null && bids[k].splice(2));

        console.log(bids)
        console.log(asks)
    })
    .catch(function (error) {
        console.log()
    })
}

async function gemini() {
    // config = {
    //     method: 'get',
    //     url: `https://api.gemini.com/v1/book/btcusd`
    // }
    // axios(config)
    // .then(function (response) {
    //     orderbook = response.data

    //     // og format: { price: '20838.99', amount: '0.26479', timestamp: '1658861155' }

    //     function reformat(obj) {
    //         for (const [key, value] of Object.entries(obj)) {
    //             delete value["timestamp"]
    //             obj[key] = Object.values(value)
    //         }
    //         return obj
    //     }
        
    //     bids = reformat(orderbook["bids"])
    //     asks = reformat(orderbook["asks"])
    // })
    // .catch(function (error) {
    //     console.log(error)
    // })
    function getBidsAsks(response) {
        orderbook = response.data
        function bidAskReformat(obj) {
            for (const [key, value] of Object.entries(obj)) {
                delete value["timestamp"]
                obj[key] = Object.values(value)
            }
            return obj
        }
        
        bids = bidAskReformat(orderbook["bids"])
        asks = bidAskReformat(orderbook["asks"])

        return [bids, asks]
    }

    const response = await axios.get(`https://api.gemini.com/v1/book/btcusd`)
    return getBidsAsks(response)
}

// ftx()
// kucoin()
// kraken()
// gemini()

gemini()
.then(data => {
    console.log(data)
})
.catch(err => console.log(err))