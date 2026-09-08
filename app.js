const STORAGE_KEY = "instituto_banka_v1";

const DEFAULT_DATA = {
  version: 1,
  settings: { attendanceForStar: 5, currency: "BRL" },
  students: [],
  products: [],
  rules: [
    { id: crypto.randomUUID(), name: "Estudou a aula", amount: 10, icon: "📖", active: true },
    { id: crypto.randomUUID(), name: "Decorou uma escritura", amount: 10, icon: "📜", active: true },
    { id: crypto.randomUUID(), name: "Foi à igreja", amount: 30, icon: "⛪", active: true },
    { id: crypto.randomUUID(), name: "Convidou um amigo", amount: 50, icon: "🧑‍🤝‍🧑", active: true }
  ]
};

let data = loadData();
let currentStudentId = null;

const $ = id => document.getElementById(id);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random());

const money = value =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: data.settings.currency || "BRL"
  }).format(Number(value) || 0);

const escapeHtml = str =>
  String(str ?? "").replace(/[&<>"']/g, c => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#039;'
  }[c]));

const initials = name =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0,2)
    .map(x => x[0])
    .join("")
    .toUpperCase();

function cloneDefault() {
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (!saved) return cloneDefault();

    return normalize(saved);

  } catch(e) {
    console.error(e);
    return cloneDefault();
  }
}

function normalize(raw) {

  const d = raw || {};

  return {
    version: 1,

    settings: {
      attendanceForStar:
        Number(d.settings?.attendanceForStar) || 5,

      currency:
        d.settings?.currency || "BRL"
    },

    students:
      Array.isArray(d.students)
        ? d.students.map(s => ({
            id: s.id || uid(),
            name: s.name || "Aluno",
            balance: Number(s.balance) || 0,
            stars: Number(s.stars) || 0,
            attendance: Number(s.attendance) || 0,

            attendanceHistory:
              Array.isArray(s.attendanceHistory)
                ? s.attendanceHistory
                : [],

            history:
              Array.isArray(s.history)
                ? s.history
                : []
          }))
        : [],

    products:
      Array.isArray(d.products)
        ? d.products.map(p => ({
            id: p.id || uid(),
            name: p.name || "Item",
            price: Math.max(0, Number(p.price) || 0),
            stock: Math.max(0, Number(p.stock) || 0),
            icon: p.icon || "🎁",
            active: p.active !== false
          }))
        : [],

    rules:
      Array.isArray(d.rules)
        ? d.rules.map(r => ({
            id: r.id || uid(),
            name: r.name || "Regra",
            amount: Number(r.amount) || 0,
            icon: r.icon || "💰",
            active: r.active !== false
          }))
        : []
  };
}

function save() {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(data)
  );

  renderAll();
}

function showToast(message) {

  const t = $("toast");

  t.textContent = message;

  t.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer =
    setTimeout(
      () => t.classList.remove("show"),
      2200
    );
}

function showView(id) {

  document
    .querySelectorAll(".view")
    .forEach(v =>
      v.classList.remove("active")
    );

  $(id).classList.add("active");

  document
    .querySelectorAll(".nav-btn")
    .forEach(b =>
      b.classList.remove("active")
    );

  const nav =
    document.querySelector(
      `.nav-btn[data-go="${id}"]`
    );

  if(nav)
    nav.classList.add("active");

  window.scrollTo(0,0);

  renderAll();
}

function addHistory(
  student,
  text,
  amount,
  type
) {

  student.history.unshift({
    id: uid(),
    date: new Date().toISOString(),
    text,
    amount: Number(amount),
    type
  });

  if(student.history.length > 100)
    student.history.length = 100;
}

function changeBalance(
  student,
  amount,
  reason,
  type
) {

  amount = Number(amount);

  if(
    type === "minus" &&
    student.balance < amount
  ) {

    showToast("Saldo insuficiente.");

    return false;
  }

  student.balance =
    Math.max(
      0,
      Number(
        (
          student.balance +
          (
            type === "minus"
              ? -amount
              : amount
          )
        ).toFixed(2)
      )
    );

  addHistory(
    student,
    reason,
    amount,
    type
  );

  save();

  showToast(
    type === "minus"
      ? `Compra de ${money(amount)} registrada.`
      : `${money(amount)} adicionados.`
  );

  return true;
}

