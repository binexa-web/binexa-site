console.log("✅ script.js loaded");

function openCoin(coin) {
    window.open(
        `https://www.coingecko.com/en/coins/${coin}`,
        "_blank"
    );
}

const coins = {
    bitcoin: "btc",
    ethereum: "eth",
    binancecoin: "bnb",
    tether: "usdt",
    solana: "sol",
    tron: "trx"
};

async function fetchPrices() {
    try {
        console.log("Price updated at", new Date().toLocaleTimeString());
        const ids = Object.keys(coins).join(",");
        const url =
            `https://api.coingecko.com/api/v3/simple/price` +
            `?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

        const res = await fetch(url);
        const data = await res.json();

        for (let key in coins) {
            const short = coins[key];
            const price = data[key].usd;
            const change = data[key].usd_24h_change;

            const priceEl = document.getElementById(`${short}-price`);
            const changeEl = document.getElementById(`${short}-change`);

            if (!priceEl || !changeEl) continue;

            priceEl.innerText = `$${price.toFixed(2)}`;
            changeEl.innerText =
                `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;

            changeEl.className = change >= 0 ? "green" : "red";
        }
    } catch (err) {
        console.error("❌ Price fetch error", err);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    fetchPrices();
    setInterval(fetchPrices, 10000);
});