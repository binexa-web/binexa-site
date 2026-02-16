function buyPlan(amount) {
    const userId = 2; // test ke liye hardcode (baad me login se aayega)

    fetch("http://localhost:3000/buy-plan", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            user_id: userId,
            plan_amount: amount
        })
    })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
        })
        .catch(err => {
            alert("Server error");
            console.error(err);
        });
}
