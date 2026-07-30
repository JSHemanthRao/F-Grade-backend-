require("dotenv").config();

console.log({
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    REFRESH_TOKEN: process.env.REFRESH_TOKEN,
    API_DOMAIN: process.env.API_DOMAIN
});
console.log("API_DOMAIN:", API_DOMAIN);