function renderDashboard() {

  $("statStudents").textContent =
    data.students.length;

  $("statMoney").textContent =
    money(
      data.students.reduce(
        (a,s) => a + s.balance,
        0
      )
    );

  $("statStars").textContent =
    data.students.reduce(
      (a,s) => a + s.stars,
      0
    );

  $("statProducts").textContent =
    data.products.length;
}

function renderStudents() {

  const q =
    ($("studentSearch").value || "")
      .toLowerCase();

  const list =
    $("studentsList");

  const students =
    data.students.filter(
      s =>
        s.name
          .toLowerCase()
          .includes(q)
    );

  if(!students.length) {

    list.innerHTML =
      '<div class="empty">Nenhum aluno encontrado.</div>';

    return;
  }

  list.innerHTML =
    students.map(s => `

      <article class="list-card">

        <div class="list-main">

          <div class="avatar">
            ${escapeHtml(initials(s.name))}
          </div>

          <div class="grow">

            <b>
              ${escapeHtml(s.name)}
            </b>

            <span class="muted">
              ${s.attendance}/${data.settings.attendanceForStar}
              presenças para a próxima ⭐
            </span>

          </div>

          <div class="money">
            ${money(s.balance)}
          </div>

        </div>

        <div
          class="balance-line"
          style="margin-top:10px"
        >

          <span class="stars">
            ⭐ ${s.stars}
          </span>

          <span class="muted">
            Presenças: ${s.attendance}
          </span>

        </div>

        <div class="card-actions">

          <button
            class="small-btn"
            onclick="openStudent('${s.id}')"
          >
            Abrir perfil
          </button>

          <button
            class="small-btn"
            onclick="editStudent('${s.id}')"
          >
            ✏️ Editar
          </button>

          <button
            class="small-btn danger"
            onclick="deleteStudent('${s.id}')"
          >
            Excluir
          </button>

        </div>

      </article>

    `).join("");
}

function renderStore() {

  const list =
    $("storeList");

  if(!data.products.length) {

    list.innerHTML =
      '<div class="empty">A loja ainda não possui itens.</div>';

    return;
  }

  list.innerHTML =
    data.products.map(p => `

      <article class="list-card">

        <div class="list-main">

          <div class="avatar">
            ${escapeHtml(p.icon)}
          </div>

          <div class="grow">

            <b>
              ${escapeHtml(p.name)}
            </b>

            <span class="muted">
              Estoque: ${p.stock} ·
              ${p.active ? "Ativo" : "Desativado"}
            </span>

          </div>

          <div class="money">
            ${money(p.price)}
          </div>

        </div>

        <div class="card-actions">

          <button
            class="small-btn"
            onclick="editProduct('${p.id}')"
          >
            ✏️ Editar
          </button>

          <button
            class="small-btn danger"
            onclick="deleteProduct('${p.id}')"
          >
            Excluir
          </button>

        </div>

      </article>

    `).join("");
}

function renderRules() {

  const list =
    $("rulesList");

  if(!data.rules.length) {

    list.innerHTML =
      '<div class="empty">Nenhuma regra cadastrada.</div>';

    return;
  }

  list.innerHTML =
    data.rules.map(r => `

      <article class="list-card">

        <div class="list-main">

          <div class="avatar">
            ${escapeHtml(r.icon)}
          </div>

          <div class="grow">

            <b>
              ${escapeHtml(r.name)}
            </b>

            <span class="muted">
              ${r.active ? "Ativa" : "Desativada"}
            </span>

          </div>

          <div class="money">
            +${money(r.amount)}
          </div>

        </div>

        <div class="card-actions">

          <button
            class="small-btn"
            onclick="editRule('${r.id}')"
          >
            ✏️ Editar
          </button>

          <button
            class="small-btn danger"
            onclick="deleteRule('${r.id}')"
          >
            Excluir
          </button>

        </div>

      </article>

    `).join("");
}

