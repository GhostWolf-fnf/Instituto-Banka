const STORAGE_KEY = "instituto_banka_v1";

const uid = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
};

const DEFAULT_DATA = {
  students: [],
  products: [],
  rules: [
    {id:uid(),name:"Presença",description:"Participar da aula",value:5},
    {id:uid(),name:"Estudo das escrituras",description:"Estudar as escrituras",value:10},
    {id:uid(),name:"Memorizar escritura",description:"Memorizar uma escritura",value:15},
    {id:uid(),name:"Ir à igreja",description:"Participar da reunião",value:10},
    {id:uid(),name:"Convidar amigo",description:"Convidar um amigo para o Instituto",value:20}
  ],
  attendanceGoal:5
};

let data = load();
let currentStudentId = null;

const $ = id => document.getElementById(id);

function cloneDefault(){
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function load(){
  try{
    const saved = localStorage.getItem(STORAGE_KEY);
    if(saved) return normalize(JSON.parse(saved));
  }catch(e){}
  return cloneDefault();
}

function normalize(d){
  const base = cloneDefault();
  d = d || {};

  return {
    students:Array.isArray(d.students) ? d.students : base.students,
    products:Array.isArray(d.products) ? d.products : base.products,
    rules:Array.isArray(d.rules) ? d.rules : base.rules,
    attendanceGoal:Number(d.attendanceGoal) || 5
  };
}

function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderAll();
}

function money(value){
  return "₿ " + Number(value || 0).toFixed(2);
}

function escapeHtml(text){
  return String(text ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function showToast(message){
  const el = $("toast");
  if(!el) return;

  el.textContent = message;
  el.classList.add("show");

  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    el.classList.remove("show");
  },2500);
}

function showView(id){
  document.querySelectorAll(".view").forEach(v => {
    v.classList.remove("active");
  });

  const view = $(id);
  if(view) view.classList.add("active");

  renderAll();
}

function addHistory(student, type, description, value){
  if(!student.history) student.history = [];

  student.history.unshift({
    id:uid(),
    date:new Date().toISOString(),
    type,
    description,
    value:Number(value || 0)
  });
}

function getStudent(id){
  return data.students.find(s => s.id === id);
}

function addMoney(student, value, description){
  value = Number(value) || 0;
  student.balance = Number(student.balance || 0) + value;
  addHistory(student,"reward",description,value);
}

function removeMoney(student, value, description){
  value = Number(value) || 0;
  student.balance = Math.max(0,Number(student.balance || 0) - value);
  addHistory(student,"purchase",description,-value);
}

