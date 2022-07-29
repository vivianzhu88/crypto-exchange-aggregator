// load JavaScript modules
const axios = require('axios');
const prompt = require('prompt-sync')();
const crypto = require('crypto');
const { response } = require('express');

// user variables
// hard-coded for now
baseCurrency = 'DAI'
quoteCurrency = 'USDT'
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


// CEX APIs ---------------------------------------------------------------------------------------------

// base urls
ftxBaseUrl = `https://ftx.us/api`

class ExchangeData {
    constructor(data) {
        this.data = {   "exchange": "", 
                        "orderbook": null,
                        "fees": {
                            "gasFee": 0.03, 
                            "exchangeFee": 0, 
                            "withdrawalFee": 0
                        }
                    }
    }
}

async function ftx() {
    let ftx = new ExchangeData()
    ftx.data["exchange"] = "ftx"

    // Need to add authentication headers for fee-related FTX API requests
    // https://blog.ftx.com/blog/api-authentication/ 
    function ftxConfig() {
        const FTX_KEY = 'L4dEDrXVRTvQdlzx2BDKJbcYE1s0dDM2edLY8OBW'
        const FTX_SECRET= 'ZJ4wI4O_n5wsywK0CiS9dj3KSPwb0p3RAE6NH_St'
        
        timestamp = Date.now()
        signaturePayload = `${timestamp}GET/api/account` // hard-coded
        signature = crypto.createHmac("sha256", encodeURI(FTX_SECRET)).update(encodeURI(signaturePayload)).digest('hex');
        return config = {
            // https://stackoverflow.com/questions/69213825/ftx-get-account-info-using-python-gives-not-logged-in-error 
            headers: {
                'FTXUS-KEY': FTX_KEY,
                'FTXUS-SIGN': signature,
                'FTXUS-TS': timestamp.toString()
            }
        }
    }

    feesUrl = `${ftxBaseUrl}/account`
    orderBookUrl = `${ftxBaseUrl}/markets/DAI/USDT/orderbook?depth=20`

    function getOrderbook(response) {
        orderbook = response.data["result"]

        bids = orderbook["bids"]
        asks = orderbook["asks"]

        return {"bids": bids, "asks": asks}
    }

    // axios calls return promises
    config = ftxConfig()
    axios.all([
        axios.get(orderBookUrl, config),
        axios.get(feesUrl, config),
    ])
    .then(responseArr => {
        // console.log(responseArr)
        // ftx.data["orderbook"] = getOrderbook(responseArr[0])
        // console.log(getOrderbook(responseArr[0]))
        // ftx.data["orderbook"] = "hi"
        return "hi"
    });
}

ftx().then(res => {
    console.log(res)
})



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
    // og format: { price: '20838.99', amount: '0.26479', timestamp: '1658861155' }
    function getOrderbook(response) {
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

    // get orderbook (bids/asks)
    // get fees
    return getOrderbook(response)
}

// kucoin()
// kraken()
// gemini()

let dict = {}

// gemini()
// .then(data => {
//     // bids = data[0]
//     // asks = data[1]
//     // based on the orderbook (bids/asks), invoke a callback function 
//     // to calculate the best execution price
//     console.log(data)
// })
// .catch(err => console.log(err))

// 'orderbook' is a dictionary
// ['bids':[[Array], [Array]], 'asks': [[Array], [Array]]]
// where Array = [price, amount] <-- both in number format
function getPriceFromOrderbook(orderbook) {

}

// {'exchange1': price, 'exchange2': price}
async function get_prices(i_ticker, f_ticker, i_amount){

}

// main method ---------------------------------------------------------------------------------------------
function main() {
    var init_ticker = prompt("Ticker of the token you have: ");
    var final_ticker = prompt("Ticker of the token you want to trade into: ");
    var init_amount = prompt("How much " + init_ticker + " do you want to trade? ");
    console.log("\nConverting " + init_amount + " " + init_ticker + " to " + final_ticker);

    //get prices from all exchanges
    //each list inside main list represents a path
    //format for ouput is [total price init/final ticker, [exchange, # init token to trade], [exchange, # init token to trade, intermediary token ticker, # intermediary token to trade]]
    output = [
        [200 , ["Matcha" , 5]],
        [543291 , ["Kucoin" , 2], ["FTX" , 4], ["Matcha" , 1]],
        [100000 , ["FTX" , 1 , "USDT", 5 ]]
    ];
    //output = get_prices(init_ticker, final_ticker, init_amount);

    //bubble sort algorithm lowest price -> highest price
    for (var i = 0; i < output.length-1; i++){
        for (var j = 0, swapping; j < output.length-1; j++){
            if (output[j][0] > output[j+1][0]){
                swapping = output[j+1];
                output[j+1] = output[j];
                output[j] = swapping;
            }
        }
    }

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
}