function renderAttendance() {

  const list =
    $("attendanceList");

  if(!data.students.length) {

    list.innerHTML =
      '<div class="empty">Cadastre alunos para registrar presença.</div>';

    return;
  }

  list.innerHTML =
    data.students.map(s => {

      const dots =
        Array.from(
          {
            length:
              data.settings.attendanceForStar
          },
          (_,i) =>
            `<span class="dot ${i < s.attendance ? "done" : ""}"></span>`
        ).join("");

      return `

        <article class="list-card">

          <div class="list-main">

            <div class="avatar">
              ${escapeHtml(initials(s.name))}
            </div>

            <div class="grow">

              <b>
                ${escapeHtml(s.name)}
              </b>

              <span class="muted">
                ⭐ ${s.stars} estrelas
              </span>

            </div>

            <button
              class="primary-btn"
              onclick="markAttendance('${s.id}')"
            >
              ✓ Presente
            </button>

          </div>

          <div class="dots">
            ${dots}
          </div>

        </article>

      `;

    }).join("");
}

function renderStudentDetail() {

  if(!currentStudentId)
    return;

  const s =
    data.students.find(
      x => x.id === currentStudentId
    );

  if(!s) {

    showView("studentsView");

    return;
  }

  $("detailName").textContent =
    s.name;

  $("detailBalance").textContent =
    money(s.balance);

  $("detailStars").textContent =
    `⭐ ${s.stars} estrelas · ${s.attendance}/${data.settings.attendanceForStar} presenças`;

  $("detailRules").innerHTML =
    data.rules
      .filter(r => r.active)
      .map(r => `

        <button
          class="action-btn"
          onclick="rewardStudent('${r.id}')"
        >

          <b>
            ${escapeHtml(r.icon)}
            ${escapeHtml(r.name)}
          </b>

          <small>
            +${money(r.amount)}
          </small>

        </button>

      `)
      .join("")
      ||
      '<div class="empty">Nenhuma regra ativa.</div>';

  $("detailProducts").innerHTML =
    data.products
      .filter(p => p.active)
      .map(p => {

        const disabled =
          p.stock <= 0 ||
          s.balance < p.price;

        return `

          <button
            class="action-btn ${disabled ? "disabled" : ""}"
            ${disabled ? "disabled" : ""}
            onclick="buyProduct('${p.id}')"
          >

            <b>
              ${escapeHtml(p.icon)}
              ${escapeHtml(p.name)}
            </b>

            <small>
              −${money(p.price)} ·
              ${p.stock} em estoque
            </small>

          </button>

        `;

      })
      .join("")
      ||
      '<div class="empty">Nenhum item ativo.</div>';

  $("detailHistory").innerHTML =
    s.history.length
      ? s.history.map(h => `

          <div class="history-item">

            <div>

              <b>
                ${escapeHtml(h.text)}
              </b>

              <div class="muted">
                ${new Date(h.date).toLocaleString("pt-BR")}
              </div>

            </div>

            <strong
              class="${h.type === "plus" ? "plus" : "minus"}"
            >
              ${h.type === "plus" ? "+" : "−"}
              ${money(h.amount)}
            </strong>

          </div>

        `).join("")

      : '<div class="empty">Nenhuma movimentação.</div>';
}

function renderAll() {

  renderDashboard();
  renderStudents();
  renderStore();
  renderRules();
  renderAttendance();
  renderStudentDetail();

}

function openModal(
  title,
  body,
  onSubmit
) {

  $("modalRoot").innerHTML = `

    <div
      class="modal-backdrop"
      id="modalBackdrop"
    >

      <div class="modal">

        <h3>${title}</h3>

        <form id="modalForm">

          ${body}

          <div class="modal-actions">

            <button
              type="button"
              class="secondary-btn"
              onclick="closeModal()"
            >
              Cancelar
            </button>

            <button class="primary-btn">
              Salvar
            </button>

          </div>

        </form>

      </div>

    </div>

  `;

  $("modalForm").onsubmit =
    e => {

      e.preventDefault();

      onSubmit(
        new FormData(e.target)
      );

    };

  $("modalBackdrop").addEventListener(
    "click",
    e => {

      if(
        e.target.id ===
        "modalBackdrop"
      )
        closeModal();

    }
  );
}

