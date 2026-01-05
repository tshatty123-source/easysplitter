let data = JSON.parse(localStorage.getItem("splitwise")) || {
  users: [
    { name: "Amit", upi: "" },
    { name: "Rahul", upi: "" },
    { name: "Neha", upi: "" }
  ],
  groups: [{
    name: "Friends",
    members: ["Amit", "Rahul", "Neha"],
    expenses: []
  }],
  settlements: []
};

function save() {
  localStorage.setItem("splitwise", JSON.stringify(data));
  loadUI();
  showBalances();
  simplifyDebts();
  showConfirmations();
  showHistory();
}

function loadUI() {
  currentUser.innerHTML = "";
  groupSelect.innerHTML = "";

  data.users.forEach(u => currentUser.add(new Option(u.name)));
  data.groups.forEach(g => groupSelect.add(new Option(g.name)));

  loadUserUPI();
}

function loadUserUPI() {
  let user = data.users.find(u => u.name === currentUser.value);
  upiInput.value = user?.upi || "";
}

currentUser.onchange = loadUserUPI;

/* SAVE UPI */
function saveUPI() {
  let user = data.users.find(u => u.name === currentUser.value);
  let upi = upiInput.value.trim();
  if (!upi.includes("@")) {
    alert("Enter a valid UPI ID");
    return;
  }
  user.upi = upi;
  save();
}

/* BALANCES */
function calculateBalances() {
  let bal = {};
  data.groups[0].expenses.forEach(e => {
    for (let m in e.splits) {
      if (m !== e.paidBy) {
        bal[m] = (bal[m] || 0) - e.splits[m];
        bal[e.paidBy] = (bal[e.paidBy] || 0) + e.splits[m];
      }
    }
  });
  return bal;
}

/* SMART SPLIT */
function smartSplit(group, amt) {
  let bal = calculateBalances();
  let strength = aiStrength.value / 100;
  let total = 0, w = {}, exp = "";

  group.members.forEach(m => {
    let b = bal[m] || 0;
    let adj = 1 - (b / 1000) * strength;
    adj = Math.max(0.6, Math.min(1.4, adj));
    w[m] = adj;
    total += adj;
    if (b > 0) exp += `• ${m} paid more earlier\n`;
    if (b < 0) exp += `• ${m} owed earlier\n`;
  });

  aiExplain.textContent = exp || "";
  let s = {};
  group.members.forEach(m => s[m] = +(amt * w[m] / total).toFixed(2));
  return s;
}

/* ADD EXPENSE */
function addExpense() {
  let g = data.groups[0];
  let amt = +amount.value;
  if (!amt) return;

  let splits = splitType.value === "smart"
    ? smartSplit(g, amt)
    : Object.fromEntries(g.members.map(m => [m, amt / g.members.length]));

  g.expenses.push({ paidBy: currentUser.value, splits });
  amount.value = "";
  save();
}

/* SHOW BALANCES */
function showBalances() {
  balances.innerHTML = "";
  let b = calculateBalances();
  for (let p in b) {
    balances.innerHTML += `<div>${p} ${b[p] < 0 ? "owes ₹" + -b[p] : "gets ₹" + b[p]}</div>`;
  }
}

/* PAY UPI */
function payUPI(from, to, amt) {
  let user = data.users.find(u => u.name === to);
  if (!user.upi) {
    alert("Creditor has not added UPI ID");
    return;
  }
  let url = `upi://pay?pa=${user.upi}&pn=${to}&am=${amt}&cu=INR`;
  window.location.href = url;

  setTimeout(() => {
    if (confirm("Have you paid?")) {
      data.settlements.push({
        from, to, amt,
        status: "pending",
        time: new Date().toLocaleString()
      });
      save();
    }
  }, 500);
}

/* SIMPLIFY */
function simplifyDebts() {
  settle.innerHTML = "";
  let b = calculateBalances();
  let d=[], c=[];
  for (let p in b) (b[p]<0?d:c).push({p,amt:Math.abs(b[p])});

  d.forEach(x=>{
    c.forEach(y=>{
      if(x.amt&&y.amt){
        let pay=Math.min(x.amt,y.amt);
        settle.innerHTML+=`
          <div>${x.p} → ${y.p} ₹${pay}
          <button class="small-btn" onclick="payUPI('${x.p}','${y.p}',${pay})">Pay</button>
          </div>`;
        x.amt-=pay; y.amt-=pay;
      }
    });
  });
}

/* CONFIRM */
function showConfirmations() {
  confirmations.innerHTML = "";
  data.settlements
    .filter(s => s.to === currentUser.value && s.status === "pending")
    .forEach((s,i)=>{
      confirmations.innerHTML+=`
        <div>${s.from} paid ₹${s.amt}
        <button class="small-btn" onclick="confirmReceived(${i})">Confirm</button>
        </div>`;
    });
}

function confirmReceived(i) {
  data.settlements[i].status = "confirmed";
  save();
}

/* HISTORY */
function showHistory() {
  history.innerHTML = "";
  data.settlements
    .filter(s => s.status === "confirmed")
    .forEach(s=>{
      history.innerHTML+=`<div>${s.from} → ${s.to} ₹${s.amt} (${s.time})</div>`;
    });
}

loadUI();
save();
