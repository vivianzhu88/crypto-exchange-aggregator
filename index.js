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

class ExchangeData {
    constructor() {
        this.data = {   "exchange": "", 
                        "orderbook": null,
                        "fees": { // in decimal format
                            "gasFee": 0, 
                            "exchangeFee": 0, 
                            "withdrawalFee": 0
                        }
                    }
        this.baseUrl = ''
        this.orderBookUrl = ''
        this.feesUrl = ''
    }
}

// API docs: https://docs.ftx.com
async function ftx() {
    let ftx = new ExchangeData()
    ftx.data["exchange"] = "ftx"

    ftx.baseUrl = `https://ftx.us`
    ftx.orderBookUrl = `${ftx.baseUrl}/api/markets/DAI/USDT/orderbook?depth=20`
    ftx.feesUrl = `${ftx.baseUrl}/api/account`

    // add authentication headers for fee-related FTX API requests
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

    function getOrderbook(response) {
        orderbook = response.data["result"]

        bids = orderbook["bids"]
        asks = orderbook["asks"]

        return {"bids": bids, "asks": asks}
    }

    function getFees(response) {
        accountInfo = response.data["result"]
        
        takerFee = accountInfo["takerFee"]

        return takerFee
    }

    // make async API requests in parallel and
    // store the responses in an iterable Promise instance
    function loadData() {
        config = ftxConfig()
        return axios.all([
            axios.get(ftx.orderBookUrl, config),
            axios.get(ftx.feesUrl, config),
        ])
        .then(responseArr => {
            // this is what the Promise does when it resolves
            ftx.data["orderbook"] = getOrderbook(responseArr[0])
            ftx.data["fees"]["exchangeFee"] = getFees(responseArr[1])
            return ftx.data
        })
        .catch(err => {
            console.log(err)
        })
    }

    // receive and resolve the Promise and
    // return the FTX data object
    return loadData()
}

async function kucoin() {
    let kucoin = new ExchangeData()
    kucoin.data["exchange"] = "kucoin"

    kucoin.baseUrl = 'https://api.kucoin.com'
    kucoin.orderBookUrl = `${kucoin.baseUrl}/api/v1/market/orderbook/level2_20?symbol=BTC-USDC`

    function getOrderbook(response) {
        orderbook = response.data["data"]

        bids = orderbook["bids"]
        asks = orderbook["asks"]
        
        return {"bids": bids, "asks": asks}
    }

    function loadData() {
        return axios.all([
            axios.get(kucoin.orderBookUrl)
        ])
        .then(responseArr => {
            kucoin.data["orderbook"] = getOrderbook(responseArr[0])
            return kucoin.data
        })
        .catch(err => {
            console.log(err)
        })
    }

    return loadData()
}

// API docs: https://docs.kraken.com/rest 
async function kraken() {
    let kraken = new ExchangeData()
    kraken.data["exchange"] = "kraken"

    kraken.baseUrl = 'https://api.kraken.com'
    kraken.orderBookUrl = `${kraken.baseUrl}/0/public/Depth?pair=XBTUSD&count=5`
    
    function getOrderbook(response) {
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
        Object.keys(asks).forEach((k) => bids[k][2] == null && bids[k].splice(2));

        return {"bids": bids, "asks": asks}
    }

    function loadData() {
        return axios.all([
            axios.get(kraken.orderBookUrl)
        ])
        .then(responseArr => {
            kraken.data["orderbook"] = getOrderbook(responseArr[0])
            return kraken.data
        })
        .catch(err => {
            console.log(err)
        })
    }
    
    return loadData()
}

async function gemini() {
    let gemini = new ExchangeData() 
    gemini.data["exchange"] = "gemini"

    gemini.baseUrl = "https://api.gemini.com"
    gemini.orderBookUrl = `${gemini.baseUrl}/v1/book/btcusd`

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

        return {"bids": bids, "asks": asks}
    }

    function loadData() {
        return axios.all([
            axios.get(gemini.orderBookUrl)
        ])
        .then(responseArr => {
            gemini.data["orderbook"] = getOrderbook(responseArr[0])
            return gemini.data
        })
        .catch(err => {
            console.log(err)
        })
    }

    return loadData()
}

