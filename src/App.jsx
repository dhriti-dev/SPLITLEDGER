import { useEffect, useMemo, useState } from "react";
import "./App.css";

const USER_KEY = "splitledger_users";
const SESSION_KEY = "splitledger_session";

const readJSON = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const writeJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The app remains usable if browser storage is unavailable or full.
    console.error("Unable to save SplitLedger data in this browser.");
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

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

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
  const [paymentDues, setPaymentDues] = useState([]);
  const [monthlyBudget, setMonthlyBudget] = useState(() => 0);
  const [customShares, setCustomShares] = useState({});
  const [receiptData, setReceiptData] = useState("");
  const [dataOwnerPhone, setDataOwnerPhone] = useState("");

  const [groupName, setGroupName] = useState("");
  const [groupMemberInput, setGroupMemberInput] = useState("");
  const [groupMemberList, setGroupMemberList] = useState([]);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseGroup, setExpenseGroup] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Food");
  const [expensePayer, setExpensePayer] = useState("");
  const [expenseSplit, setExpenseSplit] = useState("equal");
  const [filterGroup, setFilterGroup] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("Food");
  const [settlePerson, setSettlePerson] = useState("");
  const [settleAmount, setSettleAmount] = useState("");
  const [settlePaymentMode, setSettlePaymentMode] = useState("UPI");
  const [settlePaymentDate, setSettlePaymentDate] = useState(
    new Date().toLocaleDateString("en-CA")
  );
  const [settleReference, setSettleReference] = useState("");
  const [settleNote, setSettleNote] = useState("");
  const [reminderText, setReminderText] = useState("");
  const [profileName, setProfileName] = useState("");
  const [duePerson, setDuePerson] = useState("");
  const [dueAmount, setDueAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueNote, setDueNote] = useState("");

  useEffect(() => writeJSON(USER_KEY, users), [users]);

  useEffect(() => {
    if (session) writeJSON(SESSION_KEY, session);
    else localStorage.removeItem(SESSION_KEY);
  }, [session]);

  useEffect(() => {
    setDataOwnerPhone("");

    if (!phone) {
      setGroups([]);
      setExpenses([]);
      setSettlements([]);
      setReminders([]);
      setProfileName("");
      return;
    }

    setGroups(readJSON(userKey("groups", phone), []));
    setExpenses(readJSON(userKey("expenses", phone), []));
    setSettlements(readJSON(userKey("settlements", phone), []));
    setReminders(readJSON(userKey("reminders", phone), []));
    setPaymentDues(readJSON(userKey("paymentDues", phone), []));
    setMonthlyBudget(Number(readJSON(userKey("monthlyBudget", phone), 0)) || 0);
    setProfileName(session?.name || "");
    setDataOwnerPhone(phone);
  }, [phone]);

  useEffect(() => {
    if (phone && dataOwnerPhone === phone) {
      writeJSON(userKey("groups", phone), groups);
    }
  }, [groups, phone, dataOwnerPhone]);

  useEffect(() => {
    if (phone && dataOwnerPhone === phone) {
      writeJSON(userKey("expenses", phone), expenses);
    }
  }, [expenses, phone, dataOwnerPhone]);

  useEffect(() => {
    if (phone && dataOwnerPhone === phone) {
      writeJSON(userKey("settlements", phone), settlements);
    }
  }, [settlements, phone, dataOwnerPhone]);

  useEffect(() => {
    if (phone && dataOwnerPhone === phone) {
      writeJSON(userKey("reminders", phone), reminders);
    }
  }, [reminders, phone, dataOwnerPhone]);
  useEffect(() => {
    if (phone && dataOwnerPhone === phone) writeJSON(userKey("paymentDues", phone), paymentDues);
  }, [paymentDues, phone, dataOwnerPhone]);

  useEffect(() => {
    if (phone && dataOwnerPhone === phone) writeJSON(userKey("monthlyBudget", phone), monthlyBudget);
  }, [monthlyBudget, phone, dataOwnerPhone]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const people = useMemo(() => {
    const all = new Set([session?.name || "You"]);
    groups.forEach((group) =>
      (group.members || []).forEach((member) => all.add(member))
    );
    expenses.forEach((expense) => {
      if (expense.paidBy) all.add(expense.paidBy);
      (expense.shares || []).forEach((share) => {
        if (share.person) all.add(share.person);
      });
    });
    settlements.forEach((item) => {
      if (item.from) all.add(item.from);
      if (item.to) all.add(item.to);
    });
    return [...all].filter(Boolean);
  }, [groups, expenses, settlements, session]);

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const monthlySpent = expenses
    .filter((item) => String(item.date || "").slice(0, 7) === currentMonthKey)
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const budgetRemaining = Math.max(0, Number(monthlyBudget || 0) - monthlySpent);

  const totalSpent = expenses.reduce(
    (sum, expense) => sum + (Number(expense.amount) || 0),
    0
  );

  const balances = useMemo(() => {
    const net = {};
    people.forEach((person) => (net[person] = 0));

    expenses.forEach((expense) => {
      const shares = expense.shares || [];
      shares.forEach((share) => {
        const value = Number(share.amount) || 0;
        net[share.person] = (net[share.person] || 0) - value;
        net[expense.paidBy] = (net[expense.paidBy] || 0) + value;
      });
    });

    settlements.forEach((item) => {
      const value = Number(item.amount) || 0;
      net[item.from] = (net[item.from] || 0) + value;
      net[item.to] = (net[item.to] || 0) - value;
    });

    return net;
  }, [expenses, settlements, people]);

  const myBalance = balances[session?.name] || 0;
  const owedToMe = Math.max(0, myBalance);
  const iOwe = Math.max(0, -myBalance);

  const visibleExpenses = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return expenses.filter((expense) => {
      const matchesGroup =
        filterGroup === "all" || expense.groupId === filterGroup;
      const matchesCategory =
        filterCategory === "all" || expense.category === filterCategory;
      const searchable = [
        expense.title,
        expense.category,
        expense.groupName,
        expense.paidBy,
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !query || searchable.includes(query);

      return matchesGroup && matchesCategory && matchesSearch;
    });
  }, [expenses, filterGroup, filterCategory, searchText]);

  const categories = [
    "Food",
    "Travel",
    "Shopping",
    "Rent",
    "Utilities",
    "Entertainment",
    "Other",
  ];

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
    setSearchText("");
  }

  function addGroup(event) {
    event.preventDefault();

    const cleanName = groupName.trim();
    if (!cleanName) return;

    if (groups.some((group) => group.name.toLowerCase() === cleanName.toLowerCase())) {
      notify("A group with this name already exists.");
      return;
    }

    const members = [
      ...new Map(
        [session.name, ...groupMemberList]
          .map((name) => name.trim())
          .filter(Boolean)
          .map((name) => [name.toLowerCase(), name])
      ).values(),
    ];

    setGroups((previous) => [
      ...previous,
      {
        id: makeId(),
        name: cleanName,
        members,
        createdAt: new Date().toISOString(),
      },
    ]);

    setGroupName("");
    setGroupMemberInput("");
    setGroupMemberList([]);
    notify("Group created successfully.");
  }

  function deleteGroup(group) {
    const linkedCount = expenses.filter((expense) => expense.groupId === group.id).length;
    const message = linkedCount
      ? `Delete "${group.name}" and its ${linkedCount} linked expense(s)? Those expenses will also be removed and balances will be recalculated. This cannot be undone.`
      : `Delete the group "${group.name}"? This cannot be undone.`;

    if (!window.confirm(message)) return;

    setGroups((previous) => previous.filter((item) => item.id !== group.id));
    setExpenses((previous) => previous.filter((item) => item.groupId !== group.id));
    if (expenseGroup === group.id) setExpenseGroup("");
    notify(`"${group.name}" deleted.`);
  }

  function clearTransactionHistory() {
    if (!expenses.length && !settlements.length) {
      notify("There is no transaction history to clear.");
      return;
    }

    const confirmed = window.confirm(
      "Clear all expenses and settlement records for this account? Groups and reminders will be kept. This cannot be undone."
    );
    if (!confirmed) return;

    setExpenses([]);
    setSettlements([]);
    setSearchText("");
    setFilterGroup("all");
    setFilterCategory("all");
    notify("Expense and settlement history cleared.");
  }

  function clearAllWorkspaceData() {
    const hasData = groups.length || expenses.length || settlements.length || reminders.length;
    if (!hasData) {
      notify("There is no workspace data to clear.");
      return;
    }

    const confirmed = window.confirm(
      "DELETE ALL WORKSPACE DATA? This will permanently clear every group, expense, settlement and reminder for this account. Your login and profile will remain. This cannot be undone."
    );
    if (!confirmed) return;

    setGroups([]);
    setExpenses([]);
    setSettlements([]);
    setReminders([]);
    setGroupName("");
    setGroupMemberInput("");
    setGroupMemberList([]);
    setExpenseTitle("");
    setExpenseAmount("");
    setExpenseGroup("");
    setSearchText("");
    setFilterGroup("all");
    setFilterCategory("all");
    setEditingExpenseId(null);
    notify("All workspace data has been cleared.");
  }

  function addExpense(event) {
    event.preventDefault();

    const amount = Number(expenseAmount);
    if (!expenseTitle.trim() || !Number.isFinite(amount) || amount <= 0) {
      notify("Enter a description and a valid amount.");
      return;
    }

    const group = groups.find((item) => item.id === expenseGroup);
    const members = group?.members?.length ? group.members : [session.name];
    const payer = expensePayer || session.name;

    let shares;
    if (expenseSplit === "equal") {
      const totalPaise = Math.round(amount * 100);
      const eachPaise = Math.floor(totalPaise / members.length);
      let remainingPaise = totalPaise - eachPaise * members.length;
      shares = members.map((person) => {
        const sharePaise = eachPaise + (remainingPaise > 0 ? 1 : 0);
        remainingPaise -= remainingPaise > 0 ? 1 : 0;
        return { person, amount: sharePaise / 100 };
      });
    } else if (expenseSplit === "custom") {
      shares = members.map((person) => ({ person, amount: Number(customShares[person]) || 0 }));
      const allocated = Math.round(shares.reduce((sum, item) => sum + item.amount, 0) * 100);
      if (allocated !== Math.round(amount * 100)) {
        notify("Custom shares must add up exactly to the total expense.");
        return;
      }
      if (shares.some((item) => item.amount < 0)) {
        notify("Share amounts cannot be negative.");
        return;
      }
    } else {
      shares = members.map((person) => ({ person, amount: person === payer ? amount : 0 }));
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
    setExpensePayer("");
    setExpenseSplit("equal");
    notify("Expense added successfully.");
    setPage("Expenses");
  }

  function handleReceiptUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("Please upload an image receipt (JPG, PNG or WEBP).");
      event.target.value = "";
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      notify("Please choose an image smaller than 4 MB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 1100 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL("image/jpeg", 0.68);
        if (compressed.length > 950000) {
          notify("Receipt image is still too large after compression. Choose a smaller image.");
          return;
        }
        setReceiptData(compressed);
        notify("Receipt attached and compressed.");
      };
      image.onerror = () => notify("Unable to process this receipt image.");
      image.src = String(reader.result || "");
    };
    reader.onerror = () => notify("Unable to read this receipt.");
    reader.readAsDataURL(file);
  }

  function exportPdfReport() {
    const rows = expenses.map((item) => `
      <tr><td>${new Date(item.date).toLocaleDateString("en-IN")}</td>
      <td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.category)}</td>
      <td>${escapeHtml(item.groupName || "Personal")}</td><td>${escapeHtml(item.paidBy)}</td>
      <td>${money(item.amount)}</td></tr>`).join("");
    const settlementRows = settlements.map((item) => `
      <tr><td>${item.paymentDate || new Date(item.date).toLocaleDateString("en-IN")}</td>
      <td>${escapeHtml(item.from)} → ${escapeHtml(item.to)}</td><td>${money(item.amount)}</td>
      <td>${escapeHtml(item.paymentMode || "—")}</td></tr>`).join("");
    const report = window.open("", "_blank");
    if (!report) {
      notify("Allow pop-ups to generate the PDF report.");
      return;
    }
    report.document.write(`<!doctype html><html><head><title>SplitLedger Expense Report</title>
      <style>body{font:14px Arial,sans-serif;padding:32px;color:#222}h1{color:#35276f}
      table{border-collapse:collapse;width:100%;margin:14px 0 28px}th,td{border:1px solid #ddd;padding:9px;text-align:left}
      th{background:#f1efff}.summary{display:flex;gap:24px;margin:20px 0}.summary div{padding:14px;background:#f6f5ff}
      @media print{button{display:none}}</style></head><body>
      <h1>SplitLedger — Expense Report</h1><p>Account: ${escapeHtml(session.name)} · Generated: ${new Date().toLocaleString("en-IN")}</p>
      <div class="summary"><div><b>Total expenses</b><br>${money(totalSpent)}</div>
      <div><b>Transactions</b><br>${expenses.length}</div><div><b>Settlements</b><br>${settlements.length}</div></div>
      <h2>Expense details</h2><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Group</th><th>Paid by</th><th>Amount</th></tr></thead><tbody>${rows || "<tr><td colspan='6'>No expenses</td></tr>"}</tbody></table>
      <h2>Settlement history</h2><table><thead><tr><th>Date</th><th>Payment</th><th>Amount</th><th>Mode</th></tr></thead><tbody>${settlementRows || "<tr><td colspan='4'>No settlements</td></tr>"}</tbody></table>
      <script>window.onload=()=>window.print()<\/script></body></html>`);
    report.document.close();
  }

  function addPaymentDue(event) {
    event.preventDefault();
    const person = duePerson;
    if (!person || !dueDate || !(Number(dueAmount) > 0)) {
      notify("Select a person, amount and due date.");
      return;
    }
    setPaymentDues((previous) => [{
      id: makeId(), person, amount: Number(dueAmount), dueDate,
      note: dueNote.trim(), done: false, createdAt: new Date().toISOString()
    }, ...previous]);
    setDuePerson("");
    setDueAmount("");
    setDueDate("");
    setDueNote("");
    notify("Payment due date saved.");
  }

  function startEditExpense(expense) {
    setEditingExpenseId(expense.id);
    setEditTitle(expense.title || "");
    setEditCategory(expense.category || "Other");
  }

  function saveExpenseDetails(id) {
    if (!editTitle.trim()) {
      notify("Expense description cannot be empty.");
      return;
    }

    setExpenses((previous) =>
      previous.map((expense) =>
        expense.id === id
          ? { ...expense, title: editTitle.trim(), category: editCategory }
          : expense
      )
    );

    setEditingExpenseId(null);
    notify("Expense details updated.");
  }

  function deleteExpense(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this expense? This cannot be undone."
    );
    if (!confirmed) return;

    setExpenses((previous) => previous.filter((expense) => expense.id !== id));
    notify("Expense deleted.");
  }

  function exportExpenses() {
    if (!expenses.length) {
      notify("There are no expenses to export.");
      return;
    }

    const headers = [
      "Date",
      "Description",
      "Category",
      "Group",
      "Paid By",
      "Amount (INR)",
    ];

    const rows = visibleExpenses.map((expense) => [
      new Date(expense.date).toLocaleDateString("en-IN"),
      expense.title,
      expense.category,
      expense.groupName,
      expense.paidBy,
      Number(expense.amount || 0).toFixed(2),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "splitledger-expenses.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    notify("Expense report downloaded.");
  }

  function addSettlement(event) {
    event.preventDefault();

    const amount = Number(settleAmount);
    if (!settlePerson || !Number.isFinite(amount) || amount <= 0) {
      notify("Select a person and enter a valid amount.");
      return;
    }

    if (!settlePaymentDate) {
      notify("Please select the payment date.");
      return;
    }

    setSettlements((previous) => [
      {
        id: makeId(),
        from: session.name,
        to: settlePerson,
        amount,
        paymentMode: settlePaymentMode,
        paymentDate: settlePaymentDate,
        reference: settleReference.trim(),
        note: settleNote.trim(),
        date: new Date().toISOString(),
      },
      ...previous,
    ]);

    setSettleAmount("");
    setSettlePaymentMode("UPI");
    setSettlePaymentDate(new Date().toLocaleDateString("en-CA"));
    setSettleReference("");
    setSettleNote("");
    notify("Payment recorded successfully.");
    setPage("Settlement History");
  }

  function addReminder(event) {
    event.preventDefault();
    if (!reminderText.trim()) return;

    setReminders((previous) => [
      {
        id: makeId(),
        text: reminderText.trim(),
        done: false,
        date: new Date().toISOString(),
      },
      ...previous,
    ]);

    setReminderText("");
    notify("Reminder added.");
  }

  function saveProfile(event) {
    event.preventDefault();

    const newName = profileName.trim();
    const oldName = session.name;

    if (!newName) {
      notify("Name cannot be empty.");
      return;
    }

    if (newName === oldName) {
      notify("No profile changes to save.");
      return;
    }

    setUsers((previous) =>
      previous.map((user) =>
        user.phone === phone ? { ...user, name: newName } : user
      )
    );

    // Keep the renamed person consistent in existing groups and transactions.
    setGroups((previous) =>
      previous.map((group) => ({
        ...group,
        members: (group.members || []).map((member) =>
          member === oldName ? newName : member
        ),
      }))
    );

    setExpenses((previous) =>
      previous.map((expense) => ({
        ...expense,
        paidBy: expense.paidBy === oldName ? newName : expense.paidBy,
        shares: (expense.shares || []).map((share) => ({
          ...share,
          person: share.person === oldName ? newName : share.person,
        })),
      }))
    );

    setSettlements((previous) =>
      previous.map((item) => ({
        ...item,
        from: item.from === oldName ? newName : item.from,
        to: item.to === oldName ? newName : item.to,
      }))
    );

    setSession((previous) => ({ ...previous, name: newName }));
    notify("Profile and related records updated.");
  }

  if (session?.admin) {
    const groupCount = users.reduce(
      (count, user) =>
        count + readJSON(userKey("groups", user.phone), []).length,
      0
    );
    const expenseCount = users.reduce(
      (count, user) =>
        count + readJSON(userKey("expenses", user.phone), []).length,
      0
    );
    const settlementCount = users.reduce(
      (count, user) =>
        count + readJSON(userKey("settlements", user.phone), []).length,
      0
    );

    return (
      <div className="app-shell">
        <main className="main-area" style={{ marginLeft: 0 }}>
          <header className="topbar">
            <div>
              <span className="eyebrow">SPLITLEDGER</span>
              <h2>Admin dashboard</h2>
            </div>
            <button className="btn btn-outline" onClick={logout}>Log out</button>
          </header>
          <section className="content">
            <div className="welcome-row">
              <div>
                <h1>Admin overview</h1>
                <p className="muted">Demo records stored in this browser.</p>
              </div>
            </div>
            <div className="stats-grid">
              <Stat label="Registered users" value={users.length} />
              <Stat label="Groups" value={groupCount} />
              <Stat label="Expenses" value={expenseCount} />
              <Stat label="Settlements" value={settlementCount} />
            </div>
            <div className="panel">
              <h3>Registered users</h3>
              {users.length ? users.map((user) => (
                <div className="list-row" key={user.id}>
                  <div className="avatar">{user.name?.[0]?.toUpperCase()}</div>
                  <div className="grow">
                    <strong>{user.name}</strong>
                    <small>{user.phone}</small>
                  </div>
                </div>
              )) : <Empty text="No users registered yet." />}
            </div>
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
          <div>
            <h2>SplitLedger</h2>
            <p>Shared expenses, made simple.</p>
          </div>
        </div>

        <section className="auth-card">
          <span className="eyebrow">WELCOME</span>
          <h1>{authMode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="muted">
            {authMode === "login"
              ? "Log in to manage your shared expenses."
              : "Create an account to start splitting expenses."}
          </p>

          <form className="form-stack" onSubmit={handleAuth}>
            {authMode === "signup" && (
              <label className="field-label">
                Full name
                <input
                  value={authName}
                  onChange={(event) => setAuthName(event.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </label>
            )}

            <label className="field-label">
              Phone number
              <input
                value={authPhone}
                onChange={(event) => setAuthPhone(event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit phone number"
                required
              />
            </label>

            <label className="field-label">
              Password
              <input
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder="At least 4 characters"
                required
              />
            </label>

            {authError && <p className="text-danger">{authError}</p>}

            <button className="btn btn-primary btn-block" type="submit">
              {authMode === "login" ? "Log in" : "Create account"}
            </button>
          </form>

          <div className="auth-switch">
            <span>
              {authMode === "login"
                ? "New to SplitLedger?"
                : "Already have an account?"}
            </span>
            <button
              className="link-btn"
              onClick={() => {
                setAuthMode(authMode === "login" ? "signup" : "login");
                setAuthError("");
              }}
            >
              {authMode === "login" ? "Create an account" : "Log in"}
            </button>
            <button
              className="link-btn"
              onClick={() => {
                setSession({ admin: true });
                setPage("Admin");
              }}
            >
              Admin access (demo)
            </button>
          </div>
        </section>

        <p className="auth-foot">
          Demo data is stored locally in this browser.
        </p>
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  const navItems = [
    ["Dashboard", "▦"],
    ["Groups", "♧"],
    ["Add Expense", "+"],
    ["Expenses", "▤"],
    ["Balances", "₹"],
    ["Settle Up", "✓"],
    ["Settlement History", "◷"],
    ["Reminders", "♧"],
    ["Payment Due Dates", "◷"],
    ["Analytics", "▥"],
    ["Profile", "◎"],
  ];

  const selectedGroup = groups.find((group) => group.id === expenseGroup);
  const payerOptions = selectedGroup?.members?.length
    ? selectedGroup.members
    : [session.name];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">S</div>
          <div>
            <strong>SplitLedger</strong>
            <small>Shared expense manager</small>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav>
          {navItems.map(([label, icon]) => (
            <button
              key={label}
              className={`nav-item ${page === label ? "active" : ""}`}
              onClick={() => setPage(label)}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="user-mini">
            <div className="avatar">{session.name?.[0]?.toUpperCase()}</div>
            <div>
              <strong>{session.name}</strong>
              <small>{session.phone}</small>
            </div>
          </div>
          <button className="nav-item logout-link" onClick={logout}>
            ↪ Log out
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">SPLITLEDGER / WORKSPACE</span>
            <h2>{page}</h2>
          </div>
          <div className="top-user">
            <span className="status-dot" />
            Signed in as <strong>{session.name}</strong>
          </div>
        </header>

        <section className="content">
          {page === "Dashboard" && (
            <>
              <div className="welcome-row">
                <div>
                  <span className="eyebrow">OVERVIEW</span>
                  <h1>Good to see you, {session.name.split(" ")[0]}!</h1>
                  <p className="muted">Here is your shared expense summary.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setPage("Add Expense")}>
                  ＋ Add expense
                </button>
              </div>

              <div className="stats-grid">
                <Stat label="Total expenses" value={money(totalSpent)} note={`${expenses.length} recorded transactions`} />
                <Stat label="Groups" value={groups.length} note="Your active groups" />
                <Stat label="You are owed" value={money(owedToMe)} note="Net amount receivable" />
                <Stat label="You owe" value={money(iOwe)} note="Net amount payable" />
              </div>

              <div className="two-col align-start">
                <div className="panel">
                  <div className="panel-title">
                    <h3>Recent expenses</h3>
                    <button className="link-btn" onClick={() => setPage("Expenses")}>View all</button>
                  </div>
                  {expenses.length
                    ? expenses.slice(0, 5).map((item) => (
                        <ExpenseRow key={item.id} expense={item} />
                      ))
                    : <Empty text="No expenses yet. Add your first shared expense." />}
                </div>

                <div className="panel">
                  <div className="panel-title">
                    <h3>Your groups</h3>
                    <button className="link-btn" onClick={() => setPage("Groups")}>View all</button>
                  </div>
                  {groups.length
                    ? groups.slice(0, 5).map((group) => (
                        <div className="list-row" key={group.id}>
                          <div className="group-icon">♧</div>
                          <div className="grow">
                            <strong>{group.name}</strong>
                            <small>{group.members.length} members</small>
                          </div>
                          <span className="pill">Group</span>
                        </div>
                      ))
                    : <Empty text="Create a group to start sharing expenses." />}
                </div>
              </div>
            </>
          )}

          {page === "Groups" && (
            <>
              <div className="page-intro">
                <span className="eyebrow">PEOPLE</span>
                <h1>Your groups</h1>
                <p className="muted">Organise expenses with friends, family or roommates.</p>
              </div>

              <div className="panel narrow-panel">
                <h3>Create a group</h3>
                <form className="form-stack" onSubmit={addGroup}>
                  <label className="field-label">
                    Group name
                    <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="e.g. Goa Trip" required />
                  </label>
                  <div className="field-label">
                    Members
                    <div className="member-entry-row">
                      <input
                        value={groupMemberInput}
                        onChange={(event) => setGroupMemberInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            const cleanName = groupMemberInput.trim();
                            if (cleanName && ![session.name, ...groupMemberList].some(
                              (name) => name.toLowerCase() === cleanName.toLowerCase()
                            )) {
                              setGroupMemberList((previous) => [...previous, cleanName]);
                            }
                            setGroupMemberInput("");
                          }
                        }}
                        placeholder="Enter a member name"
                      />
                      <button
                        className="btn btn-outline add-member-btn"
                        type="button"
                        onClick={() => {
                          const cleanName = groupMemberInput.trim();
                          if (!cleanName) {
                            notify("Enter a member name first.");
                            return;
                          }
                          if ([session.name, ...groupMemberList].some(
                            (name) => name.toLowerCase() === cleanName.toLowerCase()
                          )) {
                            notify("That member is already in the group.");
                            return;
                          }
                          setGroupMemberList((previous) => [...previous, cleanName]);
                          setGroupMemberInput("");
                        }}
                        aria-label="Add group member"
                      >
                        + Add
                      </button>
                    </div>
                    <div className="member-chips member-entry-chips">
                      <span className="member-chip-you">{session.name} (You)</span>
                      {groupMemberList.map((member) => (
                        <span className="member-chip-edit" key={member}>
                          {member}
                          <button
                            type="button"
                            onClick={() => setGroupMemberList((previous) => previous.filter((name) => name !== member))}
                            aria-label={`Remove ${member}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <span className="hint">Add each member separately using the + Add button.</span>
                  </div>
                  <button className="btn btn-primary" type="submit">Create group</button>
                </form>
              </div>

              <div className="panel">
                <h3>All groups <span className="count">{groups.length}</span></h3>
                {groups.length
                  ? groups.map((group) => (
                      <div className="group-card" key={group.id}>
                        <div className="list-row">
                          <div className="group-icon">♧</div>
                          <div className="grow">
                            <strong>{group.name}</strong>
                            <small>Created {new Date(group.createdAt).toLocaleDateString("en-IN")}</small>
                          </div>
                          <span className="pill">{group.members.length} members</span>
                          <button
                            className="btn btn-danger-outline"
                            type="button"
                            onClick={() => deleteGroup(group)}
                          >
                            Delete group
                          </button>
                        </div>
                        <div className="member-chips">
                          {group.members.map((member) => <span key={member}>{member}</span>)}
                        </div>
                      </div>
                    ))
                  : <Empty text="No groups created yet." />}
              </div>
            </>
          )}

          {page === "Add Expense" && (
            <>
              <div className="page-intro">
                <span className="eyebrow">TRANSACTION</span>
                <h1>Add an expense</h1>
                <p className="muted">Record a payment and split it with your group.</p>
              </div>

              <div className="panel narrow-panel">
                <form className="form-stack" onSubmit={addExpense}>
                  <label className="field-label">
                    Description
                    <input value={expenseTitle} onChange={(event) => setExpenseTitle(event.target.value)} placeholder="e.g. Dinner, groceries, cab" required />
                  </label>

                  <div className="form-grid">
                    <label className="field-label">
                      Amount (₹)
                      <input type="number" min="0.01" step="0.01" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} placeholder="0.00" required />
                    </label>
                    <label className="field-label">
                      Category
                      <select value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value)}>
                        {categories.map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </label>
                  </div>

                  <label className="field-label">
                    Group
                    <select
                      value={expenseGroup}
                      onChange={(event) => {
                        setExpenseGroup(event.target.value);
                        setExpensePayer("");
                      }}
                    >
                      <option value="">Personal / no group</option>
                      {groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}
                    </select>
                  </label>

                  <label className="field-label">
                    Paid by
                    <select value={expensePayer || session.name} onChange={(event) => setExpensePayer(event.target.value)}>
                      {payerOptions.map((person) => <option key={person}>{person}</option>)}
                    </select>
                  </label>

                  <label className="field-label">
                    Split method
                    <select value={expenseSplit} onChange={(event) => setExpenseSplit(event.target.value)}>
                      <option value="equal">Split equally among group members</option>
                      <option value="payer">Payer bears the full expense</option>
                      <option value="custom">Custom amount per member</option>
                    </select>
                  </label>

                  {expenseSplit === "custom" && (
                    <div className="custom-share-box">
                      <strong>Enter each member's share</strong>
                      {payerOptions.map((person) => (
                        <label className="field-label" key={person}>
                          {person} (₹)
                          <input type="number" min="0" step="0.01" value={customShares[person] ?? ""} onChange={(event) => setCustomShares((previous) => ({ ...previous, [person]: event.target.value }))} placeholder="0.00" required />
                        </label>
                      ))}
                      <small className="hint">Total allocated: {money(Object.values(customShares).reduce((sum, value) => sum + (Number(value) || 0), 0))}. Must match the expense amount exactly.</small>
                    </div>
                  )}

                  <label className="field-label">
                    Attach receipt (optional, image up to 2 MB)
                    <input type="file" accept="image/*" onChange={handleReceiptUpload} />
                    {receiptData && <img src={receiptData} alt="Receipt preview" className="receipt-preview" />}
                  </label>

                  <p className="hint">
                    Equal split distributes the amount across the selected group's members.
                    Choose payer bears the full expense when nobody else shares the cost.
                  </p>
                  <button className="btn btn-primary" type="submit">Save expense</button>
                </form>
              </div>
            </>
          )}

          {page === "Expenses" && (
            <>
              <div className="page-intro">
                <span className="eyebrow">TRANSACTIONS</span>
                <h1>Expense history</h1>
                <p className="muted">Search, filter, edit or export your recorded expenses.</p>
              </div>

              <div className="panel">
                <div className="toolbar" style={{ alignItems: "end", flexWrap: "wrap" }}>
                  <label className="field-label" style={{ flex: "1 1 220px" }}>
                    Search expenses
                    <input
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="Search description, group or payer..."
                    />
                  </label>
                  <label className="field-label compact-label">
                    Filter by group
                    <select value={filterGroup} onChange={(event) => setFilterGroup(event.target.value)}>
                      <option value="all">All groups</option>
                      {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                    </select>
                  </label>
                  <label className="field-label compact-label">
                    Category
                    <select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)}>
                      <option value="all">All categories</option>
                      {categories.map((category) => <option key={category}>{category}</option>)}
                    </select>
                  </label>
                  <button className="btn btn-outline" onClick={exportExpenses}>↓ Export CSV</button>\n                  <button className="btn btn-outline" onClick={exportPdfReport}>PDF report</button>
                </div>

                <div className="toolbar">
                  <span className="muted small">
                    Showing {visibleExpenses.length} of {expenses.length} expenses
                  </span>
                  <strong>
                    {money(visibleExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0))}
                  </strong>
                </div>

                {visibleExpenses.length ? (
                  visibleExpenses.map((item) => (
                    <div className="list-row" key={item.id} style={{ alignItems: "center", flexWrap: "wrap" }}>
                      {editingExpenseId === item.id ? (
                        <div className="grow form-stack" style={{ minWidth: "220px" }}>
                          <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} aria-label="Expense description" />
                          <select value={editCategory} onChange={(event) => setEditCategory(event.target.value)} aria-label="Expense category">
                            {categories.map((category) => <option key={category}>{category}</option>)}
                          </select>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <button className="btn btn-primary" onClick={() => saveExpenseDetails(item.id)}>Save</button>
                            <button className="btn btn-outline" onClick={() => setEditingExpenseId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <ExpenseRow expense={item} />
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <button className="btn btn-outline" onClick={() => startEditExpense(item)}>Edit</button>
                            <button className="text-danger" onClick={() => deleteExpense(item.id)}>Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <Empty text="No expenses match your search or filters." />
                )}
              </div>
            </>
          )}

          {page === "Balances" && (
            <>
              <div className="page-intro">
                <span className="eyebrow">SETTLEMENTS</span>
                <h1>Balances</h1>
                <p className="muted">A positive balance means you are owed money; a negative balance means you owe money.</p>
              </div>

              <div className="stats-grid">
                <Stat label="You are owed" value={money(owedToMe)} />
                <Stat label="You owe" value={money(iOwe)} />
              </div>

              <div className="panel">
                <h3>Member balances</h3>
                {people.filter((person) => person !== session.name).map((person) => (
                  <div className="balance-row" key={person}>
                    <div className="avatar">{person[0]?.toUpperCase()}</div>
                    <div className="grow">
                      <strong>{person}</strong>
                      <small className="muted">Net balance</small>
                    </div>
                    <strong className={(balances[person] || 0) < 0 ? "negative" : (balances[person] || 0) > 0 ? "positive" : "neutral"}>
                      {money(Math.abs(balances[person] || 0))}{" "}
                      {(balances[person] || 0) > 0 ? "owes you" : (balances[person] || 0) < 0 ? "you owe" : "settled"}
                    </strong>
                  </div>
                ))}
                {people.filter((person) => person !== session.name).length === 0 && (
                  <Empty text="Add group members and expenses to see balances." />
                )}
              </div>
            </>
          )}

          {page === "Settle Up" && (
            <>
              <div className="page-intro">
                <span className="eyebrow">PAYMENTS</span>
                <h1>Settle up</h1>
                <p className="muted">Record a payment made to another member.</p>
              </div>

              <div className="panel narrow-panel">
                <form className="form-stack" onSubmit={addSettlement}>
                  <label className="field-label">
                    Paid to
                    <select value={settlePerson} onChange={(event) => setSettlePerson(event.target.value)} required>
                      <option value="">Select person</option>
                      {people.filter((person) => person !== session.name).map((person) => (
                        <option key={person}>{person}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field-label">
                    Amount (₹)
                    <input type="number" min="0.01" step="0.01" value={settleAmount} onChange={(event) => setSettleAmount(event.target.value)} placeholder="0.00" required />
                  </label>
                  <div className="form-grid">
                    <label className="field-label">
                      Payment mode
                      <select value={settlePaymentMode} onChange={(event) => setSettlePaymentMode(event.target.value)}>
                        <option>UPI</option>
                        <option>Cash</option>
                        <option>Bank transfer</option>
                        <option>Debit card</option>
                        <option>Credit card</option>
                        <option>Other</option>
                      </select>
                    </label>
                    <label className="field-label">
                      Payment date
                      <input
                        type="date"
                        value={settlePaymentDate}
                        max={new Date().toLocaleDateString("en-CA")}
                        onChange={(event) => setSettlePaymentDate(event.target.value)}
                        required
                      />
                    </label>
                  </div>
                  <label className="field-label">
                    Transaction reference (optional)
                    <input value={settleReference} onChange={(event) => setSettleReference(event.target.value)} placeholder="UPI ID / transaction reference" />
                  </label>
                  <label className="field-label">
                    Note (optional)
                    <input value={settleNote} onChange={(event) => setSettleNote(event.target.value)} placeholder="Add a short payment note" />
                  </label>
                  <p className="hint">Record the payment method and date for your own settlement history. This does not process an actual payment.</p>
                  <button className="btn btn-primary" type="submit">Record payment</button>
                </form>
              </div>
            </>
          )}

          {page === "Settlement History" && (
            <>
              <div className="page-intro">
                <span className="eyebrow">PAYMENTS</span>
                <h1>Settlement history</h1>
                <p className="muted">Payments recorded from your account.</p>
              </div>
              <div className="panel">
                {settlements.length
                  ? settlements.map((item) => (
                      <div className="list-row" key={item.id}>
                        <div className="group-icon">✓</div>
                        <div className="grow">
                          <strong>{item.from} paid {item.to}</strong>
                          <small>
                            {item.paymentMode || "Payment mode not specified"} ·{" "}
                            {item.paymentDate
                              ? new Date(`${item.paymentDate}T00:00:00`).toLocaleDateString("en-IN")
                              : new Date(item.date).toLocaleDateString("en-IN")}
                          </small>
                          {item.reference && <small>Reference: {item.reference}</small>}
                          {item.note && <small>Note: {item.note}</small>}
                        </div>
                        <strong className="amount">{money(item.amount)}</strong>
                      </div>
                    ))
                  : <Empty text="No settlements recorded yet." />}
              </div>
            </>
          )}

          {page === "Reminders" && (
            <>
              <div className="page-intro">
                <span className="eyebrow">TO-DO</span>
                <h1>Reminders</h1>
                <p className="muted">Keep track of payments you need to follow up on.</p>
              </div>

              <div className="panel narrow-panel">
                <form className="form-stack" onSubmit={addReminder}>
                  <label className="field-label">
                    Reminder
                    <input value={reminderText} onChange={(event) => setReminderText(event.target.value)} placeholder="e.g. Ask Rahul for trip expenses" required />
                  </label>
                  <button className="btn btn-primary" type="submit">Add reminder</button>
                </form>
              </div>

              <div className="panel">
                {reminders.length
                  ? reminders.map((item) => (
                      <div className="list-row" key={item.id}>
                        <input
                          style={{ width: 17 }}
                          type="checkbox"
                          checked={item.done}
                          onChange={() => setReminders((previous) => previous.map((reminder) =>
                            reminder.id === item.id ? { ...reminder, done: !reminder.done } : reminder
                          ))}
                        />
                        <div className="grow">
                          <strong style={{ textDecoration: item.done ? "line-through" : "none" }}>{item.text}</strong>
                          <small>{new Date(item.date).toLocaleDateString("en-IN")}</small>
                        </div>
                        <button
                          className="text-danger"
                          onClick={() => {
                            if (window.confirm("Remove this reminder?")) {
                              setReminders((previous) => previous.filter((reminder) => reminder.id !== item.id));
                            }
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  : <Empty text="You have no reminders." />}
              </div>
            </>
          )}

          {page === "Payment Due Dates" && (
            <>
              <div className="page-intro"><span className="eyebrow">PAYMENT TRACKING</span><h1>Payment due dates</h1><p className="muted">Track expected payments and mark them when received.</p></div>
              <div className="panel narrow-panel">
                <form className="form-stack" onSubmit={addPaymentDue}>
                  <label className="field-label">Person
                    <select value={duePerson} onChange={(event) => setDuePerson(event.target.value)} required>
                      <option value="">Select person</option>{people.filter((person) => person !== session.name).map((person) => <option key={person}>{person}</option>)}
                    </select>
                  </label>
                  <div className="form-grid">
                    <label className="field-label">Amount (₹)<input type="number" min="0.01" step="0.01" value={dueAmount} onChange={(event) => setDueAmount(event.target.value)} required /></label>
                    <label className="field-label">Due date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required /></label>
                  </div>
                  <label className="field-label">Note (optional)<input value={dueNote} onChange={(event) => setDueNote(event.target.value)} placeholder="e.g. Electricity bill share" /></label>
                  <button className="btn btn-primary" type="submit">Add payment due</button>
                </form>
              </div>
              <div className="panel">
                {paymentDues.length ? paymentDues.map((due) => {
                  const overdue = !due.done && due.dueDate < new Date().toLocaleDateString("en-CA");
                  return <div className="list-row" key={due.id}>
                    <div className="grow"><strong>{due.person} · {money(due.amount)}</strong><small>Due {new Date(`${due.dueDate}T00:00:00`).toLocaleDateString("en-IN")}{due.note ? ` · ${due.note}` : ""}</small>
                    <span className={due.done ? "positive" : overdue ? "negative" : "neutral"}>{due.done ? "Paid" : overdue ? "Overdue" : "Upcoming"}</span></div>
                    {!due.done && <button className="btn btn-outline" onClick={() => setPaymentDues((old) => old.map((item) => item.id === due.id ? { ...item, done: true, paidAt: new Date().toISOString() } : item))}>Mark paid</button>}
                    <button className="text-danger" onClick={() => { if (window.confirm("Delete this due date?")) setPaymentDues((old) => old.filter((item) => item.id !== due.id)); }}>Delete</button>
                  </div>;
                }) : <Empty text="No payment due dates added yet." />}
              </div>
            </>
          )}

          {page === "Analytics" && (
            <>
              <div className="page-intro">
                <span className="eyebrow">INSIGHTS</span>
                <h1>Expense analytics</h1>
                <p className="muted">A category-wise view of your recorded spending.</p>
              </div>

              <div className="panel narrow-panel">
                <span className="eyebrow">MONTHLY PLANNING</span>
                <h3>Monthly budget</h3>
                <form className="form-stack" onSubmit={(event) => { event.preventDefault(); notify("Monthly budget updated."); }}>
                  <label className="field-label">Monthly spending limit (₹)
                    <input type="number" min="0" step="0.01" value={monthlyBudget || ""} onChange={(event) => setMonthlyBudget(Number(event.target.value) || 0)} placeholder="Set your monthly budget" />
                  </label>
                </form>
                <div className="budget-summary">
                  <div><small>Spent this month</small><strong>{money(monthlySpent)}</strong></div>
                  <div><small>Remaining</small><strong>{money(budgetRemaining)}</strong></div>
                </div>
                <div className="progress"><span style={{ width: `${monthlyBudget > 0 ? Math.min(100, monthlySpent / monthlyBudget * 100) : 0}%` }} /></div>
                <p className="hint">{monthlyBudget > 0 ? `${Math.round(monthlySpent / monthlyBudget * 100)}% of your monthly budget used.` : "Set a budget to track monthly spending."}</p>
                {monthlyBudget > 0 && monthlySpent >= monthlyBudget * .8 && <p className="budget-warning">{monthlySpent >= monthlyBudget ? "You have reached or exceeded your monthly budget." : "You have used at least 80% of your monthly budget."}</p>}
              </div>

              <div className="panel">
                <div className="panel-title"><h3>Reports</h3><button className="btn btn-outline" onClick={exportPdfReport}>Download / Print PDF report</button></div>
                <p className="hint">Choose “Save as PDF” in your browser's print dialog.</p>
              </div>

              <div className="stats-grid">
                <Stat label="Total spent" value={money(totalSpent)} />
                <Stat label="Transactions" value={expenses.length} />
                <Stat label="Average expense" value={money(expenses.length ? totalSpent / expenses.length : 0)} />
                <Stat label="Categories" value={new Set(expenses.map((expense) => expense.category)).size} />
              </div>

              <div className="panel">
                <h3>Spending by category</h3>
                {Object.entries(
                  expenses.reduce((accumulator, item) => {
                    accumulator[item.category] = (accumulator[item.category] || 0) + Number(item.amount || 0);
                    return accumulator;
                  }, {})
                )
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => (
                    <div className="category-row" key={category}>
                      <div className="list-row">
                        <strong className="grow">{category}</strong>
                        <strong>{money(amount)}</strong>
                      </div>
                      <div className="progress">
                        <span style={{ width: `${totalSpent ? (amount / totalSpent) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                {expenses.length === 0 && <Empty text="Add expenses to generate analytics." />}
              </div>
            </>
          )}

          {page === "Profile" && (
            <>
              <div className="page-intro">
                <span className="eyebrow">ACCOUNT</span>
                <h1>Your profile</h1>
                <p className="muted">Manage your local account details.</p>
              </div>

              <div className="panel narrow-panel">
                <form className="form-stack" onSubmit={saveProfile}>
                  <label className="field-label">
                    Name
                    <input value={profileName} onChange={(event) => setProfileName(event.target.value)} required />
                  </label>
                  <label className="field-label">
                    Phone number
                    <input value={session.phone} disabled />
                  </label>
                  <button className="btn btn-primary" type="submit">Save changes</button>
                </form>
              </div>

              <div className="panel narrow-panel data-management-panel">
                <span className="eyebrow">DATA MANAGEMENT</span>
                <h3>Manage previous data</h3>
                <p className="muted">
                  Clear old records when you want to start fresh. These actions affect only this account in this browser.
                </p>
                <div className="data-counts">
                  <span>{groups.length} groups</span>
                  <span>{expenses.length} expenses</span>
                  <span>{settlements.length} settlements</span>
                  <span>{reminders.length} reminders</span>
                  <span>{paymentDues.length} due dates</span>
                </div>
                <div className="form-stack">
                  <div>
                    <strong className="danger-action-title">Clear transaction history</strong>
                    <p className="hint">Deletes all expenses and settlement records. Your groups and reminders remain.</p>
                    <button
                      className="btn btn-danger-outline"
                      type="button"
                      onClick={clearTransactionHistory}
                      disabled={!expenses.length && !settlements.length}
                    >
                      Clear expenses and settlements
                    </button>
                  </div>
                  <div className="danger-zone">
                    <strong className="danger-action-title">Clear all workspace data</strong>
                    <p className="hint">Deletes all groups, expenses, settlements and reminders. Your account and profile remain.</p>
                    <button
                      className="btn btn-danger"
                      type="button"
                      onClick={clearAllWorkspaceData}
                      disabled={!groups.length && !expenses.length && !settlements.length && !reminders.length}
                    >
                      Clear all previous data
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function Stat({ label, value, note }) {
  return (
    <div className="stat-card">
      <span className="stat-kicker">{label}</span>
      <strong className="stat-value">{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">＋</div>
      <p>{text}</p>
    </div>
  );
}

function ExpenseRow({ expense }) {
  return (
    <div className="list-row" style={{ flex: 1, minWidth: 0 }}>
      <div className="expense-icon">₹</div>
      {expense.receipt && <a href={expense.receipt} target="_blank" rel="noreferrer"><img src={expense.receipt} alt="Receipt" className="receipt-thumb" /></a>}
      <div className="grow">
        <strong>{expense.title}</strong>
        <small>
          {expense.category} · {expense.groupName} · Paid by {expense.paidBy} ·{" "}
          {new Date(expense.date).toLocaleDateString("en-IN")}
        </small>
      </div>
      <strong className="amount">{money(expense.amount)}</strong>
    </div>
  );
}

export default App;