function closeModal() {
  $("modalRoot").innerHTML = "";
}

function addStudent() {

  openModal(
    "Novo aluno",

    `<div class="form-grid">

      <div class="field">

        <label>Nome</label>

        <input
          name="name"
          required
          autofocus
        >

      </div>

      <div class="field">

        <label>Saldo inicial</label>

        <input
          name="balance"
          type="number"
          min="0"
          step="0.01"
          value="0"
        >

      </div>

      <div class="field">

        <label>Estrelas iniciais</label>

        <input
          name="stars"
          type="number"
          min="0"
          step="1"
          value="0"
        >

      </div>

    </div>`,

    f => {

      data.students.push({

        id: uid(),

        name:
          f.get("name").trim(),

        balance:
          Number(f.get("balance")) || 0,

        stars:
          Number(f.get("stars")) || 0,

        attendance: 0,

        attendanceHistory: [],

        history: []

      });

      save();

      closeModal();

      showToast(
        "Aluno adicionado."
      );

    }
  );
}

function editStudent(id) {

  const s =
    data.students.find(
      x => x.id === id
    );

  if(!s) return;

  openModal(

    "Editar aluno",

    `<div class="form-grid">

      <div class="field">

        <label>Nome</label>

        <input
          name="name"
          required
          value="${escapeHtml(s.name)}"
        >

      </div>

      <div class="field">

        <label>Saldo</label>

        <input
          name="balance"
          type="number"
          min="0"
          step="0.01"
          value="${s.balance}"
        >

      </div>

      <div class="field">

        <label>Estrelas</label>

        <input
          name="stars"
          type="number"
          min="0"
          value="${s.stars}"
        >

      </div>

      <div class="field">

        <label>Presenças atuais</label>

        <input
          name="attendance"
          type="number"
          min="0"
          value="${s.attendance}"
        >

      </div>

    </div>`,

    f => {

      s.name =
        f.get("name").trim();

      s.balance =
        Math.max(
          0,
          Number(f.get("balance")) || 0
        );

      s.stars =
        Math.max(
          0,
          parseInt(f.get("stars")) || 0
        );

      s.attendance =
        Math.max(
          0,
          parseInt(f.get("attendance")) || 0
        );

      save();

      closeModal();

      showToast(
        "Perfil atualizado."
      );

    }
  );
}

function deleteStudent(id) {

  const s =
    data.students.find(
      x => x.id === id
    );

  if(
    confirm(
      `Excluir ${s.name}? Esta ação não pode ser desfeita.`
    )
  ) {

    data.students =
      data.students.filter(
        x => x.id !== id
      );

    if(
      currentStudentId === id
    )
      currentStudentId = null;

    save();

    showToast(
      "Aluno excluído."
    );
  }
}

function openStudent(id) {

  currentStudentId = id;

  showView(
    "studentDetailView"
  );
}

function rewardStudent(ruleId) {

  const r =
    data.rules.find(
      x => x.id === ruleId
    );

  const s =
    data.students.find(
      x => x.id === currentStudentId
    );

  if(r && s)
    changeBalance(
      s,
      r.amount,
      r.name,
      "plus"
    );
}

function buyProduct(productId) {

  const p =
    data.products.find(
      x => x.id === productId
    );

  const s =
    data.students.find(
      x => x.id === currentStudentId
    );

  if(!p || !s)
    return;

  if(p.stock <= 0) {

    showToast(
      "Item sem estoque."
    );

    return;
  }

  if(
    changeBalance(
      s,
      p.price,
      p.name,
      "minus"
    )
  ) {

    p.stock--;

    save();
  }
}

