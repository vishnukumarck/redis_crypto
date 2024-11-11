const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const axios = require("axios");
const redis = require("redis");
const cron = require("node-cron");
const app = express();
const { logger, errorLogger } = require("./logs/loggers");

require("dotenv").config();

app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

var corsOptions = {
  origin: "http://localhost:3000",
};

app.use(cors(corsOptions));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Redis." });
});


app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error(err.message, err.stack);
  errorLogger.error(`Error handler middleware: ${err.message}`);
  res.status(statusCode).json({ message: err.message });
  return;
});

const API_URL = process.env.API_URL;
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT;

const redisClient = redis.createClient({
    host: REDIS_HOST,
    port: REDIS_PORT,
  });

  redisClient.connect();
  console.log("Connecting to the Redis"); 

  redisClient.on('ready', () => {
    console.log("Redis Connected!!!!");
  });
  
  redisClient.on("error", (err) => {
    console.error("Redis error:", err);
  });

app.get("/crypto_data_redis", async (req, res) => {
  redisClient.get("cryptoData", (err, data) => {
    console.log("data--->", data);
    if (err) {
      return res.status(500).json({ message: "Error retrieving data" });
    }
    if (data) {
        console.log("getData!!!", data);
        return res.json(JSON.parse(data));
    //   return res.json(data);
    } else {
      return res.status(404).json({ message: "Data not found" });
    }
  });
});

const fetchCryptoData = async () => {
  try {
    const response = await axios.get(API_URL);
    const formattedData = response.data.Data.map((coin) => ({
      name: coin.CoinInfo.FullName,
      symbol: coin.CoinInfo.Internal,
      price: coin.RAW.USD.PRICE,
      change24Hour: coin.RAW.USD.CHANGEPCT24HOUR,
    }));
    console.log("formattedData->>>", formattedData);
    // redisClient.setex("cryptoData", 60, JSON.stringify(formattedData));
    redisClient.set("cryptoData", JSON.stringify(formattedData), (err, reply) => {
        console.log("redisClientReply!!!!!!!!", reply); 
    });
    console.log("Data updated in Redis");
  } catch (error) {
    console.error("Error fetching data:", error.message);
  }
};

cron.schedule("*/1 * * * *", () => {
  console.log("Fetching data from API...");
  fetchCryptoData();
});

fetchCryptoData();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  logger.info(`Server is running on port ${PORT}.`);
});