function openModal(title, body){
  const root = $("modalRoot");
  if(!root) return;

  root.innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal">
        <h2>${title}</h2>
        ${body}
      </div>
    </div>
  `;

  root.style.display = "block";
}

function closeModal(){
  const root = $("modalRoot");
  if(root){
    root.innerHTML = "";
    root.style.display = "none";
  }
}

function addStudent(){
  openModal("Novo aluno",`
    <div class="field">
      <label>Nome</label>
      <input id="studentName" placeholder="Nome do aluno">
    </div>
    <div class="field">
      <label>Turma</label>
      <input id="studentClass" placeholder="Turma">
    </div>
    <div class="modal-actions">
      <button onclick="closeModal()">Cancelar</button>
      <button onclick="saveStudent()">Salvar</button>
    </div>
  `);
}

function saveStudent(){
  const name = $("studentName")?.value.trim();
  const studentClass = $("studentClass")?.value.trim();

  if(!name){
    showToast("Digite o nome do aluno.");
    return;
  }

  data.students.push({
    id:uid(),
    name,
    className:studentClass,
    balance:0,
    stars:0,
    attendance:0,
    history:[]
  });

  save();
  closeModal();
  showToast("Aluno adicionado.");
}

function editStudent(id){
  const s = getStudent(id);
  if(!s) return;

  openModal("Editar aluno",`
    <div class="field">
      <label>Nome</label>
      <input id="studentName" value="${escapeHtml(s.name)}">
    </div>
    <div class="field">
      <label>Turma</label>
      <input id="studentClass" value="${escapeHtml(s.className || "")}">
    </div>
    <div class="modal-actions">
      <button onclick="closeModal()">Cancelar</button>
      <button onclick="updateStudent('${id}')">Salvar</button>
    </div>
  `);
}

function updateStudent(id){
  const s = getStudent(id);
  if(!s) return;

  const name = $("studentName")?.value.trim();
  if(!name){
    showToast("Digite o nome.");
    return;
  }

  s.name = name;
  s.className = $("studentClass")?.value.trim() || "";

  save();
  closeModal();
  showToast("Aluno atualizado.");
}

function deleteStudent(id){
  const s = getStudent(id);
  if(!s) return;

  if(!confirm(`Excluir ${s.name}?`)) return;

  data.students = data.students.filter(x => x.id !== id);

  if(currentStudentId === id){
    currentStudentId = null;
  }

  save();
  showToast("Aluno excluído.");
}

function openStudent(id){
  currentStudentId = id;
  showView("studentView");
}

function addProduct(){
  openModal("Novo produto",`
    <div class="field">
      <label>Nome</label>
      <input id="productName" placeholder="Nome do produto">
    </div>
    <div class="field">
      <label>Preço</label>
      <input id="productPrice" type="number" min="0" step="0.01">
    </div>
    <div class="field">
      <label>Estoque</label>
      <input id="productStock" type="number" min="0" step="1">
    </div>
    <div class="modal-actions">
      <button onclick="closeModal()">Cancelar</button>
      <button onclick="saveProduct()">Salvar</button>
    </div>
  `);
}

function saveProduct(){
  const name = $("productName")?.value.trim();
  const price = Number($("productPrice")?.value || 0);
  const stock = Number($("productStock")?.value || 0);

  if(!name){
    showToast("Digite o nome.");
    return;
  }

  data.products.push({
    id:uid(),
    name,
    price,
    stock
  });

  save();
  closeModal();
  showToast("Produto adicionado.");
}

function editProduct(id){
  const p = data.products.find(x => x.id === id);
  if(!p) return;

  openModal("Editar produto",`
    <div class="field">
      <label>Nome</label>
      <input id="productName" value="${escapeHtml(p.name)}">
    </div>
    <div class="field">
      <label>Preço</label>
      <input id="productPrice" type="number" min="0" step="0.01" value="${p.price}">
    </div>
    <div class="field">
      <label>Estoque</label>
      <input id="productStock" type="number" min="0" value="${p.stock}">
    </div>
    <div class="modal-actions">
      <button onclick="closeModal()">Cancelar</button>
      <button onclick="updateProduct('${id}')">Salvar</button>
    </div>
  `);
}

function updateProduct(id){
  const p = data.products.find(x => x.id === id);
  if(!p) return;

  p.name = $("productName")?.value.trim() || p.name;
  p.price = Number($("productPrice")?.value || 0);
  p.stock = Number($("productStock")?.value || 0);

  save();
  closeModal();
  showToast("Produto atualizado.");
}

function deleteProduct(id){
  if(!confirm("Excluir este produto?")) return;

  data.products = data.products.filter(x => x.id !== id);
  save();
  showToast("Produto excluído.");
                             }
function buyProduct(id){
  const p = data.products.find(x => x.id === id);
  if(!p) return;

  if(p.stock <= 0){
    showToast("Produto sem estoque.");
    return;
  }

  if(!currentStudentId){
    showToast("Selecione um aluno.");
    return;
  }

  const s = getStudent(currentStudentId);
  if(!s) return;

  if(Number(s.balance || 0) < Number(p.price || 0)){
    showToast("Saldo insuficiente.");
    return;
  }

  removeMoney(s,p.price,`Compra: ${p.name}`);
  p.stock--;

  save();
  showToast(`${p.name} comprado.`);
}

function markAttendance(id){
  const s = getStudent(id);
  if(!s) return;

  s.attendance = Number(s.attendance || 0) + 1;

  const goal = Number(data.attendanceGoal || 5);

  if(s.attendance >= goal){
    s.attendance = 0;
    s.stars = Number(s.stars || 0) + 1;

    addHistory(
      s,
      "star",
      "Meta de presença alcançada",
      0
    );

    showToast(`${s.name} ganhou 1 estrela!`);
  }else{
    showToast("Presença registrada.");
  }

  save();
}

function rewardStudent(studentId,ruleId){
  const s = getStudent(studentId);
  const r = data.rules.find(x => x.id === ruleId);

  if(!s || !r) return;

  addMoney(
    s,
    r.value,
    r.name
  );

  save();

  showToast(
    `${s.name} recebeu ${money(r.value)}.`
  );
}

function addRule(){
  openModal("Nova recompensa",`
    <div class="field">
      <label>Nome</label>
      <input id="ruleName" placeholder="Nome da atividade">
    </div>

    <div class="field">
      <label>Descrição</label>
      <input id="ruleDescription" placeholder="Descrição">
    </div>

    <div class="field">
      <label>Valor</label>
      <input id="ruleValue" type="number" min="0" step="0.01">
    </div>

    <div class="modal-actions">
      <button onclick="closeModal()">Cancelar</button>
      <button onclick="saveRule()">Salvar</button>
    </div>
  `);
}

function saveRule(){
  const name = $("ruleName")?.value.trim();
  const description = $("ruleDescription")?.value.trim();
  const value = Number($("ruleValue")?.value || 0);

  if(!name){
    showToast("Digite o nome.");
    return;
  }

  data.rules.push({
    id:uid(),
    name,
    description,
    value
  });

  save();
  closeModal();
  showToast("Recompensa adicionada.");
}

function editRule(id){
  const r = data.rules.find(x => x.id === id);
  if(!r) return;

  openModal("Editar recompensa",`
    <div class="field">
      <label>Nome</label>
      <input id="ruleName" value="${escapeHtml(r.name)}">
    </div>

    <div class="field">
      <label>Descrição</label>
      <input id="ruleDescription" value="${escapeHtml(r.description || "")}">
    </div>

    <div class="field">
      <label>Valor</label>
      <input id="ruleValue" type="number" min="0" step="0.01" value="${r.value}">
    </div>

    <div class="modal-actions">
      <button onclick="closeModal()">Cancelar</button>
      <button onclick="updateRule('${id}')">Salvar</button>
    </div>
  `);
}

function updateRule(id){
  const r = data.rules.find(x => x.id === id);
  if(!r) return;

  r.name = $("ruleName")?.value.trim() || r.name;
  r.description = $("ruleDescription")?.value.trim() || "";
  r.value = Number($("ruleValue")?.value || 0);

  save();
  closeModal();
  showToast("Recompensa atualizada.");
}

function deleteRule(id){
  if(!confirm("Excluir esta recompensa?")) return;

  data.rules = data.rules.filter(x => x.id !== id);

  save();
  showToast("Recompensa excluída.");
}

function editAttendanceGoal(){
  openModal("Meta de presença",`
    <div class="field">
      <label>Presenças necessárias para ganhar 1 estrela</label>
      <input
        id="attendanceGoal"
        type="number"
        min="1"
        value="${data.attendanceGoal}"
      >
    </div>

    <div class="modal-actions">
      <button onclick="closeModal()">Cancelar</button>
      <button onclick="saveAttendanceGoal()">Salvar</button>
    </div>
  `);
}

function saveAttendanceGoal(){
  const value = Number($("attendanceGoal")?.value || 1);

  data.attendanceGoal = Math.max(1,value);

  save();
  closeModal();

  showToast("Meta atualizada.");
}

function addManualMoney(studentId){
  const s = getStudent(studentId);
  if(!s) return;

  openModal("Adicionar dinheiro",`
    <div class="field">
      <label>Valor</label>
      <input id="manualMoney" type="number" min="0" step="0.01">
    </div>

    <div class="field">
      <label>Motivo</label>
      <input id="manualReason" placeholder="Motivo da recompensa">
    </div>

    <div class="modal-actions">
      <button onclick="closeModal()">Cancelar</button>
      <button onclick="saveManualMoney('${studentId}')">Adicionar</button>
    </div>
  `);
}

function saveManualMoney(studentId){
  const s = getStudent(studentId);
  if(!s) return;

  const value = Number($("manualMoney")?.value || 0);
  const reason = $("manualReason")?.value.trim() || "Recompensa extra";

  if(value <= 0){
    showToast("Digite um valor válido.");
    return;
  }

  addMoney(s,value,reason);

  save();
  closeModal();

  showToast("Dinheiro adicionado.");
}

function addStar(studentId){
  const s = getStudent(studentId);
  if(!s) return;

  s.stars = Number(s.stars || 0) + 1;

  addHistory(
    s,
    "star",
    "Estrela adicionada manualmente",
    0
  );

  save();

  showToast("Estrela adicionada.");
}

function removeStar(studentId){
  const s = getStudent(studentId);
  if(!s) return;

  if(Number(s.stars || 0) <= 0){
    showToast("O aluno não possui estrelas.");
    return;
  }

  s.stars--;

  addHistory(
    s,
    "star-remove",
    "Estrela removida",
    0
  );

  save();

  showToast("Estrela removida.");
    }
function renderDashboard(){
  const el = $("dashboardView");
  if(!el) return;

  const totalStudents = data.students.length;
  const totalMoney = data.students.reduce(
    (sum,s) => sum + Number(s.balance || 0),0
  );
  const totalProducts = data.products.length;

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Instituto Banka</h1>
        <p>Controle da turma</p>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <strong>${totalStudents}</strong>
        <span>Alunos</span>
      </div>

      <div class="stat-card">
        <strong>${money(totalMoney)}</strong>
        <span>Dinheiro em circulação</span>
      </div>

      <div class="stat-card">
        <strong>${totalProducts}</strong>
        <span>Produtos</span>
      </div>

      <div class="stat-card">
        <strong>${data.rules.length}</strong>
        <span>Recompensas</span>
      </div>
    </div>

    <div class="section-header">
      <h2>Alunos</h2>
      <button onclick="addStudent()">+ Aluno</button>
    </div>

    <div class="student-list">
      ${
        data.students.length
        ?
        data.students.map(s => `
          <div class="student-card">
            <div onclick="openStudent('${s.id}')" class="student-main">
              <div class="student-avatar">
                ${escapeHtml((s.name || "?").charAt(0).toUpperCase())}
              </div>

              <div>
                <strong>${escapeHtml(s.name)}</strong>
                <small>
                  ${escapeHtml(s.className || "Sem turma")}
                </small>
              </div>
            </div>

            <div class="student-money">
              ${money(s.balance)}
            </div>
          </div>
        `).join("")
        :
        `<div class="empty-state">
          Nenhum aluno cadastrado.
        </div>`
      }
    </div>
  `;
}

