/* Finishline Trading — Telegram WebApp */
(function () {
  const tg = window.Telegram && window.Telegram.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    try { tg.setHeaderColor("#0a1628"); tg.setBackgroundColor("#0c1524"); } catch (e) {}
  }

  const STORAGE = "finishline_v1";
  const ADMIN_EMAIL = "finishlinetrading@protonmail.com";
  const MIN_INVEST = 2000;

  const FUNDS = {
    fund1: {
      id: "fund1",
      name: "Fund I — Growth",
      target: 0.30,
      investorExcess: 0.30, // of excess above target
      managerExcess: 0.70,
    },
    fund2: {
      id: "fund2",
      name: "Fund II — Partnership",
      target: 0.30,
      investorExcess: 0.50,
      managerExcess: 0.50,
    },
  };

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE)) || defaultState();
    } catch {
      return defaultState();
    }
  }
  function defaultState() {
    return { users: [], session: null, applications: [], profits: [], payments: [] };
  }
  function save(s) {
    localStorage.setItem(STORAGE, JSON.stringify(s));
  }

  let state = load();
  let authMode = "signup"; // or login
  let pendingFund = null;

  // Seed admin user if missing
  if (!state.users.find((u) => u.email === ADMIN_EMAIL)) {
    state.users.push({
      id: "admin1",
      name: "Finishline Admin",
      email: ADMIN_EMAIL,
      phone: "+2348069111155",
      password: "admin123",
      role: "admin",
      createdAt: Date.now(),
    });
    save(state);
  }

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    setTimeout(() => el.classList.add("hidden"), 2800);
  }

  function uid(prefix) {
    return prefix + "_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  function currentUser() {
    if (!state.session) return null;
    return state.users.find((u) => u.id === state.session) || null;
  }

  function isAdmin(u) {
    return u && (u.role === "admin" || u.email === ADMIN_EMAIL);
  }

  function go(screen) {
    // Guard dashboard/apply
    if ((screen === "dash" || screen === "apply" || screen === "admin") && !currentUser()) {
      pendingFund = pendingFund || null;
      authMode = "signup";
      updateAuthUI();
      screen = "auth";
    }
    if (screen === "admin" && !isAdmin(currentUser())) {
      toast("Admin access only");
      screen = "dash";
    }
    $$(".screen").forEach((s) => s.classList.remove("active"));
    const el = $("#screen-" + screen);
    if (el) el.classList.add("active");
    $$(".nav-item").forEach((b) => {
      b.classList.toggle("active", b.dataset.go === screen || (screen === "apply" && b.dataset.go === "funds"));
    });
    $("#drawer").classList.add("hidden");
    if (screen === "dash") renderDash();
    if (screen === "admin") renderAdmin();
    window.scrollTo(0, 0);
  }

  function updateAuthUI() {
    $("#authTitle").textContent = authMode === "signup" ? "Sign up" : "Log in";
    $("#authHint").textContent =
      authMode === "signup"
        ? "Create an account to apply. Access is limited to investment applications only."
        : "Welcome back. Access limited to investment applications and your dashboard.";
    $("#toggleAuth").textContent = authMode === "signup" ? "Log in" : "Sign up";
    const form = $("#authForm");
    form.name.closest("label").style.display = authMode === "signup" ? "" : "none";
    form.phone.closest("label").style.display = authMode === "signup" ? "" : "none";
  }

  // Navigation
  document.body.addEventListener("click", (e) => {
    const goBtn = e.target.closest("[data-go]");
    if (goBtn) {
      e.preventDefault();
      go(goBtn.dataset.go);
    }
    const applyBtn = e.target.closest("[data-apply]");
    if (applyBtn) {
      e.preventDefault();
      pendingFund = applyBtn.dataset.apply;
      const user = currentUser();
      if (!user) {
        authMode = "signup";
        updateAuthUI();
        go("auth");
        toast("Sign up or log in to apply");
        return;
      }
      openApply(pendingFund);
    }
  });

  $("#btnMenu").onclick = () => {
    const u = currentUser();
    $("#btnLogout").style.display = u ? "" : "none";
    $("#btnAdmin").style.display = isAdmin(u) ? "" : "none";
    $("#drawer").classList.remove("hidden");
  };
  $("#btnCloseDrawer").onclick = () => $("#drawer").classList.add("hidden");
  $("#drawer").addEventListener("click", (e) => {
    if (e.target === $("#drawer")) $("#drawer").classList.add("hidden");
  });
  $("#btnLogout").onclick = () => {
    state.session = null;
    save(state);
    toast("Logged out");
    go("home");
  };
  $("#btnAdmin").onclick = () => go("admin");

  $("#toggleAuth").onclick = (e) => {
    e.preventDefault();
    authMode = authMode === "signup" ? "login" : "signup";
    updateAuthUI();
  };

  $("#authForm").onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const password = String(fd.get("password") || "");
    if (authMode === "login") {
      const user = state.users.find((u) => u.email === email && u.password === password);
      if (!user) return toast("Invalid email or password");
      state.session = user.id;
      save(state);
      toast("Welcome back, " + user.name);
      if (pendingFund) openApply(pendingFund);
      else go(isAdmin(user) ? "admin" : "dash");
      return;
    }
    // signup
    if (state.users.find((u) => u.email === email)) return toast("Email already registered — log in");
    const user = {
      id: uid("user"),
      name: String(fd.get("name") || "").trim(),
      email,
      phone: String(fd.get("phone") || "").trim(),
      password,
      role: email === ADMIN_EMAIL ? "admin" : "investor",
      createdAt: Date.now(),
    };
    state.users.push(user);
    state.session = user.id;
    save(state);
    toast("Account created");
    e.target.reset();
    if (pendingFund) openApply(pendingFund);
    else go("dash");
  };

  function openApply(fundKey) {
    const fund = FUNDS[fundKey];
    if (!fund) return;
    pendingFund = fundKey;
    $("#applyFundName").textContent = fund.name;
    $("#applyForm").reset();
    go("apply");
  }

  $("#applyForm").onsubmit = (e) => {
    e.preventDefault();
    const user = currentUser();
    if (!user) return go("auth");
    const fd = new FormData(e.target);
    const amount = Number(fd.get("amount"));
    if (!amount || amount < MIN_INVEST) {
      return toast("Minimum investment is $" + MIN_INVEST.toLocaleString());
    }
    if (!fd.get("agree")) return toast("You must accept the agreement");
    const fund = FUNDS[pendingFund];
    const app = {
      id: uid("app"),
      userId: user.id,
      fundId: fund.id,
      fundName: fund.name,
      amount,
      derivId: String(fd.get("derivId") || "").trim(),
      mt5: String(fd.get("mt5") || "").trim(),
      status: "pending", // pending | approved | rejected
      createdAt: Date.now(),
    };
    state.applications.push(app);
    save(state);
    toast("Application submitted — awaiting Finishline review");
    pendingFund = null;
    go("dash");
  };

  // Profit split math
  // Baseline investor share = target% of capital (conceptual recorded baseline)
  // Excess = max(0, realizedProfit - target*capital)
  // Investor excess + manager excess on excess only
  function splitProfit(app, realizedProfit) {
    const fund = FUNDS[app.fundId];
    const capital = app.amount;
    const baseline = capital * fund.target; // e.g. 30% of capital
    const excess = Math.max(0, realizedProfit - baseline);
    const investorBaseline = Math.min(realizedProfit, baseline);
    const investorExcess = excess * fund.investorExcess;
    const managerExcess = excess * fund.managerExcess;
    return {
      capital,
      realizedProfit,
      baseline,
      excess,
      investorBaseline,
      investorExcess,
      investorTotal: investorBaseline + investorExcess,
      managerShare: managerExcess,
    };
  }

  function renderDash() {
    const user = currentUser();
    if (!user) return;
    $("#dashUser").innerHTML = `<strong>${escapeHtml(user.name)}</strong><br/><span class="muted">${escapeHtml(user.email)} · Investor access only</span>`;

    const apps = state.applications.filter((a) => a.userId === user.id);
    const approved = apps.filter((a) => a.status === "approved");
    const profits = state.profits.filter((p) => apps.some((a) => a.id === p.appId));
    const totalInvested = approved.reduce((s, a) => s + a.amount, 0);
    const totalProfit = profits.reduce((s, p) => s + p.profit, 0);

    $("#dashStats").innerHTML = `
      <div class="stat-card"><div class="val">${apps.length}</div><div class="lbl">Applications</div></div>
      <div class="stat-card"><div class="val">$${totalInvested.toLocaleString()}</div><div class="lbl">Approved capital</div></div>
      <div class="stat-card"><div class="val">$${totalProfit.toLocaleString()}</div><div class="lbl">Realized profit</div></div>
    `;

    $("#dashApps").innerHTML = apps.length
      ? apps
          .slice()
          .reverse()
          .map(
            (a) => `
        <div class="item">
          <div class="row">
            <div class="title">${escapeHtml(a.fundName)}</div>
            <span class="badge ${a.status}">${a.status}</span>
          </div>
          <div class="meta">$${a.amount.toLocaleString()} · Deriv ${escapeHtml(a.derivId)} · ${new Date(a.createdAt).toLocaleDateString()}</div>
        </div>`
          )
          .join("")
      : `<div class="empty">No applications yet. Choose a fund to apply.</div>`;

    // Profits breakdown
    const profitHtml = profits
      .slice()
      .reverse()
      .map((p) => {
        const app = state.applications.find((a) => a.id === p.appId);
        if (!app) return "";
        const s = splitProfit(app, p.profit);
        return `
        <div class="item">
          <div class="row"><div class="title">${escapeHtml(app.fundName)}</div><span class="badge approved">Recorded</span></div>
          <div class="meta">${escapeHtml(p.note || "Period")} · Realized $${p.profit.toLocaleString()}</div>
          <div class="meta">Investor baseline: $${s.investorBaseline.toFixed(2)}</div>
          <div class="meta">Investor excess: $${s.investorExcess.toFixed(2)} · Total investor: $${s.investorTotal.toFixed(2)}</div>
          <div class="meta">Manager share: $${s.managerShare.toFixed(2)}</div>
        </div>`;
      })
      .join("");
    $("#dashProfits").innerHTML = profitHtml || `<div class="empty">No realized profit recorded yet.</div>`;

    // Payments for this user's apps
    const pays = state.payments.filter((pay) => apps.some((a) => a.id === pay.appId));
    $("#dashPayments").innerHTML = pays.length
      ? pays
          .slice()
          .reverse()
          .map((pay) => {
            const app = state.applications.find((a) => a.id === pay.appId);
            return `
          <div class="item">
            <div class="row">
              <div class="title">Manager fee · $${pay.amount.toFixed(2)}</div>
              <span class="badge ${pay.status === "paid" ? "paid" : "awaiting"}">${pay.status === "paid" ? "Paid (approved)" : "Awaiting approval"}</span>
            </div>
            <div class="meta">${escapeHtml(app ? app.fundName : "")} · ${new Date(pay.createdAt).toLocaleDateString()}</div>
          </div>`;
          })
          .join("")
      : `<div class="empty">No manager payments yet. They appear after profit is recorded, and show as Paid only after Finishline approval.</div>`;
  }

  function renderAdmin() {
    const pending = state.applications.filter((a) => a.status === "pending");
    $("#adminApps").innerHTML = pending.length
      ? pending
          .map((a) => {
            const u = state.users.find((x) => x.id === a.userId);
            return `
          <div class="item">
            <div class="row"><div class="title">${escapeHtml(a.fundName)}</div><span class="badge pending">pending</span></div>
            <div class="meta">${escapeHtml(u ? u.name : "")} · $${a.amount.toLocaleString()} · ${escapeHtml(a.derivId)}</div>
            <div class="row" style="margin-top:8px;gap:8px">
              <button class="btn primary sm" data-approve="${a.id}">Approve</button>
              <button class="btn danger sm" data-reject="${a.id}">Reject</button>
            </div>
          </div>`;
          })
          .join("")
      : `<div class="empty">No pending applications.</div>`;

    const approvedApps = state.applications.filter((a) => a.status === "approved");
    const sel = $("#profitAppSelect");
    sel.innerHTML = approvedApps.length
      ? approvedApps
          .map((a) => {
            const u = state.users.find((x) => x.id === a.userId);
            return `<option value="${a.id}">${a.fundName} · ${u ? u.name : a.userId} · $${a.amount}</option>`;
          })
          .join("")
      : `<option value="">No approved applications</option>`;

    const awaiting = state.payments.filter((p) => p.status !== "paid");
    $("#adminPays").innerHTML = awaiting.length
      ? awaiting
          .map((p) => {
            const app = state.applications.find((a) => a.id === p.appId);
            return `
          <div class="item">
            <div class="row"><div class="title">$${p.amount.toFixed(2)} manager share</div><span class="badge awaiting">awaiting</span></div>
            <div class="meta">${escapeHtml(app ? app.fundName : p.appId)}</div>
            <button class="btn primary sm" style="margin-top:8px" data-markpaid="${p.id}">Approve as Paid</button>
          </div>`;
          })
          .join("")
      : `<div class="empty">No pending manager payments.</div>`;
  }

  document.body.addEventListener("click", (e) => {
    const ap = e.target.closest("[data-approve]");
    if (ap) {
      const app = state.applications.find((a) => a.id === ap.dataset.approve);
      if (app) {
        app.status = "approved";
        save(state);
        toast("Application approved");
        renderAdmin();
      }
    }
    const rj = e.target.closest("[data-reject]");
    if (rj) {
      const app = state.applications.find((a) => a.id === rj.dataset.reject);
      if (app) {
        app.status = "rejected";
        save(state);
        toast("Application rejected");
        renderAdmin();
      }
    }
    const mp = e.target.closest("[data-markpaid]");
    if (mp) {
      const pay = state.payments.find((p) => p.id === mp.dataset.markpaid);
      if (pay) {
        pay.status = "paid";
        pay.approvedAt = Date.now();
        save(state);
        toast("Payment marked Paid (Finishline approved)");
        renderAdmin();
      }
    }
  });

  $("#profitForm").onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const appId = fd.get("appId");
    const profit = Number(fd.get("profit"));
    const note = String(fd.get("note") || "").trim();
    const app = state.applications.find((a) => a.id === appId && a.status === "approved");
    if (!app) return toast("Select an approved application");
    if (!(profit > 0)) return toast("Enter realized profit");

    const rec = {
      id: uid("profit"),
      appId: app.id,
      profit,
      note,
      createdAt: Date.now(),
    };
    state.profits.push(rec);

    const s = splitProfit(app, profit);
    // Create manager payment in awaiting status — only becomes paid after Finishline approval
    if (s.managerShare > 0) {
      state.payments.push({
        id: uid("pay"),
        appId: app.id,
        profitId: rec.id,
        amount: Number(s.managerShare.toFixed(2)),
        status: "awaiting", // awaiting | paid
        createdAt: Date.now(),
      });
    }
    save(state);
    toast("Profit recorded. Manager payment awaits Finishline approval.");
    e.target.reset();
    renderAdmin();
  };

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Telegram user prefill
  if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
    const tu = tg.initDataUnsafe.user;
    const nameInput = document.querySelector('#authForm input[name="name"]');
    if (nameInput && tu.first_name) nameInput.value = [tu.first_name, tu.last_name || ""].join(" ").trim();
  }

  updateAuthUI();
  go("home");
})();
