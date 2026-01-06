let data = JSON.parse(localStorage.getItem("easySplitter")) || {
  users: [],
  groups: [],
  activeGroup: null
};

function save() {
  localStorage.setItem("easySplitter", JSON.stringify(data));
  renderUsers();
  showBalances();
  simplifyDebts();
}

function createGroup() {
  let name = prompt("Enter group name");
  if (!name) return;

  data.groups.push({ name, members: [], expenses: [] });
  data.activeGroup = name;
  save();
}

function getGroup() {
  return data.groups.find(g => g.name === data.activeGroup);
}

/* USERS */
function addUser() {
  let name = newUser.value.trim();
  if (!name || !getGroup()) {
    alert("Create a group first");
    return;
  }

  if (!data.users.find(u => u.name === name)) {
    data.users.push({ name, upi: "" });
  }

  if (!getGroup().members.includes(name)) {
    getGroup().members.push(name);
  }

  currentUser.value = name;
  newUser.value = "";
  save();
}

function renderUsers() {
  currentUser.innerHTML = "";
  data.users.forEach(u =>
    currentUser.add(new Option(u.name, u.name))
  );

  let u = data.users.find(x => x.name === currentUser.value);
  upiInput.value = u?.upi || "";
}

currentUser.onchange = () => {
  let u = data.users.find(x => x.name === currentUser.value);
  upiInput.value = u?.upi || "";
};

function saveUPI() {
  let u = data.users.find(x => x.name === currentUser.value);
  if (!u || !upiInput.value.includes("@")) {
    alert("Invalid UPI");
    return;
  }
  u.upi = upiInput.value.trim();
  save();
}

/* EXPENSE */
function addExpense() {
  let amt = +amount.value;
  let g = getGroup();
  if (!amt || !currentUser.value || !g) return;

  let per = amt / g.members.length;
  let split = {};
  g.members.forEach(m => split[m] = per);

  g.expenses.push({ paidBy: currentUser.value, split });
  amount.value = "";
  save();
}

/* BALANCES */
function calculateBalances() {
  let bal = {};
  let g = getGroup();
  if (!g) return bal;

  g.expenses.forEach(e => {
    for (let m in e.split) {
      if (m !== e.paidBy) {
        bal[m] = (bal[m] || 0) - e.split[m];
        bal[e.paidBy] = (bal[e.paidBy] || 0) + e.split[m];
      }
    }
  });
  return bal;
}

function showBalances() {
  balances.innerHTML = "";
  let b = calculateBalances();
  for (let p in b) {
    balances.innerHTML += `<div>${p} ${b[p] < 0 ? "owes ₹" + (-b[p]).toFixed(2) : "gets ₹" + b[p].toFixed(2)}</div>`;
  }
}

/* SETTLE */
function simplifyDebts() {
  settle.innerHTML = "";
  let b = calculateBalances();
  let debtors = [], creditors = [];

  for (let p in b) {
    if (b[p] < 0) debtors.push({ p, a: -b[p] });
    else creditors.push({ p, a: b[p] });
  }

  debtors.forEach(d => {
    creditors.forEach(c => {
      if (d.a && c.a) {
        let pay = Math.min(d.a, c.a);
        settle.innerHTML += `<div>${d.p} → ${c.p} ₹${pay.toFixed(2)}</div>`;
        d.a -= pay;
        c.a -= pay;
      }
    });
  });
}

/* INVITE — FINAL FIX */
function generateInvite() {
  let group = getGroup();
  if (!group) {
    alert("Please create a group first!");
    return;
  }

  let code = btoa(encodeURIComponent(JSON.stringify(group)));

  let base =
    location.origin === "null"
      ? location.href.split("?")[0]
      : location.origin + location.pathname;

  let link = `${base}?join=${code}`;
  inviteCode.textContent = link;
}

function shareInvite() {
  if (!inviteCode.textContent) generateInvite();

  let msg = `Join my Easy Splitter group:\n${inviteCode.textContent}`;
  if (navigator.share) {
    navigator.share({ title: "Easy Splitter", text: msg });
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    navigator.clipboard.writeText(msg);
  }
}

/* AUTO JOIN */
(function () {
  let p = new URLSearchParams(location.search);
  let c = p.get("join");
  if (!c) return;

  try {
    let g = JSON.parse(decodeURIComponent(atob(c)));
    data.groups.push(g);
    data.activeGroup = g.name;
    save();
    history.replaceState({}, document.title, location.pathname);
    alert("Group joined successfully!");
  } catch {
    alert("Invalid invite link");
  }
})();

save();
