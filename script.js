let data = JSON.parse(localStorage.getItem("easySplitter")) || {
  users: [],
  group: {
    name: "Default Group",
    members: [],
    expenses: []
  },
  settlements: []
};

function save() {
  localStorage.setItem("easySplitter", JSON.stringify(data));
  loadUI();
  showBalances();
  simplifyDebts();
  showConfirmations();
  showHistory();
}

function loadUI() {
  currentUser.innerHTML = "";
  data.users.forEach(u =>
    currentUser.add(new Option(u.name, u.name))
  );
  loadUserUPI();
}

function addUser() {
  let name = newUser.value.trim();
  if (!name) return;

  if (!data.users.find(u => u.name === name)) {
    data.users.push({ name, upi: "" });
    data.group.members.push(name);
  }

  newUser.value = "";
  save();
  currentUser.value = name;
}

function loadUserUPI() {
  let u = data.users.find(x => x.name === currentUser.value);
  upiInput.value = u?.upi || "";
}

currentUser.onchange = loadUserUPI;

function saveUPI() {
  let u = data.users.find(x => x.name === currentUser.value);
  let upi = upiInput.value.trim();
  if (!upi.includes("@")) return alert("Invalid UPI");
  u.upi = upi;
  save();
}

function calculateBalances() {
  let bal = {};
  data.group.expenses.forEach(e => {
    for (let m in e.splits) {
      if (m !== e.paidBy) {
        bal[m] = (bal[m] || 0) - e.splits[m];
        bal[e.paidBy] = (bal[e.paidBy] || 0) + e.splits[m];
      }
    }
  });
  return bal;
}

function smartSplit(amount) {
  let bal = calculateBalances();
  let s = aiStrength.value / 100;
  let w = {}, total = 0, explain = "";

  data.group.members.forEach(m => {
    let b = bal[m] || 0;
    let adj = 1 - (b / 1000) * s;
    adj = Math.max(0.6, Math.min(1.4, adj));
    w[m] = adj;
    total += adj;
    if (b !== 0) explain += `${m} had previous balance\n`;
  });

  aiExplain.textContent = explain;
  let res = {};
  data.group.members.forEach(m =>
    res[m] = +(amount * w[m] / total).toFixed(2)
  );
  return res;
}

function addExpense() {
  let amt = +amount.value;
  if (!amt || !currentUser.value) return;

  let splits = splitType.value === "smart"
    ? smartSplit(amt)
    : Object.fromEntries(
        data.group.members.map(m => [m, amt / data.group.members.length])
      );

  data.group.expenses.push({ paidBy: currentUser.value, splits });
  amount.value = "";
  save();
}

function showBalances() {
  balances.innerHTML = "";
  let b = calculateBalances();
  for (let p in b) {
    balances.innerHTML += `<div>${p} ${b[p] < 0 ? "owes ₹" + (-b[p]).toFixed(2) : "gets ₹" + b[p].toFixed(2)}</div>`;
  }
}

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
          <div>${x.p} → ${y.p} ₹${pay.toFixed(2)}
          <button class="small-btn" onclick="payUPI('${x.p}','${y.p}',${pay})">Pay</button>
          </div>`;
        x.amt-=pay; y.amt-=pay;
      }
    });
  });
}

function payUPI(from,to,amt){
  let u=data.users.find(x=>x.name===to);
  if(!u?.upi)return alert("Creditor has no UPI");
  window.location.href=`upi://pay?pa=${u.upi}&pn=${to}&am=${amt}&cu=INR`;
  setTimeout(()=>{
    if(confirm("Payment done?")){
      data.settlements.push({from,to,amt,status:"pending",time:new Date().toLocaleString()});
      save();
    }
  },500);
}

function showConfirmations(){
  confirmations.innerHTML="";
  data.settlements
    .filter(s=>s.to===currentUser.value && s.status==="pending")
    .forEach((s,i)=>{
      confirmations.innerHTML+=`
        <div>${s.from} paid ₹${s.amt}
        <button class="small-btn" onclick="confirmReceived(${i})">Confirm</button>
        </div>`;
    });
}

function confirmReceived(i){
  data.settlements[i].status="confirmed";
  save();
}

function showHistory(){
  history.innerHTML="";
  data.settlements
    .filter(s=>s.status==="confirmed")
    .forEach(s=>{
      history.innerHTML+=`<div>${s.from} → ${s.to} ₹${s.amt} (${s.time})</div>`;
    });
}

function generateInvite(){
  inviteCode.textContent = btoa(JSON.stringify(data.group));
}

function joinGroup(){
  try{
    let g=JSON.parse(atob(joinCode.value.trim()));
    data.group=g;
    save();
    alert("Group joined");
  }catch{
    alert("Invalid code");
  }
}

save();
