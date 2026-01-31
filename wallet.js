async function connectWallet() {
    if (typeof window.ethereum === "undefined") {
        alert(
            "MetaMask not detected.\n\nMobile users:\nOpen this site inside MetaMask app browser."
        );
        return;
    }

    try {
        const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
        });

        const walletAddress = accounts[0];

        const btn = document.querySelector(
            'button[onclick="connectWallet()"]'
        );

        if (btn) {
            btn.innerText =
                walletAddress.slice(0, 6) + "..." + walletAddress.slice(-4);
            btn.disabled = true;
        }

        console.log("Wallet Connected:", walletAddress);
    } catch (error) {
        console.error("Wallet connection failed:", error);
    }
}