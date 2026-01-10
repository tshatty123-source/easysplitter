let data = JSON.parse(localStorage.getItem("easySplitter")) || {
  users: [],
  groups: [],
  activeGroup: null,
  payments: []
};

function save() {
  localStorage.setItem("easySplitter", JSON.stringify(data));
  renderUsers();
  showBalances();
  showSettlements();
  showConfirmations();
}

/* GROUP */
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
  data.users.forEach(u =>
    currentUser.add(new Option(u.name, u.name))
  );

  let u = data.users.find(x => x.name === currentUser.value);
  upiInput.value = u?.upi || "";
}

currentUser.onchange = renderUsers;

function saveUPI() {
  let u = data.users.find(x => x.name === currentUser.value);
  if (!u || !upiInput.value.includes("@"))
    return alert("Invalid UPI");
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

/* PAYMENTS */
function showSettlements() {
  settle.innerHTML = "";
  let b = calculateBalances();
  let d=[], c=[];

  for (let p in b) {
    if (b[p] < 0) d.push({ p, a: -b[p] });
    else c.push({ p, a: b[p] });
  }

  d.forEach(x => {
    c.forEach(y => {
      if (x.a && y.a) {
        let amt = Math.min(x.a, y.a);
        settle.innerHTML += `
          <div>
            ${x.p} → ${y.p} ₹${amt.toFixed(2)}
            <span class="badge pending">Pending</span>
            <button class="small" onclick="pay('${x.p}','${y.p}',${amt})">Pay</button>
          </div>`;
        x.a -= amt;
        y.a -= amt;
      }
    });
  });
}

function pay(from, to, amt) {
  let u = data.users.find(x => x.name === to);
  if (!u?.upi) return alert("Creditor UPI not set");

  window.location.href = `upi://pay?pa=${u.upi}&pn=${to}&am=${amt}&cu=INR`;

  setTimeout(() => {
    if (confirm("Have you completed the payment?")) {
      data.payments.push({ from, to, amt, status: "paid" });
      save();
    }
  }, 500);
}

function showConfirmations() {
  confirmations.innerHTML = "";
  data.payments
    .filter(p => p.to === currentUser.value && p.status === "paid")
    .forEach((p, i) => {
      confirmations.innerHTML += `
        <div>
          ${p.from} paid ₹${p.amt}
          <span class="badge paid">Paid</span>
          <button class="small" onclick="confirmPayment(${i})">Confirm</button>
        </div>`;
    });
}

function confirmPayment(i) {
  data.payments[i].status = "settled";
  save();
}

/* INVITE */
function generateInvite() {
  let g = getGroup();
  if (!g) return alert("Create a group first");

  let code = btoa(encodeURIComponent(JSON.stringify(g)));
  let base = location.origin === "null"
    ? location.href.split("?")[0]
    : location.origin + location.pathname;

  inviteCode.textContent = `${base}?join=${code}`;
}

function shareInvite() {
  if (!inviteCode.textContent) generateInvite();
  let msg = `Join my Easy Splitter group:\n${inviteCode.textContent}`;
  if (navigator.share) navigator.share({ title: "Easy Splitter", text: msg });
  else window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
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
  } catch {}
})();

save();