function renderStudentDetail(){
  const el = $("studentView");
  if(!el) return;

  const s = getStudent(currentStudentId);

  if(!s){
    el.innerHTML = `
      <div class="empty-state">
        Aluno não encontrado.
      </div>
    `;
    return;
  }

  const goal = Number(data.attendanceGoal || 5);
  const attendance = Number(s.attendance || 0);
  const progress = Math.min(100,(attendance / goal) * 100);

  el.innerHTML = `
    <div class="page-header">
      <button onclick="showView('dashboardView')">
        ← Voltar
      </button>

      <div class="student-header">
        <h1>${escapeHtml(s.name)}</h1>
        <p>${escapeHtml(s.className || "Sem turma")}</p>
      </div>

      <div class="header-actions">
        <button onclick="editStudent('${s.id}')">Editar</button>
        <button onclick="deleteStudent('${s.id}')">Excluir</button>
      </div>
    </div>

    <div class="balance-card">
      <span>Saldo atual</span>
      <strong>${money(s.balance)}</strong>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <strong>${s.stars || 0}</strong>
        <span>⭐ Estrelas</span>
      </div>

      <div class="stat-card">
        <strong>${attendance}/${goal}</strong>
        <span>Presenças</span>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <h2>Presença</h2>
        <button onclick="markAttendance('${s.id}')">
          + Presença
        </button>
      </div>

      <div class="progress">
        <div
          class="progress-bar"
          style="width:${progress}%"
        ></div>
      </div>

      <p>${attendance} de ${goal} presenças</p>
    </div>

    <div class="section-card">
      <div class="section-header">
        <h2>Estrelas</h2>

        <div>
          <button onclick="addStar('${s.id}')">+1</button>
          <button onclick="removeStar('${s.id}')">-1</button>
        </div>
      </div>

      <div class="stars-display">
        ${"⭐".repeat(Number(s.stars || 0)) || "Nenhuma estrela"}
      </div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <h2>Recompensas</h2>
        <button onclick="addManualMoney('${s.id}')">
          + Dinheiro
        </button>
      </div>

      <div class="rule-list">
        ${
          data.rules.map(r => `
            <div class="rule-card">
              <div>
                <strong>${escapeHtml(r.name)}</strong>
                <small>
                  ${escapeHtml(r.description || "")}
                </small>
              </div>

              <button
                onclick="rewardStudent('${s.id}','${r.id}')"
              >
                +${money(r.value)}
              </button>
            </div>
          `).join("")
        }
      </div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <h2>Histórico</h2>
      </div>

      <div class="history-list">
        ${
          s.history && s.history.length
          ?
          s.history.map(h => `
            <div class="history-item">
              <div>
                <strong>
                  ${escapeHtml(h.description || "")}
                </strong>

                <small>
                  ${new Date(h.date).toLocaleString("pt-BR")}
                </small>
              </div>

              <span class="${h.value >= 0 ? "positive" : "negative"}">
                ${h.value > 0 ? "+" : ""}
                ${money(h.value)}
              </span>
            </div>
          `).join("")
          :
          `<div class="empty-state">
            Nenhuma movimentação.
          </div>`
        }
      </div>
    </div>
  `;
}

