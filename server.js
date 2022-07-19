// require express
const express = require("express");

// initialize express
const app = express(); 
const PORT = 8080;

// parse JSON
app.use(express.json());

// parse URL encoded data
app.use(express.urlencoded({ extended: true }));

// create a server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});