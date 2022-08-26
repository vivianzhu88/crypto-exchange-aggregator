// load JavaScript modules
const axios  = require('axios');
const prompt = require('prompt-sync')();
const crypto = require('crypto');
const qs     = require('qs');
const { response } = require('express');

class ExchangeData {
    constructor(hasOrderbook, name, baseUrl) {
        // flag to distinguish between CEX (true) vs. DEX aggregator (false)
        this.hasOrderbook = hasOrderbook 

        // data to be returned from every exchange/aggregator after modifying with (API) data;
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

// DEX aggregator ----------------------------------------------------------------------------------------------

async function matcha(initTicker, finalTicker, initAmount) {
    let matcha = new ExchangeData(
                        false,
                        "matcha", 
                        "https://api.0x.org"
                    )
    matcha.calculationUrl = `${matcha.baseUrl}/swap/v1/price?sellToken=${initTicker}&buyToken=${finalTicker}&sellAmount=${initAmount}`

    function getPrice(response) {
        return response.data["price"]
    }

    function getFees(response) {
        return {
            "gasFee": response.data["gasPrice"] // wei
        }
    }

    function loadData() {
        return axios.get(matcha.calculationUrl)
            .then(response => {
                matcha.data["price"] = getPrice(response)
                matcha.data["fees"] = getFees(response)
                return matcha.data
            })
            .catch(err => {
                const { config, request, response } = err
                throw {
                    reason: response["data"]["validationErrors"], 
                    error: new Error()
                }
            })
    }

    return loadData()
}

// CEX ---------------------------------------------------------------------------------------------------------

async function ftx(initTicker, finalTicker) {
    let ftx = new ExchangeData(
                    true, 
                    "ftx",
                    "https://ftx.us"
                )
    ftx.calculationUrl = `${ftx.baseUrl}/api/markets/${initTicker}/${finalTicker}/orderbook?depth=100` //100 is max
    ftx.feesUrl = `${ftx.baseUrl}/api/account`

    function config() {
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
        return {
            "bids": orderbook["bids"], 
            "asks": orderbook["asks"]
        }
    }

    function getFees(response) {
        accountInfo = response.data["result"]
        return {
            "exchangeFee": accountInfo["takerFee"]
        }
    }

    function loadData() {
        config = config()
        return axios.all([
            axios.get(ftx.calculationUrl, config),
            axios.get(ftx.feesUrl, config),
        ])
        .then(responseArr => {
            ftx.data["orderbook"] = getOrderbook(responseArr[0])
            ftx.data["fees"] = getFees(responseArr[1])
            return ftx.data
        })
        .catch(err => {
            const { config, request, response } = err
            throw {
                reason: response,
                error: new Error()
            }
        })
    }

    return loadData()
}

async function kucoin(initTicker, finalTicker) {
    let kucoin = new ExchangeData(
                        true, 
                        "kucoin",
                        "https://api.kucoin.com"
                    )
    kucoin.calculationUrl = `${kucoin.baseUrl}/api/v3/market/orderbook/level2_20?symbol=${initTicker}-${finalTicker}`

    // reformat user input if needed
    if (finalTicker == "USD") finalTicker = "USDC"

    function getOrderbook(response) {
        orderbook = response.data["data"]
        return {
            "bids": orderbook["bids"], 
            "asks": orderbook["asks"]
        }
    }

    function loadData() {
        config = config()
        return axios.all([
            axios.get(kucoin.calculationUrl, config)
        ])
        .then(responseArr => {
            console.log(responseArr[0])
            kucoin.data["orderbook"] = getOrderbook(responseArr[0])
            return kucoin.data
        })
        .catch(err => {
            const { config, request, response } = err
            throw {
                reason: response,
                error: new Error()
            }
        })
    }

    return loadData()
}

async function kraken(initTicker, finalTicker) {
    let kraken = new ExchangeData(
                        true, 
                        "kraken",
                        "https://api.kraken.com"
                    )
    kraken.calculationUrl = `${kraken.baseUrl}/0/public/Depth?pair=${initTicker}${finalTicker}&count=0`
    kraken.feesUrl = `${kraken.baseUrl}/0/private/TradeVolume`

    // reformat user input if needed
    if (initTicker == "BTC") initTicker = "XBT"
    
    function getOrderbook(response) {
        orderbook = response.data["result"]["XXBTZUSD"] // to change

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

        return {
            "bids": bids, 
            "asks": asks
        }
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
            const { config, request, response } = err
            throw {
                reason: response,
                error: new Error()
            }
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
    gemini.calculationUrl = `${gemini.baseUrl}/v1/book/${initTicker}${finalTicker}?limit_bids=0&limit_asks=0` 

    // hard-coded: btcusd

    function getOrderbook(response) {
        orderbook = response.data

        // for every bid/ask, filter out the timestamp (third element)
        function reformat(obj) {
            for (const [key, value] of Object.entries(obj)) {
                delete value["timestamp"]
                obj[key] = Object.values(value)
            }
            return obj
        }

        return {
            "bids": reformat(orderbook["bids"]), 
            "asks": reformat(orderbook["asks"])
        }
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
            const { config, request, response } = err
            throw {
                reason: response,
                error: new Error()
            }
        })
    }

    return loadData()
}

// get API data + perform calculations ---------------------------------------------------------------------

function getExchangePrice(orderbook, fees, initAmount) {
    var bids = orderbook["bids"]; // object type
    var total_amount = 0;
    var total_value = 0;
    var b = 0;

    // add up bids until wanted amount of tokens is calculated or entire orderbook has been parsed
    // convert data types in each bid to 'number'
    while ((total_amount < initAmount) && (b < bids.length)){
        total_value += parseFloat(bids[b][0]) * parseFloat(bids[b][1]);
        total_amount += parseFloat(bids[b][1]);
        b++;
    }

    // account for excess or deficiency of token amount
    if (total_amount > initAmount){
        b--;
        excess_amount = total_amount - initAmount;
        total_value -= (excess_amount * parseFloat(bids[b][0]));
    }
    else if (total_amount < initAmount){
        console.log("Increase orderbook depth current amount: " + total_amount);
        return null;
    }

    // now that our calculated token amount is same as given token amount, we can calculate price per token
    if (total_amount = initAmount){
        // add fees (if they exist)
        if ("gasFee" in fees) total_value += (total_value * fees["gasFee"]);
        if ("exchangeFee" in fees) total_value += (total_value * fees["exchangeFee"]);
        if ("withdrawalFee" in fees) total_value += (total_value * fees["withdrawalFee"]);

        // find price
        avg_price = total_value / initAmount;
        return avg_price;
    }
}

async function loadAllData(initTicker, finalTicker, initAmount) {
    return await Promise.allSettled([
        // --- DEX aggregators --- 
        // matcha(initTicker, finalTicker, initAmount),

        // --- CEX --- 
        ftx(initTicker, finalTicker), 
        // kucoin(initTicker, finalTicker), 
        kraken(initTicker, finalTicker), 
        gemini(initTicker, finalTicker)
    ])
}

async function getAllPrices(initTicker, finalTicker, initAmount) {
    // --- load all API data based on user input ---
    const allData = await loadAllData(initTicker, finalTicker, initAmount); 

    // get resolved Promises' values + append execution prices mapped to exchange/aggregator name to result array
    let allPrices = []
    let fulfilled = allData.filter(data => data.status === 'fulfilled').map(data => data.value)
    fulfilled.forEach((response) => { 
        exchangeName = response.name
        if (response.orderbook === undefined) { // if DEX aggregator, simply pull price
            exchangePrice = response.price
        } else { // if CEX, calculate price with orderbook
            exchangePrice = getExchangePrice(response.orderbook, response.fees, 1) 
        }
        allPrices.push([exchangePrice, [exchangeName, 1]]); 
    })

    // get rejected Promises' reasons + log why they failed
    const rejected = allData.filter(data => data.status === 'rejected').map(data => data.reason)
    rejected.forEach((err) => { 
        console.log(err.reason) 
    })

    // --- sort data from lowest price -> highest price ---
    allPrices.sort((a, b) => a[0] - b[0])
    // console.log(allPrices) // testing purposes
    return allPrices
}

// main method ---------------------------------------------------------------------------------------------

function main() {
    // --- specify user input ---
    var initTicker = prompt("Ticker of the token you have: ").toUpperCase()
    var finalTicker = prompt("Ticker of the token you want to trade into: ").toUpperCase()
    var initAmount = parseFloat(prompt("How much " + initTicker + " do you want to trade? "));
    console.log("\nConverting " + initAmount + " " + initTicker + " to " + finalTicker);

    // --- get prices from all exchanges and display output data ---
    getAllPrices(initTicker, finalTicker, initAmount).then(allPrices => {
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

main() // load the program