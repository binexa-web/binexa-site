// TEST userId (abhi hardcoded)
const userId = 1;

fetch(`http://localhost:3000/earnings/${userId}`)
    .then(res => res.json())
    .then(data => {
        let total = 0;
        const table = document.getElementById("earningsTable");

        data.forEach(row => {
            total += row.amount;

            const tr = document.createElement("tr");
            tr.innerHTML = `
        <td>${row.from_user}</td>
        <td>${row.level}</td>
        <td>₹${row.amount}</td>
        <td>${row.created_at}</td>
      `;
            table.appendChild(tr);
        });

        document.getElementById("total").innerText = total;
    })
    .catch(err => {
        alert("Wallet load failed");
        console.error(err);
    });
