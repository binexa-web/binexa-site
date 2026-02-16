async function loadUltraData() {
    const table = document.getElementById("levelTable");
    table.innerHTML = "";
}

loadUltraData();

async function loadTree() {

    const userId = localStorage.getItem("userId") || 1;

    const res = await fetch("http://localhost:3000/api/tree/" + userId);
    const data = await res.json();

    console.log("TREE DATA:", data);

    const box = document.getElementById("treeView");
    box.innerHTML = "";

    function renderTree(nodes) {

        nodes.forEach(u => {

            box.innerHTML += `
      <div class="tree-node">
        👤 ${u.username} | ID:${u.id}
      </div>
      `;

            if (u.children && u.children.length) {
                renderTree(u.children);
            }

        });
    }

    renderTree(data);
}

loadTree();

function openReferral() {
    document.querySelectorAll(".ultra-section").forEach(sec => {
        sec.style.display = "none";
    });

    document.getElementById("referralPanel").style.display = "block";
}
