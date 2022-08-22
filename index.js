// load JavaScript modules
const axios = require('axios');
const prompt = require('prompt-sync')();
const crypto = require('crypto');
const { response } = require('express');

// CEX APIs ---------------------------------------------------------------------------------------------

class ExchangeData {
    constructor(hasOrderbook, name, baseUrl) {
        // flag to distinguish between CEX vs. DEX aggregator
        // the latter does not provide orderbooks
        this.hasOrderbook = hasOrderbook 

        // data to be returned from every exchange/aggregator
        // after modifying with (API) data;
        // needed to make price calculations and format output
        this.data = {   "name": name, 
                        "orderbook": null,  // provided by CEX
                        "price": null,      // provided by DEX aggregator
                        "fees": { // in decimal format
                            "gasFee": 0, 
                            "exchangeFee": 0, 
                            "withdrawalFee": 0
                        }
                    }

        // URLs to make API calls
        this.baseUrl = baseUrl
        this.calculationUrl = '' // orderbook URL if CEX, price URL if DEX aggregator
        this.feesUrl = ''
    }
}

async function matcha(initTicker, finalTicker, initAmount) {
    let matcha = new ExchangeData(
                        false,
                        "matcha", 
                        "https://api.0x.org"
                    )
    // https://docs.0x.org/0x-api-swap/api-references/get-swap-v1-price
    matcha.calculationUrl = `${matcha.baseUrl}/swap/v1/price?sellToken=${initTicker}&buyToken=${finalTicker}&sellAmount=${initAmount}`,
    console.log(matcha.calculationUrl)

    function getPrice(response) {
        return response.data["price"]
    }

    function getFees(response) {
        return {
            "gasFee": response.data["gas"]
        }
    }

    function loadData() {
        return axios.all([
            axios.get(matcha.calculationUrl)
            // axios.get(matcha.feesUrl)
        ])
        .then(responseArr => {
            matcha.data["price"] = getPrice(responseArr[0])
            // matcha.data["fees"]["gasFee"] = getFees(responseArr[1])
            return matcha.data
        })
        .catch(err => {
            // console.log(err["response"]["data"]["validationErrors"])
            // reason = err["data"]["reason"]
            // console.log(reason)
            console.log(err)
        })
    }

    return loadData()
}

// API docs: https://docs.ftx.com
async function ftx(initTicker, finalTicker) {
    let ftx = new ExchangeData(
                    true, 
                    "ftx",
                    "https://ftx.us"
                )
    ftx.calculationUrl = `${ftx.baseUrl}/api/markets/${initTicker}/${finalTicker}/orderbook?depth=100` //100 is max
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
            axios.get(ftx.calculationUrl, config),
            axios.get(ftx.feesUrl, config),
        ])
        .then(responseArr => {
            // this is what the Promise does when it resolves
            ftx.data["orderbook"] = getOrderbook(responseArr[0])
            ftx.data["fees"]["exchangeFee"] = getFees(responseArr[1])
            return ftx.data
        })
        .catch(err => {
            // this is what the Promise does when it rejects
            // console.log(err)
            return Promise.reject(err)
        })
    }

    // receive and resolve the Promise and
    // return the FTX data object
    return loadData()
}

