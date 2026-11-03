import { useEffect, useMemo, useState } from "react";
import "./App.css";

const USER_KEY = "splitledger_users";
const SESSION_KEY = "splitledger_session";
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";

const readJSON = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const makeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const userKey = (type, phone) => `splitledger_${type}_${phone}`;

function App() {
  const [users, setUsers] = useState(() => readJSON(USER_KEY, []));
  const [session, setSession] = useState(() => readJSON(SESSION_KEY, null));
  const [page, setPage] = useState("Dashboard");
  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [toast, setToast] = useState("");

  const phone = session?.phone || "";
  const [groups, setGroups] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [reminders, setReminders] = useState([]);
  // Tracks which account owns the data currently held in React state.
  const [dataOwnerPhone, setDataOwnerPhone] = useState("");

  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState("");
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseGroup, setExpenseGroup] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Food");
  const [expensePayer, setExpensePayer] = useState("");
  const [expenseSplit, setExpenseSplit] = useState("equal");
  const [filterGroup, setFilterGroup] = useState("all");
  const [settlePerson, setSettlePerson] = useState("");
  const [settleAmount, setSettleAmount] = useState("");
  const [settleNote, setSettleNote] = useState("");
  const [reminderText, setReminderText] = useState("");
  const [profileName, setProfileName] = useState("");

  useEffect(() => localStorage.setItem(USER_KEY, JSON.stringify(users)), [users]);

  useEffect(() => {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }, [session]);

  useEffect(() => {
    // Lock saving while the active account's data is being loaded.
    setDataOwnerPhone("");

    if (!phone) {
      setGroups([]);
      setExpenses([]);
      setSettlements([]);
      setReminders([]);
      setProfileName("");
      return;
    }

    const loadedGroups = readJSON(userKey("groups", phone), []);
    const loadedExpenses = readJSON(userKey("expenses", phone), []);
    const loadedSettlements = readJSON(userKey("settlements", phone), []);
    const loadedReminders = readJSON(userKey("reminders", phone), []);

    setGroups(loadedGroups);
    setExpenses(loadedExpenses);
    setSettlements(loadedSettlements);
    setReminders(loadedReminders);
    setProfileName(session?.name || "");

    // Save effects are enabled only after the matching account is loaded.
    setDataOwnerPhone(phone);
  }, [phone]);

  useEffect(() => {
    if (!phone || dataOwnerPhone !== phone) return;
    localStorage.setItem(userKey("groups", phone), JSON.stringify(groups));
  }, [groups, phone, dataOwnerPhone]);

  useEffect(() => {
    if (!phone || dataOwnerPhone !== phone) return;
    localStorage.setItem(userKey("expenses", phone), JSON.stringify(expenses));
  }, [expenses, phone, dataOwnerPhone]);

  useEffect(() => {
    if (!phone || dataOwnerPhone !== phone) return;
    localStorage.setItem(userKey("settlements", phone), JSON.stringify(settlements));
  }, [settlements, phone, dataOwnerPhone]);

  useEffect(() => {
    if (!phone || dataOwnerPhone !== phone) return;
    localStorage.setItem(userKey("reminders", phone), JSON.stringify(reminders));
  }, [reminders, phone, dataOwnerPhone]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const currentUser = users.find((user) => user.phone === phone);
  const people = useMemo(() => {
    const all = new Set([session?.name || "You"]);
    groups.forEach((group) => (group.members || []).forEach((member) => all.add(member)));
    expenses.forEach((expense) => {
      all.add(expense.paidBy);
      (expense.shares || []).forEach((share) => all.add(share.person));
    });
    return [...all].filter(Boolean);
  }, [groups, expenses, session]);

  const visibleExpenses = useMemo(
    () =>
      filterGroup === "all"
        ? expenses
        : expenses.filter((expense) => expense.groupId === filterGroup),
    [expenses, filterGroup]
  );

  const totalSpent = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  const balances = useMemo(() => {
    const net = {};
    people.forEach((person) => (net[person] = 0));
    expenses.forEach((expense) => {
      const amount = Number(expense.amount) || 0;
      const shares = expense.shares || [];
      shares.forEach((share) => {
        const value = Number(share.amount) || 0;
        net[share.person] = (net[share.person] || 0) - value;
        net[expense.paidBy] = (net[expense.paidBy] || 0) + value;
      });
    });
    settlements.forEach((item) => {
      const value = Number(item.amount) || 0;
      // A payment reduces the payer's debt and the receiver's receivable.
      net[item.from] = (net[item.from] || 0) + value;
      net[item.to] = (net[item.to] || 0) - value;
    });
    return net;
  }, [expenses, settlements, people]);

  const myBalance = balances[session?.name] || 0;
  const owedToMe = Math.max(0, myBalance);
  const iOwe = Math.max(0, -myBalance);

  function notify(message) {
    setToast(message);
  }

  function handleAuth(event) {
    event.preventDefault();
    setAuthError("");
    const cleanPhone = authPhone.trim();
    if (!/^\d{10}$/.test(cleanPhone)) {
      setAuthError("Enter a valid 10-digit phone number.");
      return;
    }
    if (authPassword.length < 4) {
      setAuthError("Password must contain at least 4 characters.");
      return;
    }

    if (authMode === "signup") {
      if (!authName.trim()) {
        setAuthError("Please enter your name.");
        return;
      }
      if (users.some((user) => user.phone === cleanPhone)) {
        setAuthError("An account with this phone number already exists.");
        return;
      }
      const newUser = {
        id: makeId(),
        name: authName.trim(),
        phone: cleanPhone,
        password: authPassword,
      };
      setUsers((previous) => [...previous, newUser]);
      setSession({ name: newUser.name, phone: newUser.phone });
      setPage("Dashboard");
    } else {
      const found = users.find(
        (user) => user.phone === cleanPhone && user.password === authPassword
      );
      if (!found) {
        setAuthError("Incorrect phone number or password.");
        return;
      }
      setSession({ name: found.name, phone: found.phone });
      setPage("Dashboard");
    }
  }

  function logout() {
    setSession(null);
    setPage("Dashboard");
    setAuthPhone("");
    setAuthPassword("");
    setAuthError("");
  }

  function addGroup(event) {
    event.preventDefault();
    if (!groupName.trim()) return;
    const members = [...new Set(
      [session.name, ...groupMembers.split(",").map((name) => name.trim()).filter(Boolean)]
    )];
    setGroups((previous) => [
      ...previous,
      { id: makeId(), name: groupName.trim(), members, createdAt: new Date().toISOString() },
    ]);
    setGroupName("");
    setGroupMembers("");
    notify("Group created successfully.");
  }

  function addExpense(event) {
    event.preventDefault();
    const amount = Number(expenseAmount);
    if (!expenseTitle.trim() || !amount || amount <= 0) {
      notify("Enter an expense description and a valid amount.");
      return;
    }
    const group = groups.find((item) => item.id === expenseGroup);
    const members = group?.members?.length ? group.members : [session.name];
    const payer = expensePayer || session.name;
    let shares;
    if (expenseSplit === "equal") {
      const each = Math.floor((amount / members.length) * 100) / 100;
      let remaining = Math.round(amount * 100) - Math.round(each * 100) * members.length;
      shares = members.map((person, index) => ({
        person,
        amount: each + (index === 0 ? remaining / 100 : 0),
      }));
    } else {
      shares = [{ person: payer, amount }];
    }
    setExpenses((previous) => [
      {
        id: makeId(),
        title: expenseTitle.trim(),
        amount,
        category: expenseCategory,
        groupId: expenseGroup || "",
        groupName: group?.name || "Personal",
        paidBy: payer,
        shares,
        date: new Date().toISOString(),
      },
      ...previous,
    ]);
    setExpenseTitle("");
    setExpenseAmount("");
    setExpenseCategory("Food");
    notify("Expense added.");
    setPage("Expenses");
  }

  function deleteExpense(id) {
    setExpenses((previous) => previous.filter((expense) => expense.id !== id));
    notify("Expense deleted.");
  }

  function addSettlement(event) {
    event.preventDefault();
    const amount = Number(settleAmount);
    if (!settlePerson || !amount || amount <= 0) {
      notify("Select a person and enter a valid amount.");
      return;
    }
    setSettlements((previous) => [
      {
        id: makeId(),
        from: session.name,
        to: settlePerson,
        amount,
        note: settleNote.trim(),
        date: new Date().toISOString(),
      },
      ...previous,
    ]);
    setSettleAmount("");
    setSettleNote("");
    notify("Payment recorded.");
    setPage("Settlement History");
  }

  function addReminder(event) {
    event.preventDefault();
    if (!reminderText.trim()) return;
    setReminders((previous) => [
      { id: makeId(), text: reminderText.trim(), done: false, date: new Date().toISOString() },
      ...previous,
    ]);
    setReminderText("");
    notify("Reminder added.");
  }

  function saveProfile(event) {
    event.preventDefault();
    const name = profileName.trim();
    if (!name) return;
    setUsers((previous) =>
      previous.map((user) => (user.phone === phone ? { ...user, name } : user))
    );
    setSession((previous) => ({ ...previous, name }));
    notify("Profile updated.");
  }

  if (session?.admin) {
    return (
      <div className="app-shell">
        <main className="main-area" style={{ marginLeft: 0 }}>
          <header className="topbar">
            <div><span className="eyebrow">SPLITLEDGER</span><h2>Admin dashboard</h2></div>
            <button className="btn btn-outline" onClick={logout}>Log out</button>
          </header>
          <section className="content">
            <div className="welcome-row"><div><h1>Admin overview</h1><p className="muted">Local records stored in this browser.</p></div></div>
            <div className="stats-grid">
              <Stat label="Registered users" value={users.length} />
              <Stat label="Groups (current browser)" value={users.reduce((n, user) => n + readJSON(userKey("groups", user.phone), []).length, 0)} />
              <Stat label="Expenses (current browser)" value={users.reduce((n, user) => n + readJSON(userKey("expenses", user.phone), []).length, 0)} />
              <Stat label="Settlements (current browser)" value={users.reduce((n, user) => n + readJSON(userKey("settlements", user.phone), []).length, 0)} />
            </div>
            <div className="panel"><h3>Registered users</h3>{users.length ? users.map((user) => <div className="list-row" key={user.id}><div className="avatar">{user.name[0]?.toUpperCase()}</div><div className="grow"><strong>{user.name}</strong><small>{user.phone}</small></div></div>) : <Empty text="No users registered yet." />}</div>
          </section>
        </main>
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  if (!session) {
    return (
      <div className="auth-shell">
        <div className="auth-header">
          <div className="brand-mark">S</div>
          <div><h2>SplitLedger</h2><p>Shared expenses, made simple.</p></div>
        </div>
        <section className="auth-card">
          <span className="eyebrow">WELCOME</span>
          <h1>{authMode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="muted">{authMode === "login" ? "Log in to manage your shared expenses." : "Create an account to start splitting expenses."}</p>
          <form className="form-stack" onSubmit={handleAuth}>
            {authMode === "signup" && <label className="field-label">Full name<input value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="Enter your name" /></label>}
            <label className="field-label">Phone number<input value={authPhone} onChange={(e) => setAuthPhone(e.target.value)} inputMode="numeric" maxLength={10} placeholder="10-digit phone number" /></label>
            <label className="field-label">Password<input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="At least 4 characters" /></label>
            {authError && <p className="text-danger">{authError}</p>}
            <button className="btn btn-primary btn-block" type="submit">{authMode === "login" ? "Log in" : "Create account"}</button>
          </form>
          <div className="auth-switch">
            <span>{authMode === "login" ? "New to SplitLedger?" : "Already have an account?"}</span>
            <button className="link-btn" onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthError(""); }}>
              {authMode === "login" ? "Create an account" : "Log in"}
            </button>
            <button className="link-btn" onClick={() => { setSession({ admin: true }); setPage("Admin"); }}>Admin access</button>
          </div>
        </section>
        <p className="auth-foot">Your demo data is stored locally in this browser.</p>
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  const navItems = [
    ["Dashboard", "▦"], ["Groups", "♧"], ["Add Expense", "+"], ["Expenses", "▤"],
    ["Balances", "₹"], ["Settle Up", "✓"], ["Settlement History", "◷"],
    ["Reminders", "♧"], ["Analytics", "▥"], ["Profile", "◎"],
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">S</div>
          <div><strong>SplitLedger</strong><small>Shared expense manager</small></div>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {navItems.map(([label, icon]) => (
            <button key={label} className={`nav-item ${page === label ? "active" : ""}`} onClick={() => setPage(label)}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-mini"><div className="avatar">{session.name?.[0]?.toUpperCase()}</div><div><strong>{session.name}</strong><small>{session.phone}</small></div></div>
          <button className="nav-item logout-link" onClick={logout}>↪ Log out</button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div><span className="eyebrow">SPLITLEDGER / WORKSPACE</span><h2>{page}</h2></div>
          <div className="top-user"><span className="status-dot" /> Signed in as <strong>{session.name}</strong></div>
        </header>

        <section className="content">
          {page === "Dashboard" && <>
            <div className="welcome-row">
              <div><span className="eyebrow">OVERVIEW</span><h1>Good to see you, {session.name.split(" ")[0]}!</h1><p className="muted">Here is your shared expense summary.</p></div>
              <button className="btn btn-primary" onClick={() => setPage("Add Expense")}>＋ Add expense</button>
            </div>
            <div className="stats-grid">
              <Stat label="Total expenses" value={money(totalSpent)} note={`${expenses.length} recorded transactions`} />
              <Stat label="Groups" value={groups.length} note="Your active groups" />
              <Stat label="You are owed" value={money(owedToMe)} note="Net amount receivable" />
              <Stat label="You owe" value={money(iOwe)} note="Net amount payable" />
            </div>
            <div className="two-col align-start">
              <div className="panel"><div className="panel-title"><h3>Recent expenses</h3><button className="link-btn" onClick={() => setPage("Expenses")}>View all</button></div>
                {expenses.slice(0, 5).length ? expenses.slice(0, 5).map((item) => <ExpenseRow key={item.id} expense={item} />) : <Empty text="No expenses yet. Add your first shared expense." />}
              </div>
              <div className="panel"><div className="panel-title"><h3>Your groups</h3><button className="link-btn" onClick={() => setPage("Groups")}>View all</button></div>
                {groups.length ? groups.slice(0, 5).map((group) => <div className="list-row" key={group.id}><div className="group-icon">♧</div><div className="grow"><strong>{group.name}</strong><small>{group.members.length} members</small></div><span className="pill">Group</span></div>) : <Empty text="Create a group to start sharing expenses." />}
              </div>
            </div>
          </>}

          {page === "Groups" && <>
            <div className="page-intro"><span className="eyebrow">PEOPLE</span><h1>Your groups</h1><p className="muted">Organise expenses with friends, family or roommates.</p></div>
            <div className="panel narrow-panel"><h3>Create a group</h3><form className="form-stack" onSubmit={addGroup}>
              <label className="field-label">Group name<input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Goa Trip" required /></label>
              <label className="field-label">Members<input value={groupMembers} onChange={(e) => setGroupMembers(e.target.value)} placeholder="Names separated by commas" /><span className="hint">You are included automatically.</span></label>
              <button className="btn btn-primary" type="submit">Create group</button>
            </form></div>
            <div className="panel"><h3>All groups <span className="count">{groups.length}</span></h3>
              {groups.length ? groups.map((group) => <div className="group-card" key={group.id}><div className="list-row"><div className="group-icon">♧</div><div className="grow"><strong>{group.name}</strong><small>Created {new Date(group.createdAt).toLocaleDateString("en-IN")}</small></div><span className="pill">{group.members.length} members</span></div><div className="member-chips">{group.members.map((member) => <span key={member}>{member}</span>)}</div></div>) : <Empty text="No groups created yet." />}
            </div>
          </>}

          {page === "Add Expense" && <>
            <div className="page-intro"><span className="eyebrow">TRANSACTION</span><h1>Add an expense</h1><p className="muted">Record a payment and split it with your group.</p></div>
            <div className="panel narrow-panel"><form className="form-stack" onSubmit={addExpense}>
              <label className="field-label">Description<input value={expenseTitle} onChange={(e) => setExpenseTitle(e.target.value)} placeholder="e.g. Dinner, groceries, cab" required /></label>
              <div className="form-grid">
                <label className="field-label">Amount (₹)<input type="number" min="0.01" step="0.01" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder="0.00" required /></label>
                <label className="field-label">Category<select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)}>{["Food", "Travel", "Shopping", "Rent", "Utilities", "Entertainment", "Other"].map((item) => <option key={item}>{item}</option>)}</select></label>
              </div>
              <label className="field-label">Group<select value={expenseGroup} onChange={(e) => setExpenseGroup(e.target.value)}><option value="">Personal / no group</option>{groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label>
              <label className="field-label">Paid by<select value={expensePayer || session.name} onChange={(e) => setExpensePayer(e.target.value)}>{people.map((person) => <option key={person}>{person}</option>)}</select></label>
              <label className="field-label">Split method<select value={expenseSplit} onChange={(e) => setExpenseSplit(e.target.value)}><option value="equal">Split equally among group members</option><option value="payer">Assign full amount to payer</option></select></label>
              <p className="hint">Equal split is calculated automatically. For a personal expense, only you are included.</p>
              <button className="btn btn-primary" type="submit">Save expense</button>
            </form></div>
          </>}

          {page === "Expenses" && <>
            <div className="page-intro"><span className="eyebrow">TRANSACTIONS</span><h1>Expense history</h1><p className="muted">Review and manage your recorded expenses.</p></div>
            <div className="toolbar"><label className="field-label compact-label">Filter by group<select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}><option value="all">All groups</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><strong>{money(visibleExpenses.reduce((sum, item) => sum + item.amount, 0))}</strong></div>
            <div className="panel">{visibleExpenses.length ? visibleExpenses.map((item) => <div className="list-row" key={item.id}><ExpenseRow expense={item} /><button className="text-danger" onClick={() => deleteExpense(item.id)}>Delete</button></div>) : <Empty text="No expenses match this filter." />}</div>
          </>}

          {page === "Balances" && <>
            <div className="page-intro"><span className="eyebrow">SETTLEMENTS</span><h1>Balances</h1><p className="muted">A positive balance means you are owed money; a negative balance means you owe money.</p></div>
            <div className="stats-grid"><Stat label="You are owed" value={money(owedToMe)} /><Stat label="You owe" value={money(iOwe)} /></div>
            <div className="panel"><h3>Member balances</h3>{people.filter((person) => person !== session.name).map((person) => <div className="balance-row" key={person}><div className="avatar">{person[0]?.toUpperCase()}</div><div className="grow"><strong>{person}</strong><small className="muted">Net balance</small></div><strong className={(balances[person] || 0) < 0 ? "negative" : (balances[person] || 0) > 0 ? "positive" : "neutral"}>{money(Math.abs(balances[person] || 0))} {(balances[person] || 0) > 0 ? "owes you" : (balances[person] || 0) < 0 ? "you owe" : "settled"}</strong></div>)}
              {people.filter((person) => person !== session.name).length === 0 && <Empty text="Add group members and expenses to see balances." />}
            </div>
          </>}

          {page === "Settle Up" && <>
            <div className="page-intro"><span className="eyebrow">PAYMENTS</span><h1>Settle up</h1><p className="muted">Record a payment made to another member.</p></div>
            <div className="panel narrow-panel"><form className="form-stack" onSubmit={addSettlement}>
              <label className="field-label">Paid to<select value={settlePerson} onChange={(e) => setSettlePerson(e.target.value)} required><option value="">Select person</option>{people.filter((person) => person !== session.name).map((person) => <option key={person}>{person}</option>)}</select></label>
              <label className="field-label">Amount (₹)<input type="number" min="0.01" step="0.01" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} placeholder="0.00" required /></label>
              <label className="field-label">Note (optional)<input value={settleNote} onChange={(e) => setSettleNote(e.target.value)} placeholder="Payment note" /></label>
              <button className="btn btn-primary" type="submit">Record payment</button>
            </form></div>
          </>}

          {page === "Settlement History" && <>
            <div className="page-intro"><span className="eyebrow">PAYMENTS</span><h1>Settlement history</h1><p className="muted">Payments recorded from your account.</p></div>
            <div className="panel">{settlements.length ? settlements.map((item) => <div className="list-row" key={item.id}><div className="group-icon">✓</div><div className="grow"><strong>{item.from} paid {item.to}</strong><small>{item.note || "Settlement"} · {new Date(item.date).toLocaleDateString("en-IN")}</small></div><strong className="amount">{money(item.amount)}</strong></div>) : <Empty text="No settlements recorded yet." />}</div>
          </>}

          {page === "Reminders" && <>
            <div className="page-intro"><span className="eyebrow">TO-DO</span><h1>Reminders</h1><p className="muted">Keep track of payments you need to follow up on.</p></div>
            <div className="panel narrow-panel"><form className="form-stack" onSubmit={addReminder}><label className="field-label">Reminder<input value={reminderText} onChange={(e) => setReminderText(e.target.value)} placeholder="e.g. Ask Rahul for trip expenses" required /></label><button className="btn btn-primary" type="submit">Add reminder</button></form></div>
            <div className="panel">{reminders.length ? reminders.map((item) => <div className="list-row" key={item.id}><input style={{ width: 17 }} type="checkbox" checked={item.done} onChange={() => setReminders((previous) => previous.map((r) => r.id === item.id ? { ...r, done: !r.done } : r))} /><div className="grow"><strong style={{ textDecoration: item.done ? "line-through" : "none" }}>{item.text}</strong><small>{new Date(item.date).toLocaleDateString("en-IN")}</small></div><button className="text-danger" onClick={() => setReminders((previous) => previous.filter((r) => r.id !== item.id))}>Remove</button></div>) : <Empty text="You have no reminders." />}</div>
          </>}

          {page === "Analytics" && <>
            <div className="page-intro"><span className="eyebrow">INSIGHTS</span><h1>Expense analytics</h1><p className="muted">A category-wise view of your recorded spending.</p></div>
            <div className="stats-grid"><Stat label="Total spent" value={money(totalSpent)} /><Stat label="Transactions" value={expenses.length} /><Stat label="Average expense" value={money(expenses.length ? totalSpent / expenses.length : 0)} /><Stat label="Categories" value={new Set(expenses.map((e) => e.category)).size} /></div>
            <div className="panel"><h3>Spending by category</h3>{Object.entries(expenses.reduce((acc, item) => { acc[item.category] = (acc[item.category] || 0) + item.amount; return acc; }, {})).sort((a, b) => b[1] - a[1]).map(([category, amount]) => <div className="category-row" key={category}><div className="list-row"><strong className="grow">{category}</strong><strong>{money(amount)}</strong></div><div className="progress"><span style={{ width: `${totalSpent ? (amount / totalSpent) * 100 : 0}%` }} /></div></div>)}{expenses.length === 0 && <Empty text="Add expenses to generate analytics." />}</div>
          </>}

          {page === "Profile" && <>
            <div className="page-intro"><span className="eyebrow">ACCOUNT</span><h1>Your profile</h1><p className="muted">Manage your local account details.</p></div>
            <div className="panel narrow-panel"><form className="form-stack" onSubmit={saveProfile}><label className="field-label">Name<input value={profileName} onChange={(e) => setProfileName(e.target.value)} required /></label><label className="field-label">Phone number<input value={session.phone} disabled /></label><button className="btn btn-primary" type="submit">Save changes</button></form></div>
          </>}
        </section>
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Stat({ label, value, note }) {
  return <div className="stat-card"><span className="stat-kicker">{label}</span><strong className="stat-value">{value}</strong>{note && <small>{note}</small>}</div>;
}

function Empty({ text }) {
  return <div className="empty-state"><div className="empty-icon">＋</div><p>{text}</p></div>;
}

function ExpenseRow({ expense }) {
  return <div className="list-row" style={{ flex: 1, minWidth: 0 }}>
    <div className="expense-icon">₹</div>
    <div className="grow"><strong>{expense.title}</strong><small>{expense.category} · {expense.groupName} · Paid by {expense.paidBy} · {new Date(expense.date).toLocaleDateString("en-IN")}</small></div>
    <strong className="amount">{money(expense.amount)}</strong>
  </div>;
}

export default App;
