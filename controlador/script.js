let estadoSimulado = "basico";
let cronJobsSimulados = [];
let salvavidasActivo = false;

// --- NAVEGACIÓN ---
function abrirPestaña(pestañaId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(pestañaId).classList.add('active');
    
    if(event && event.currentTarget) event.currentTarget.classList.add('active');
    if(pestañaId === 'auto' || pestañaId === 'seguridad') listarCronJobs();
}

// --- SIMULACIÓN DE ESTADO ---
function comprobarEstado() {
    if (estadoSimulado === "basico") {
        document.getElementById('texto-estado').innerText = "🔵 MODO BÁSICO";
        actualizarUI("azul");
        document.getElementById('btn-demo-link').style.display = "none";
    } else if (estadoSimulado === "avanzado") {
        document.getElementById('texto-estado').innerText = "🟢 MODO AVANZADO";
        actualizarUI("verde");
        // Mostramos el botón para ir a Hugging Face
        document.getElementById('btn-demo-link').style.display = "block";
    }
}

// --- SIMULACIÓN DE SUBIDA/BAJADA (EL "CARTÓN PIEDRA") ---
function subirMaquina() {
    mostrarSnackbar("🚀 Ejecutando Workflow en GitHub...", "green");
    document.getElementById('texto-estado').innerText = "🟠 REINICIANDO IA...";
    actualizarUI("naranja");
    
    // Esperamos 4 segundos simulando que GitHub está trabajando
    setTimeout(() => {
        estadoSimulado = "avanzado";
        comprobarEstado();
        mostrarSnackbar("✅ Máquina en Hardware T4. Lista.", "green");
    }, 4000);
}

function bajarMaquina() {
    mostrarSnackbar("🌱 Ejecutando Workflow en GitHub...", "blue");
    document.getElementById('texto-estado').innerText = "🟠 REINICIANDO IA...";
    actualizarUI("naranja");
    document.getElementById('btn-demo-link').style.display = "none"; // Ocultamos el enlace
    
    // Esperamos 4 segundos simulando que GitHub está trabajando
    setTimeout(() => {
        estadoSimulado = "basico";
        comprobarEstado();
        mostrarSnackbar("✅ Máquina devuelta a CPU Gratis.", "green");
    }, 4000);
}

function actualizarUI(color) {
    const t = document.getElementById('texto-estado');
    const card = document.getElementById('tarjeta-estado');
    const bA = document.getElementById('btn-avanzado');
    const bB = document.getElementById('btn-basico');
    
    if(bA) bA.disabled = (color === "verde" || color === "naranja");
    if(bB) bB.disabled = (color === "azul" || color === "naranja");
    
    const c = color === "verde" ? "#4caf50" : color === "azul" ? "#2196f3" : color === "naranja" ? "#ff9800" : "#f44336";
    
    if(card) card.style.borderColor = c;
    if(t) t.style.color = c;
}

// --- SIMULACIÓN DE CRON JOBS ---
function generarID() { return Math.random().toString(36).substr(2, 6).toUpperCase(); }

function guardarRutina() {
    const horaInc = document.getElementById('hora-inicio').value;
    const checks = Array.from(document.querySelectorAll('.dia-check:checked'));
    const nombresDias = checks.map(c => c.parentElement.innerText.trim()).join(', ');

    if(checks.length === 0 || !horaInc) return mostrarSnackbar("Rellena horas y días", "red");

    mostrarSnackbar("Configurando rutina en servidor...", "#333");
    
    setTimeout(() => {
        const idGrupo = generarID();
        cronJobsSimulados.push({ id: idGrupo, titulo: `Rutina L-V (${horaInc})` });
        mostrarSnackbar("✅ Rutina Guardada", "green");
        listarCronJobs();
    }, 1500);
}

function guardarEventoUnico() {
    mostrarSnackbar("Programando fecha única...", "#9c27b0");
    setTimeout(() => {
        const idGrupo = generarID();
        cronJobsSimulados.push({ id: idGrupo, titulo: `Cita Única` });
        mostrarSnackbar("📅 Fecha Guardada", "green");
        listarCronJobs();
    }, 1500);
}

function guardarSeguridad() {
    mostrarSnackbar("Configurando salvavidas...", "#333");
    setTimeout(() => {
        salvavidasActivo = true;
        mostrarSnackbar("🔒 Salvavidas activado", "green");
        listarCronJobs();
    }, 1000);
}

function borrarSeguridad() {
    mostrarSnackbar("Desactivando...", "#333");
    setTimeout(() => {
        salvavidasActivo = false;
        mostrarSnackbar("Salvavidas Desactivado", "#f44336");
        listarCronJobs();
    }, 1000);
}

function borrarGrupo(id) {
    if(!confirm("¿Borrar esta rutina completa?")) return;
    mostrarSnackbar("Borrando rutina...", "#333");
    setTimeout(() => {
        cronJobsSimulados = cronJobsSimulados.filter(j => j.id !== id);
        listarCronJobs();
    }, 1000);
}

function listarCronJobs() {
    const container = document.getElementById('cron-list-container');
    const led = document.getElementById('led-seguridad');
    if(!container) return;
    
    if(led) led.className = salvavidasActivo ? "led-verde" : "led-rojo";

    const btnActivar = document.getElementById('btn-activar-seg');
    const btnDesactivar = document.getElementById('btn-desactivar-seg');
    if(btnActivar) btnActivar.disabled = salvavidasActivo;
    if(btnDesactivar) btnDesactivar.disabled = !salvavidasActivo;

    let htmlGrupos = cronJobsSimulados.map(grp => {
        return `
        <div style="background:#f8f9fa; border:1px solid #ddd; padding:12px; margin-bottom:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <strong style="color:#333;">📅 ${grp.titulo}</strong><br>
                <span style="font-size:13px; color:#555;">Activa (Simulada)</span>
            </div>
            <button onclick="borrarGrupo('${grp.id}')" style="background:none; border:none; cursor:pointer; font-size:20px; color:#f44336;" title="Eliminar Rutina">🗑️</button>
        </div>
        `;
    }).join('');

    container.innerHTML = htmlGrupos || "<p style='color:#777; font-size:14px; text-align:center;'>No hay programaciones activas.</p>";
}

// --- UTILIDADES ---
function mostrarSnackbar(msg, color) {
    const s = document.getElementById("snackbar");
    if(!s) return;
    s.innerText = msg; s.style.background = color; s.className = "show";
    setTimeout(() => s.className = "", 3000);
}

function toggleDarkMode() {
    const body = document.documentElement;
    const btn = document.getElementById('btn-dark-mode');
    if (body.getAttribute('data-theme') === 'light') {
        body.removeAttribute('data-theme');
        btn.innerText = "☀️";
        localStorage.setItem('theme', 'dark');
    } else {
        body.setAttribute('data-theme', 'light');
        btn.innerText = "🌙";
        localStorage.setItem('theme', 'light');
    }
}

// Iniciar estado por defecto
comprobarEstado();