async function kucoin(initTicker, finalTicker) {
    let kucoin = new ExchangeData(
                        true, 
                        "kucoin",
                        "https://api.kucoin.com"
                    )
    // https://docs.kucoin.com/#get-full-order-book-aggregated 
    kucoin.calculationUrl = `${kucoin.baseUrl}/api/v1/market/orderbook/level2_20?symbol=${initTicker}-${finalTicker}`

    // reformat user input if needed
    if (finalTicker == "USD") finalTicker = "USDC"

    function getOrderbook(response) {
        orderbook = response.data["data"]

        bids = orderbook["bids"]
        asks = orderbook["asks"]
        
        return {"bids": bids, "asks": asks}
    }

    function loadData() {
        return axios.all([
            axios.get(kucoin.calculationUrl)
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
async function kraken(initTicker, finalTicker) {
    let kraken = new ExchangeData(
                        true, 
                        "kraken",
                        "https://api.kraken.com"
                    )
    // Set maximum number of bids/asks to 0 to get full order book
    kraken.calculationUrl = `${kraken.baseUrl}/0/public/Depth?pair=${initTicker}${finalTicker}&count=0`

    // reformat user input if needed
    if (initTicker == "BTC") initTicker = "XBT"
    
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
            axios.get(kraken.calculationUrl)
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

async function gemini(initTicker, finalTicker) {
    let gemini = new ExchangeData(
                        true, 
                        "gemini",
                        "https://api.gemini.com"
                    ) 
    // Limit bids/asks to 0 to get full order book
    gemini.calculationUrl = `${gemini.baseUrl}/v1/book/${initTicker}${finalTicker}?limit_bids=0&limit_asks=0` 

    // hard-coded: btcusd

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
            axios.get(gemini.calculationUrl)
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
// should this be async?
function getExchangePrice(orderbook, fees, i_amount) {
    // condition check - CEX would have an orderbook, otherwise just get price
    var bids = orderbook["bids"]; // object type
    // console.log(bids)
    // console.log(typeof(bids))
    // console.log(typeof(bids[0]))
    // console.log(typeof(bids[0][0]))
    // console.log(typeof(bids[0][1]))
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

// call async functions and
// get resolved value of their Promises
// for EXCHANGE data
// return format: [ { status: 'fulfilled', value: undefined } ]
async function loadAllData(initTicker, finalTicker, initAmount) {
    // load API data from all exchanges/aggregators in parallel
    return await Promise.allSettled([
        // DEX aggregators
        matcha(initTicker, finalTicker, initAmount),

        // CEX
        // ftx(initTicker, finalTicker), 
        // kucoin(initTicker, finalTicker), 
        // kraken(initTicker, finalTicker), 
        // gemini(initTicker, finalTicker)
    ])
}

async function getAllPrices(initTicker, finalTicker, initAmount) {
    // --- load all API data based on user input ---
    const allData = await loadAllData(initTicker, finalTicker, initAmount); 
    
    // get resolved Promises' values
    let allPrices = []
    const fulfilled = allData.filter(data => data.status === 'fulfilled').map(data => data.value)
    // console.log(fulfilled)
    fulfilled.forEach((data) => {
        // save exchange price mapped to exchange name
        exchangeName = data.name
        if (data.orderbook == null) {
            exchangePrice = data.price
        } else {
            exchangePrice = getExchangePrice(data.orderbook, data.fees, 1) 
        }
        allPrices.push([exchangePrice, [exchangeName, 1]]); 
    })

    // get rejected Promises' reasons
    const rejected = allData.filter(data => data.status === 'rejected').map(data => data.reason)
    rejected.forEach((data) => {
        console.log(data) // need the code
    })

    // if exchangeData.value is not undefined!
    // error check

    // --- sort data from lowest price -> highest price ---
    allPrices.sort((a, b) => a[0] - b[0])
    console.log(allPrices) // testing purposes
    return allPrices
}

// main method ---------------------------------------------------------------------------------------------
function main() {
    // specify user input
    var initTicker = prompt("Ticker of the token you have: ").toUpperCase()
    var finalTicker = prompt("Ticker of the token you want to trade into: ").toUpperCase()
    var initAmount = parseFloat(prompt("How much " + initTicker + " do you want to trade? "));
    console.log("\nConverting " + initAmount + " " + initTicker + " to " + finalTicker);

    // get prices from all exchanges
    getAllPrices(initTicker, finalTicker, initAmount).then(allPrices => {
        // console.log(result)
        // --- display output data ---
        let outputString = "";
        for (let i = 0; i < allPrices.length; i++) { //i is path
            price = allPrices[i][0];
            outputString += "____________________________\n" + (i+1) + ". PRICE: " + price + " (" + initTicker + "/" + finalTicker + ")\n\n";
            for (let j = 1; j < allPrices[i].length; j++) { //j is # exchanges - 1
                exchange = allPrices[i][j];
                if (exchange.length > 2){ //there is intermediary token
                    outputString += "  - <" + exchange[0] + "> " + exchange[1] + " " + initTicker + " to " + exchange[2] + ", " + exchange[3] + " " + exchange[2] +  " to " + finalTicker + "\n";
                }
                else{
                    outputString += "  - <" + exchange[0] + "> " + exchange[1] + " " + initTicker + " to " + finalTicker + "\n";
                }
            }
        }
        console.log(outputString)
    })
}

// load the program
main()