function markAttendance(id) {

  const s =
    data.students.find(
      x => x.id === id
    );

  if(!s)
    return;

  s.attendance++;

  s.attendanceHistory.unshift(
    new Date().toISOString()
  );

  if(
    s.attendance >=
    data.settings.attendanceForStar
  ) {

    s.attendance = 0;

    s.stars++;

    showToast(
      `${s.name} ganhou uma ⭐!`
    );

  } else {

    showToast(
      "Presença registrada."
    );

  }

  save();
}

function clearHistory() {

  const s =
    data.students.find(
      x => x.id === currentStudentId
    );

  if(
    s &&
    confirm(
      "Limpar o histórico deste aluno?"
    )
  ) {

    s.history = [];

    save();

    showToast(
      "Histórico limpo."
    );
  }
}

function addProduct() {

  openModal(

    "Novo item",

    `<div class="form-grid">

      <div class="field">

        <label>Nome</label>

        <input
          name="name"
          required
        >

      </div>

      <div class="field">

        <label>Ícone</label>

        <input
          name="icon"
          value="🎁"
          maxlength="4"
        >

      </div>

      <div class="field">

        <label>Preço</label>

        <input
          name="price"
          type="number"
          min="0"
          step="0.01"
          value="5"
        >

      </div>

      <div class="field">

        <label>Estoque</label>

        <input
          name="stock"
          type="number"
          min="0"
          step="1"
          value="1"
        >

      </div>

      <label class="checkbox">

        <input
          name="active"
          type="checkbox"
          checked
        >

        Item ativo

      </label>

    </div>`,

    f => {

      data.products.push({

        id: uid(),

        name:
          f.get("name").trim(),

        icon:
          f.get("icon") || "🎁",

        price:
          Math.max(
            0,
            Number(f.get("price")) || 0
          ),

        stock:
          Math.max(
            0,
            parseInt(f.get("stock")) || 0
          ),

        active:
          f.get("active") === "on"

      });

      save();

      closeModal();

      showToast(
        "Item adicionado."
      );

    }
  );
}

function editProduct(id) {

  const p =
    data.products.find(
      x => x.id === id
    );

  if(!p) return;

  openModal(

    "Editar item",

    `<div class="form-grid">

      <div class="field">

        <label>Nome</label>

        <input
          name="name"
          required
          value="${escapeHtml(p.name)}"
        >

      </div>

      <div class="field">

        <label>Ícone</label>

        <input
          name="icon"
          value="${escapeHtml(p.icon)}"
          maxlength="4"
        >

      </div>

      <div class="field">

        <label>Preço</label>

        <input
          name="price"
          type="number"
          min="0"
          step="0.01"
          value="${p.price}"
        >

      </div>

      <div class="field">

        <label>Estoque</label>

        <input
          name="stock"
          type="number"
          min="0"
          value="${p.stock}"
        >

      </div>

      <label class="checkbox">

        <input
          name="active"
          type="checkbox"
          ${p.active ? "checked" : ""}
        >

        Item ativo

      </label>

    </div>`,

    f => {

      p.name =
        f.get("name").trim();

      p.icon =
        f.get("icon") || "🎁";

      p.price =
        Math.max(
          0,
          Number(f.get("price")) || 0
        );

      p.stock =
        Math.max(
          0,
          parseInt(f.get("stock")) || 0
        );

      p.active =
        f.get("active") === "on";

      save();

      closeModal();

      showToast(
        "Item atualizado."
      );

    }
  );
}

function deleteProduct(id) {

  if(
    confirm(
      "Excluir este item da loja?"
    )
  ) {

    data.products =
      data.products.filter(
        x => x.id !== id
      );

    save();

    showToast(
      "Item excluído."
    );
  }
}

