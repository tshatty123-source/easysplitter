let data = JSON.parse(localStorage.getItem("easySplitter")) || {
  users: [],
  groups: [],
  activeGroup: null,
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

/* GROUPS */
function createGroup() {
  let name = prompt("Group name?");
  if (!name) return;
  let group = { name, members: [], expenses: [] };
  data.groups.push(group);
  data.activeGroup = name;
  save();
}

function getGroup() {
  return data.groups.find(g => g.name === data.activeGroup);
}

/* USERS */
function loadUI() {
  currentUser.innerHTML = "";
  data.users.forEach(u => currentUser.add(new Option(u.name, u.name)));
  loadUserUPI();
}

function addUser() {
  let name = newUser.value.trim();
  if (!name || !getGroup()) return;

  if (!data.users.find(u => u.name === name)) {
    data.users.push({ name, upi: "" });
  }

  if (!getGroup().members.includes(name)) {
    getGroup().members.push(name);
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
  if (!upiInput.value.includes("@")) return alert("Invalid UPI");
  u.upi = upiInput.value.trim();
  save();
}

/* EXPENSES */
function calculateBalances() {
  let bal = {};
  let g = getGroup();
  if (!g) return bal;

  g.expenses.forEach(e => {
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
  let total = 0, w = {}, explain = "";

  getGroup().members.forEach(m => {
    let adj = 1 - ((bal[m] || 0) / 1000) * s;
    adj = Math.max(0.6, Math.min(1.4, adj));
    w[m] = adj;
    total += adj;
    if (bal[m]) explain += `${m} had previous balance\n`;
  });

  aiExplain.textContent = explain;
  let res = {};
  getGroup().members.forEach(m =>
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
        getGroup().members.map(m => [m, amt / getGroup().members.length])
      );

  getGroup().expenses.push({ paidBy: currentUser.value, splits });
  amount.value = "";
  save();
}

/* BALANCES */
function showBalances() {
  balances.innerHTML = "";
  let b = calculateBalances();
  for (let p in b) {
    balances.innerHTML += `<div>${p} ${b[p] < 0 ? "owes ₹" + (-b[p]).toFixed(2) : "gets ₹" + b[p].toFixed(2)}</div>`;
  }
}

/* SETTLEMENT */
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

/* RESET */
function resetGroup(){
  if(!confirm("Reset this group?")) return;
  let g=getGroup();
  g.expenses=[];
  data.settlements=[];
  save();
}

/* INVITE + SHARE (FIXED) */
function generateInvite(){
  let code=btoa(JSON.stringify(getGroup()));
  let link=`${location.origin}${location.pathname}?join=${code}`;
  inviteCode.textContent=link;
}

function shareInvite() {
  if (!inviteCode.textContent) generateInvite();

  let link = inviteCode.textContent;
  let message = `Join my Easy Splitter group:\n${link}`;

  if (navigator.share) {
    navigator.share({
      title: "Easy Splitter Invite",
      text: message,
      url: link
    }).catch(() => fallbackShare(message));
  } else {
    fallbackShare(message);
  }
}

function fallbackShare(message) {
  let wa = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(wa, "_blank");
  navigator.clipboard.writeText(message).catch(()=>{});
}

/* AUTO JOIN FROM LINK */
(function(){
  let p=new URLSearchParams(location.search);
  let c=p.get("join");
  if(!c)return;
  try{
    let g=JSON.parse(atob(c));
    data.groups.push(g);
    data.activeGroup=g.name;
    save();
    history.replaceState({},document.title,location.pathname);
    alert("Group joined successfully!");
  }catch{}
})();

save();