function renderStore(){
  const el = $("storeView");
  if(!el) return;

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Loja</h1>
        <p>Produtos disponíveis</p>
      </div>

      <button onclick="addProduct()">+ Produto</button>
    </div>

    <div class="product-grid">
      ${
        data.products.length
        ?
        data.products.map(p => `
          <div class="product-card">
            <div class="product-info">
              <h3>${escapeHtml(p.name)}</h3>

              <strong>
                ${money(p.price)}
              </strong>

              <small>
                Estoque: ${p.stock}
              </small>
            </div>

            <div class="product-actions">
              <button
                onclick="buyProduct('${p.id}')"
                ${p.stock <= 0 ? "disabled" : ""}
              >
                Comprar
              </button>

              <button onclick="editProduct('${p.id}')">
                Editar
              </button>

              <button onclick="deleteProduct('${p.id}')">
                Excluir
              </button>
            </div>
          </div>
        `).join("")
        :
        `<div class="empty-state">
          Nenhum produto cadastrado.
        </div>`
      }
    </div>
  `;
}

function renderRules(){
  const el = $("rulesView");
  if(!el) return;

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Recompensas</h1>
        <p>Atividades que dão dinheiro</p>
      </div>

      <button onclick="addRule()">+ Recompensa</button>
    </div>

    <div class="section-card">
      <div class="section-header">
        <div>
          <h2>Meta de presença</h2>
          <p>
            ${data.attendanceGoal} presenças = 1 estrela
          </p>
        </div>

        <button onclick="editAttendanceGoal()">
          Editar
        </button>
      </div>
    </div>

    <div class="rule-list">
      ${
        data.rules.map(r => `
          <div class="rule-card">
            <div>
              <strong>${escapeHtml(r.name)}</strong>

              <small>
                ${escapeHtml(r.description || "")}
              </small>

              <b>${money(r.value)}</b>
            </div>

            <div>
              <button onclick="editRule('${r.id}')">
                Editar
              </button>

              <button onclick="deleteRule('${r.id}')">
                Excluir
              </button>
            </div>
          </div>
        `).join("")
      }
    </div>
  `;
}