function addRule() {

  openModal(

    "Nova regra",

    `<div class="form-grid">

      <div class="field">

        <label>Nome da regra</label>

        <input
          name="name"
          required
        >

      </div>

      <div class="field">

        <label>Ícone</label>

        <input
          name="icon"
          value="💰"
          maxlength="4"
        >

      </div>

      <div class="field">

        <label>Valor</label>

        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          value="5"
        >

      </div>

      <label class="checkbox">

        <input
          name="active"
          type="checkbox"
          checked
        >

        Regra ativa

      </label>

    </div>`,

    f => {

      data.rules.push({

        id: uid(),

        name:
          f.get("name").trim(),

        icon:
          f.get("icon") || "💰",

        amount:
          Math.max(
            0,
            Number(f.get("amount")) || 0
          ),

        active:
          f.get("active") === "on"

      });

      save();

      closeModal();

      showToast(
        "Regra adicionada."
      );

    }
  );
}

function editRule(id) {

  const r =
    data.rules.find(
      x => x.id === id
    );

  if(!r) return;

  openModal(

    "Editar regra",

    `<div class="form-grid">

      <div class="field">

        <label>Nome</label>

        <input
          name="name"
          required
          value="${escapeHtml(r.name)}"
        >

      </div>

      <div class="field">

        <label>Ícone</label>

        <input
          name="icon"
          value="${escapeHtml(r.icon)}"
          maxlength="4"
        >

      </div>

      <div class="field">

        <label>Valor</label>

        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          value="${r.amount}"
        >

      </div>

      <label class="checkbox">

        <input
          name="active"
          type="checkbox"
          ${r.active ? "checked" : ""}
        >

        Regra ativa

      </label>

    </div>`,

    f => {

      r.name =
        f.get("name").trim();

      r.icon =
        f.get("icon") || "💰";

      r.amount =
        Math.max(
          0,
          Number(f.get("amount")) || 0
        );

      r.active =
        f.get("active") === "on";

      save();

      closeModal();

      showToast(
        "Regra atualizada."
      );

    }
  );
}

function deleteRule(id) {

  if(
    confirm(
      "Excluir esta regra?"
    )
  ) {

    data.rules =
      data.rules.filter(
        x => x.id !== id
      );

    save();

    showToast(
      "Regra excluída."
    );
  }
}

function attendanceSettings() {

  openModal(

    "Configurar estrelas",

    `<div class="form-grid">

      <div class="field">

        <label>
          Presenças necessárias para ganhar 1 estrela
        </label>

        <input
          name="count"
          type="number"
          min="1"
          step="1"
          value="${data.settings.attendanceForStar}"
        >

      </div>

    </div>`,

    f => {

      data.settings.attendanceForStar =
        Math.max(
          1,
          parseInt(f.get("count")) || 5
        );

      save();

      closeModal();

      showToast(
        "Configuração atualizada."
      );

    }
  );
}


/* =========================================================
   EXPORTAÇÃO DO BACKUP

   No navegador:
   -> baixa o JSON normalmente.

   No Kodular:
   -> envia o JSON através do WebViewString.

   Prefixo usado:
   INSTITUTO_BANKA_EXPORT|
   ========================================================= */

