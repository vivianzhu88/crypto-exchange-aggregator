// user variables
var axios = require('axios');
const prompt = require('prompt-sync')();

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
/*
gemini()
.then(data => {
    console.log(data)
})
.catch(err => console.log(err))
*/

//main method
var init_ticker = prompt("Ticker of the token you have: ");
var final_ticker = prompt("Ticker of the token you want to trade into: ");
var init_amount = prompt("How much " + init_ticker + " do you want to trade? ");
console.log("\nConverting " + init_amount + " " + init_ticker + " to " + final_ticker);

//get prices from all exchanges
//each list inside main list represents a path
//format for ouput is [total price init/final ticker, [exchange, # init token to trade], [exchange, # init token to trade, intermediary token ticker, # intermediary token to trade]]
output = [
    [200 , ["Matcha" , 5]],
    [100000 , ["FTX" , 1 , "USDT", 5 ]],
    [543291 , ["Kucoin" , 2], ["FTX" , 4], ["Matcha" , 1]]
];
//output = get_prices(init_ticker, final_ticker, init_amount);

var output_string;
for (let i = 0; i < output.length; i++) { //i is path
    price = output[i][0];
    output_string = "____________________________\n" + (i+1) + ". PRICE: " + price + " (" + init_ticker + "/" + final_ticker + ")\n\n";
    for (let j = 1; j < output[i].length; j++) { //j is # exchanges - 1
        exchange = output[i][j];
        if (exchange.length > 2){ //there is intermediary token
            output_string += "  - <" + exchange[0] + "> " + exchange[1] + " " + init_ticker + " to " + exchange[2] + ", " + exchange[3] + " " + exchange[2] +  " to " + final_ticker + "\n";
        }
        else{
            output_string += "  - <" + exchange[0] + "> " + exchange[1] + " " + init_ticker + " to " + final_ticker + "\n";
        }
    }
    console.log(output_string);
}