// 'orderbook' is a dictionary
// ['bids':[[Array], [Array]], 'asks': [[Array], [Array]]]
// where Array = [price, amount] <-- both in number format
// orderbook = object
// each bid = object: [number, number]
async function getExchangePrice(orderbook, fees, i_amount) {
    var bids = orderbook["bids"]; // object type
    console.log(bids)
    console.log(typeof(bids))
    console.log(typeof(bids[0]))
    console.log(typeof(bids[0][0]))
    console.log(typeof(bids[0][1]))
    var total_amount = 0;
    var total_value = 0;
    var b = 0;

    // add up bids until wanted amount of tokens is calculated or entire orderbook has been parsed
    // convert data types in each bid to 'number'
    while ((total_amount < i_amount) && (b < bids.length)){
        total_value += parseFloat(bids[b][0]) * parseFloat(bids[b][1]);
        total_amount += parseFloat(bids[b][1]);
        b++;
    }

    // account for excess or deficiency of token amount
    if (total_amount > i_amount){
        b--;
        excess_amount = total_amount - i_amount;
        total_value -= (excess_amount * parseFloat(bids[b][0]));
    }
    else if (total_amount < i_amount){
        console.log("Increase orderbook depth current amount: " + total_amount);
        return null;
    }

    // now that our caluclated token amount is same as given token amount, we can calculate price per token
    if (total_amount = i_amount){
        // add fees
        gasFee = total_value * fees["gasFee"];
        exchangeFee = total_value * fees["exchangeFee"];
        withdrawalFee = total_value * fees["withdrawalFee"];
        total_value += gasFee + exchangeFee + withdrawalFee;

        // find price
        avg_price = total_value / i_amount;
        return avg_price;
    }
}

// {'exchange1': price, 'exchange2': price}
async function get_prices(i_ticker, f_ticker, i_amount){

}

// call async functions and
// get resolved value of their Promises
async function loadAllData() {
    let allData = {'ftx': null }

    // for every exchange, load its API data output -> 
    // retrieve its orderbook and fees to calculate the execution price of the specified trade

    // FTX
    let ftxData = await ftx()
    // ftxPrice = await getExchangePrice(ftxData.orderbook, ftxData.fees, 1)
    // console.log(ftxPrice)

    // KuCoin
    let kucoinData = await kucoin() 
    // kucoinPrice = await getExchangePrice(kucoinData.orderbook, kucoinData.fees, 1)
    // console.log(kucoinPrice)

    // Kraken
    let krakenData = await kraken() 
    // krakenPrice =  await getExchangePrice(krakenData.orderbook, krakenData.fees, 1)
    // console.log(krakenPrice)

    // Gemini
    let geminiData = await gemini() 
    geminiPrice = await getExchangePrice(geminiData.orderbook, geminiData.fees, 1)
    console.log(geminiPrice)

    // return allData
}

// $ node index.js
loadAllData().then(allData => {
    console.log("running")
    // console.log(allData)
})

// main method ---------------------------------------------------------------------------------------------
function main() {
    var init_ticker = prompt("Ticker of the token you have: ");
    var final_ticker = prompt("Ticker of the token you want to trade into: ");
    var init_amount = parseFloat(prompt("How much " + init_ticker + " do you want to trade? "));
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

    orderbook = 
    {
        "exchange" : "ftx",
        "bids": [
            [ '23246.3', '0.81' ],
            [ '23246.1', '0.06208339' ],
            [ '23245.6', '0.083' ],
            [ '23245.4', '0.02281999' ],
            [ '23244', '0.03208211' ],
            [ '23242.8', '0.08' ],
            [ '23240.8', '0.24767706' ],
            [ '23240.7', '0.0480163' ],
            [ '23240.4', '0.00128814' ],
            [ '23240', '0.20497708' ],
            [ '23235', '0.20181905' ],
            [ '23230.4', '0.03270318' ],
            [ '23230.3', '0.2066525' ],
            [ '23226.1', '0.1292' ],
            [ '23225.5', '0.21261745' ],
            [ '23224.8', '0.0449384' ],
            [ '23224.1', '0.08987299' ],
            [ '23223.3', '0.00063' ],
            [ '23222.1', '0.36631511' ],
            [ '23221.9', '0.01803837' ]
          ],
        "asks" : ["blah"],
        "gasFee" : 0.03, 
        "exchangeFee" : 0,
        "withdrawalFee" : 0
    };
    price = get_price_from_orderbook(orderbook, init_amount);
    console.log(price);
}

// main()