function exportBackup() {
  try {
    const payload = {
      ...data,
      exportedAt: new Date().toISOString(),
      app: "Instituto Banka"
    };

    const json = JSON.stringify(payload);
    const backup = "INSTITUTO_BANKA_BACKUP|" + btoa(
      unescape(encodeURIComponent(json))
    );

    const modal = document.createElement("div");
    modal.className = "backup-modal";

    modal.innerHTML = `
      <div class="backup-box">
        <h2>📤 Exportar Backup</h2>

        <p>
          Copie o código abaixo e guarde-o em um lugar seguro.
        </p>

        <textarea
          id="backupExportText"
          readonly
          spellcheck="false"
        ></textarea>

        <div class="backup-buttons">
          <button id="copyBackupBtn">
            📋 Copiar Backup
          </button>

          <button id="closeBackupBtn">
            Fechar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const textarea = document.getElementById("backupExportText");
    textarea.value = backup;

    document.getElementById("copyBackupBtn").onclick = async () => {
      try {
        await navigator.clipboard.writeText(backup);

        showToast("Backup copiado!");

      } catch (error) {
        textarea.focus();
        textarea.select();

        try {
          document.execCommand("copy");
          showToast("Backup copiado!");
        } catch (e) {
          showToast("Selecione e copie o backup manualmente.");
        }
      }
    };

    document.getElementById("closeBackupBtn").onclick = () => {
      modal.remove();
    };

  } catch (error) {
    console.error("Erro ao exportar backup:", error);
    showToast("Erro ao criar o backup.");
  }
}
function importBackup() {

  const modal = document.createElement("div");
  modal.className = "backup-modal";

  modal.innerHTML = `
    <div class="backup-box">
      <h2>📥 Importar Backup</h2>

      <p>
        Cole abaixo o código do backup que você exportou anteriormente.
      </p>

      <textarea
        id="backupImportText"
        placeholder="Cole o código do backup aqui..."
        spellcheck="false"
      ></textarea>

      <div class="backup-buttons">

        <button id="pasteBackupBtn">
          📋 Colar
        </button>

        <button id="importBackupBtn">
          📥 Importar
        </button>

        <button id="cancelBackupBtn">
          Cancelar
        </button>

      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const textarea = document.getElementById("backupImportText");

  document.getElementById("pasteBackupBtn").onclick = async () => {

    try {

      const text = await navigator.clipboard.readText();

      textarea.value = text;

      showToast("Backup colado!");

    } catch (error) {

      textarea.focus();

      showToast("Cole o backup manualmente.");

    }

  };


  document.getElementById("importBackupBtn").onclick = () => {

    try {

      const backup = textarea.value.trim();

      if (!backup) {
        showToast("Cole o backup primeiro.");
        return;
      }

      if (!backup.startsWith("INSTITUTO_BANKA_BACKUP|")) {
        showToast("Backup inválido.");
        return;
      }

      const encoded = backup.replace(
        "INSTITUTO_BANKA_BACKUP|",
        ""
      );

      const json = decodeURIComponent(
        escape(atob(encoded))
      );

      const importedData = JSON.parse(json);

      if (!importedData || typeof importedData !== "object") {
        throw new Error("Dados inválidos.");
      }

      if (
        !Array.isArray(importedData.students) ||
        !Array.isArray(importedData.products) ||
        !Array.isArray(importedData.rules)
      ) {
        throw new Error("Backup incompatível.");
      }

      data = importedData;

      saveData();

      modal.remove();

      showToast("Backup importado com sucesso!");

      render();

    } catch (error) {

      console.error("Erro ao importar:", error);

      showToast(
        "Não foi possível importar esse backup."
      );

    }

  };


  document.getElementById("cancelBackupBtn").onclick = () => {
    modal.remove();
  };

}

function resetData() {

  if(
    confirm(
      "ATENÇÃO: todos os alunos, saldos, regras, produtos e históricos serão apagados. Continuar?"
    )
  ) {

    if(
      confirm(
        "Tem certeza? Faça um backup antes, se necessário."
      )
    ) {

      data =
        cloneDefault();

      save();

      showView(
        "dashboardView"
      );

      showToast(
        "Dados apagados."
      );
    }
  }
}


document.addEventListener(
  "click",
  e => {

    const go =
      e.target.closest(
        "[data-go]"
      );

    if(go)
      showView(
        go.dataset.go
      );

  }
);


$("settingsBtn").onclick =
  () =>
    showView(
      "settingsView"
    );

$("navSettings").onclick =
  () =>
    showView(
      "settingsView"
    );

$("addStudentBtn").onclick =
  addStudent;

$("addProductBtn").onclick =
  addProduct;

$("addRuleBtn").onclick =
  addRule;

$("attendanceSettingsBtn").onclick =
  attendanceSettings;

$("editStudentBtn").onclick =
  () =>
    editStudent(
      currentStudentId
    );

$("clearHistoryBtn").onclick =
  clearHistory;

$("studentSearch").addEventListener(
  "input",
  renderStudents
);

$("exportBtn").onclick =
  exportBackup;

$("importBtn").onclick = openImportTextModal;

$("resetBtn").onclick =
  resetData;


renderAll();