function renderSettings(){
  const el = $("settingsView");
  if(!el) return;

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Configurações</h1>
        <p>Dados do Instituto Banka</p>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <div>
          <h2>Backup</h2>
          <p>
            Exporte ou importe os dados usando copiar e colar.
          </p>
        </div>
      </div>

      <div class="settings-buttons">
        <button onclick="exportBackup()">
          Exportar backup
        </button>

        <button onclick="openImportTextModal()">
          Importar backup
        </button>
      </div>
    </div>

    <div class="section-card danger-zone">
      <h2>Apagar dados</h2>

      <p>
        Apaga todos os alunos, produtos, recompensas,
        estrelas e históricos deste dispositivo.
      </p>

      <button onclick="resetData()">
        Apagar todos os dados
      </button>
    </div>
  `;
}

function renderAll(){
  renderDashboard();
  renderStudentDetail();
  renderStore();
  renderRules();
  renderSettings();
}

function createBackupText(){
  const payload = {
    ...data,
    exportedAt:new Date().toISOString(),
    app:"Instituto Banka",
    backupVersion:1
  };

  return "IBK1|" + JSON.stringify(payload);
}
function openExportModal(){
  const backup = createBackupText();

  openModal("Exportar backup",`
    <p>
      Copie todo o código abaixo e guarde em um local seguro.
    </p>

    <textarea
      id="backupText"
      readonly
      style="
        width:100%;
        min-height:260px;
        box-sizing:border-box;
        font-size:12px;
        resize:vertical;
      "
    >${escapeHtml(backup)}</textarea>

    <div class="modal-actions">
      <button onclick="closeModal()">
        Fechar
      </button>

      <button onclick="copyBackup()">
        Copiar backup
      </button>
    </div>
  `);

  setTimeout(() => {
    const textarea = $("backupText");
    if(textarea){
      textarea.focus();
      textarea.select();
    }
  },100);
}

async function copyBackup(){
  const textarea = $("backupText");

  if(!textarea){
    showToast("Backup não encontrado.");
    return;
  }

  const text = textarea.value;

  try{
    if(
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ){
      await navigator.clipboard.writeText(text);
    }else{
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
    }

    showToast("Backup copiado!");
  }catch(e){
    textarea.focus();
    textarea.select();

    try{
      document.execCommand("copy");
      showToast("Backup copiado!");
    }catch(error){
      showToast("Selecione o texto e copie manualmente.");
    }
  }
}

function openImportTextModal(){
  openModal("Importar backup",`
    <p>
      Cole aqui o backup que você exportou anteriormente.
    </p>

    <textarea
      id="backupImportText"
      placeholder="Cole o backup aqui..."
      style="
        width:100%;
        min-height:260px;
        box-sizing:border-box;
        font-size:12px;
        resize:vertical;
      "
    ></textarea>

    <div class="modal-actions">
      <button onclick="closeModal()">
        Cancelar
      </button>

      <button onclick="importBackupText()">
        Importar
      </button>
    </div>
  `);

  setTimeout(() => {
    const textarea = $("backupImportText");
    if(textarea) textarea.focus();
  },100);
}

function decodeBase64Utf8(encoded){
  try{
    const binary = atob(encoded);
    let percent = "";

    for(let i = 0; i < binary.length; i++){
      percent += "%" +
        binary.charCodeAt(i)
        .toString(16)
        .padStart(2,"0");
    }

    return decodeURIComponent(percent);
  }catch(e){
    try{
      return atob(encoded);
    }catch(error){
      return "";
    }
  }
}

function importBackupText(text){
  text = String(text || "").trim();

  if(!text){
    showToast("Cole um backup primeiro.");
    return;
  }

  let jsonText = text;

  try{

    /*
      Formato novo:
      IBK1|{JSON}
    */
    if(jsonText.startsWith("IBK1|")){
      jsonText = jsonText.slice(5);
    }

    /*
      Formato antigo:
      INSTITUTO_BANKA_BACKUP|base64
    */
    else if(
      jsonText.startsWith("INSTITUTO_BANKA_BACKUP|")
    ){
      const encoded =
        jsonText.slice("INSTITUTO_BANKA_BACKUP|".length);

      jsonText = decodeBase64Utf8(encoded);
    }

    const parsed = JSON.parse(jsonText);

    if(
      !parsed ||
      !Array.isArray(parsed.students) ||
      !Array.isArray(parsed.products) ||
      !Array.isArray(parsed.rules)
    ){
      throw new Error("Backup inválido.");
    }

    if(
      !confirm(
        "Importar este backup substituirá todos os dados atuais. Continuar?"
      )
    ){
      return;
    }

    data = normalize(parsed);
    currentStudentId = null;

    save();
    closeModal();
    showView("dashboardView");

    showToast("Backup importado com sucesso!");

  }catch(error){
    console.error(error);

    alert(
      "Não foi possível importar este backup.\n\n" +
      "Verifique se você copiou o código completo."
    );
  }
}

function resetData(){
  if(!confirm(
    "Tem certeza que deseja apagar TODOS os dados?"
  )){
    return;
  }

  if(!confirm(
    "Esta ação apagará alunos, dinheiro, estrelas, " +
    "histórico, produtos e recompensas. Continuar?"
  )){
    return;
  }

  localStorage.removeItem(STORAGE_KEY);

  data = cloneDefault();
  currentStudentId = null;

  save();

  showView("dashboardView");

  showToast("Todos os dados foram apagados.");
}

function setupNavigation(){

  const dashboardBtn = $("dashboardBtn");
  const storeBtn = $("storeBtn");
  const rulesBtn = $("rulesBtn");
  const settingsBtn = $("settingsBtn");

  if(dashboardBtn){
    dashboardBtn.onclick = () =>
      showView("dashboardView");
  }

  if(storeBtn){
    storeBtn.onclick = () =>
      showView("storeView");
  }

  if(rulesBtn){
    rulesBtn.onclick = () =>
      showView("rulesView");
  }

  if(settingsBtn){
    settingsBtn.onclick = () =>
      showView("settingsView");
  }
}

function setupButtons(){

  const exportBtn = $("exportBtn");
  const importBtn = $("importBtn");
  const resetBtn = $("resetBtn");

  if(exportBtn){
    exportBtn.onclick = exportBackup;
  }

  if(importBtn){
    importBtn.onclick = openImportTextModal;
  }

  if(resetBtn){
    resetBtn.onclick = resetData;
  }
}

function init(){

  data = normalize(data);

  setupNavigation();
  setupButtons();

  renderAll();
}

document.addEventListener("DOMContentLoaded",init);
