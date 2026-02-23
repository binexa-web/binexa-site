async function loadUltraData() {
    const table = document.getElementById("levelTable");
    table.innerHTML = "";
}

loadUltraData();

async function loadTree() {
    const userId = localStorage.getItem("userId");

    // Check if userId exists
    if (!userId) {
        console.error("User ID not found in localStorage. Please login first.");
        return;
    }

    try {
        const res = await fetch("http://localhost:3000/api/tree/" + userId);
        if (!res.ok) throw new Error("Network response was not ok");

        const data = await res.json();
        renderGraphTree(data);
    } catch (err) {
        console.error("Failed to load tree:", err);
    }
}

function renderGraphTree(nodes) {
    const box = document.getElementById("graphTree");
    if (!box) {
        console.error("Element #graphTree missing in HTML");
        return;
    }
    box.innerHTML = "";

    function buildLevels(list, level = 0, levels = []) {
        if (!list || !list.length) return levels;
        if (!levels[level]) levels[level] = [];

        list.forEach(u => {
            levels[level].push(u);
            if (u.children && u.children.length) {
                buildLevels(u.children, level + 1, levels);
            }
        });
        return levels;
    }

    const levels = buildLevels(nodes);

    levels.forEach((lvl, i) => {
        const row = document.createElement("div");
        row.className = "graph-level";

        lvl.forEach(user => {
            const node = document.createElement("div");
            node.className = "graph-node " + (i === 0 ? "root-node" : "");

            // Yahan dhyan dein: user.username ya user.name? 
            // Jo backend se aa raha hai wahi likhein.
            const displayName = user.username || user.name || "Unknown";

            node.innerHTML = `
                ${i === 0 ? "👑" : "👤"} 
                ${displayName} 
                <br><small>(ID: ${user.id})</small>
            `;
            row.appendChild(node);
        });
        box.appendChild(row);
    });
}

// Function call sirf bahar honi chahiye
loadTree();

function openReferral() {

    document.querySelectorAll(".ultra-section").forEach(sec => {
        sec.style.display = "none";
    });

    document.getElementById("referralPanel").style.display = "block";
}
