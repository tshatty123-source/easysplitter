let data = JSON.parse(localStorage.getItem("easySplitter")) || {
  users: [],
  groups: [],
  activeGroup: null
};

function save() {
  localStorage.setItem("easySplitter", JSON.stringify(data));
  renderUsers();
  showBalances();
  showSettlements();
}

/* GROUP */
function createGroup() {
  let name = groupName.value.trim();
  if (!name) return alert("Enter group name");

  if (data.groups.find(g => g.name === name))
    return alert("Group already exists");

  data.groups.push({ name, members: [], expenses: [] });
  data.activeGroup = name;
  groupName.value = "";
  save();
  alert("Group created!");
}

function getGroup() {
  return data.groups.find(g => g.name === data.activeGroup);
}

/* USERS */
function addUser() {
  let name = newUser.value.trim();
  let g = getGroup();
  if (!name || !g) return alert("Create a group first");

  if (!data.users.find(u => u.name === name))
    data.users.push({ name, upi: "" });

  if (!g.members.includes(name))
    g.members.push(name);

  currentUser.value = name;
  newUser.value = "";
  save();
}

function renderUsers() {
  currentUser.innerHTML = "";
  data.users.forEach(u => currentUser.add(new Option(u.name, u.name)));
}

/* UPI */
function saveUPI() {
  let u = data.users.find(x => x.name === currentUser.value);
  if (!u) return;
  u.upi = upiInput.value.trim();
  save();
}

/* EXPENSE */
function addExpense() {
  let amt = +amount.value;
  let g = getGroup();
  if (!amt || !g) return;

  let per = amt / g.members.length;
  let split = {};
  g.members.forEach(m => split[m] = per);

  g.expenses.push({ paidBy: currentUser.value, split });
  amount.value = "";
  save();
}

/* BALANCES */
function calculateBalances() {
  let b = {};
  let g = getGroup();
  if (!g) return b;

  g.expenses.forEach(e => {
    for (let m in e.split) {
      if (m !== e.paidBy) {
        b[m] = (b[m] || 0) - e.split[m];
        b[e.paidBy] = (b[e.paidBy] || 0) + e.split[m];
      }
    }
  });
  return b;
}

function showBalances() {
  balances.innerHTML = "";
  let b = calculateBalances();
  for (let p in b) {
    balances.innerHTML += `<div>${p} ${b[p] < 0 ? "owes ₹" + (-b[p]).toFixed(2) : "gets ₹" + b[p].toFixed(2)}</div>`;
  }
}

/* SETTLE */
function showSettlements() {
  settle.innerHTML = "";
  let b = calculateBalances();
  for (let p in b) {
    if (b[p] < 0)
      settle.innerHTML += `<div>${p} needs to pay ₹${(-b[p]).toFixed(2)}</div>`;
  }
}

/* INVITE */
function generateInvite() {
  let g = getGroup();
  if (!g) return alert("No group found");

  let code = btoa(JSON.stringify(g));
  inviteCode.textContent = location.origin + location.pathname + "?join=" + code;
}

function shareInvite() {
  if (!inviteCode.textContent) generateInvite();
  let msg = "Join my Easy Splitter group:\n" + inviteCode.textContent;

  if (navigator.share)
    navigator.share({ title: "Easy Splitter", text: msg });
  else
    window.open("https://wa.me/?text=" + encodeURIComponent(msg));
}

/* AUTO JOIN */
(function () {
  let c = new URLSearchParams(location.search).get("join");
  if (!c) return;
  try {
    let g = JSON.parse(atob(c));
    data.groups.push(g);
    data.activeGroup = g.name;
    save();
    alert("Group joined!");
    history.replaceState({}, "", location.pathname);
  } catch {}
})();

save();
