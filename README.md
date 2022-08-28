# crypto-exchange-aggregator

Project Owners: Vivian Zhu and Stephanie Yen

## About this product

Given any two assets, it is time-consuming to compare trades on multiple cryptocurrency exchanges, whether they are decentralized (DEX) or centralized (CEX) or both. Our solution is to build an aggregator of DEXes and CEXes which will simplify the exchange process for users to swap on by abstracting away their interactions with multiple exchanges. Our current in-scope approach will be to identify the optimal execution path(s) of trades on Ethereum and EVM-compatible chains.

We will demo this product as a proof-of-concept for Seashell at the end of Summer 2022. Since there are not many existing DEX/CEX aggregators, this is a solution by which Seashell can establish itself as a competitive player. This would also be a good way to start building a long-term Seashell ecosystem and reputation in the crypto space.


## Algorithm

1. Select tokens
- User enters the ticker of initial token A, ticker of final token B, and desired amount of token A to trade 

2. Load and parse REST API data based on user input
- Relevant data from DEX aggregators and CEXs were accessed via their APIs
- Price (if DEX aggregator)
- Orderbook (if CEX)
- Fees (if applicable)

3. Output sorted list of prices 
- Each price is mapped to its associated DEX aggregator or CEX name


## Orderbook Calculation Specifications

Orderbook algorithm (applied to CEXs)
- Look at “bid” side of orderbook
- Add up bids until desired amount of token A is calculated OR reached end of orderbook
- Account for excess [subtract extras] or deficiency [end of orderbook reached] of calculated token amount 
     - Now, the calculated token amount equals given token amount
- Determine gas, exchange, and withdrawal fees
     - Total Value Paid = Total Value of Tokens + (Total Value of Tokens * fee1) + (Total Value of Tokens * fee2) + …
- Price = (Total Value Paid)/(Token Amount)

