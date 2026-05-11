// --- CONFIGURACIÓN Y ESTADO INICIAL ---
let estadoSimulado = "basico"; 
const FOLDER_ID = 59873; // Tu ID de carpeta en Cron-job

// --- NAVEGACIÓN ---
function abrirPestaña(pestañaId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(pestañaId).classList.add('active');
    
    // Al abrir estas pestañas, refrescamos la lista real de la API
    if(pestañaId === 'auto' || pestañaId === 'seguridad' || pestañaId === 'manual') {
        listarCronJobs();
    }
}

// --- LLAMADA A TU API EN VERCEL ---
async function llamarAPI(action, payload = {}) {
    const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload })
    });
    if (!res.ok) throw new Error(`Error en API: ${action}`);
    return await res.json();
}

// --- GESTIÓN DE LA MÁQUINA (TEATRO / SIMULADO) ---
function comprobarEstado() {
    const texto = document.getElementById('texto-estado');
    const btnDemo = document.getElementById('btn-demo-link');

    if (estadoSimulado === "basico") {
        texto.innerText = "🔵 MODO BÁSICO";
        actualizarUI("azul");
        if(btnDemo) btnDemo.style.display = "none";
    } else {
        texto.innerText = "🟢 MODO AVANZADO";
        actualizarUI("verde");
        if(btnDemo) btnDemo.style.display = "block";
    }
}

function subirMaquina() {
    mostrarSnackbar("🚀 Ejecutando Workflow en GitHub...", "#1f6feb");
    document.getElementById('texto-estado').innerText = "🟠 REINICIANDO IA...";
    actualizarUI("naranja");
    
    setTimeout(() => {
        estadoSimulado = "avanzado";
        comprobarEstado();
        mostrarSnackbar("✅ Hardware T4 Small Activo", "green");
    }, 4000);
}

function bajarMaquina() {
    mostrarSnackbar("🌱 Bajando a CPU Gratis...", "#2196f3");
    document.getElementById('texto-estado').innerText = "🟠 REINICIANDO IA...";
    actualizarUI("naranja");
    
    setTimeout(() => {
        estadoSimulado = "basico";
        comprobarEstado();
        mostrarSnackbar("✅ Modo Básico Restaurado", "green");
    }, 4000);
}

// --- GESTIÓN DE CRON-JOB (REAL) ---
async function listarCronJobs() {
    const container = document.getElementById('cron-list-container');
    const led = document.getElementById('led-seguridad');
    if(!container) return;

    try {
        const data = await llamarAPI('CRON_LIST');
        // Filtramos por tu carpeta específica
        const misJobs = data.jobs.filter(j => j.folderId === FOLDER_ID);
        
        // El LED responde a la realidad de la API
        const tieneSeguridad = misJobs.some(j => j.title.includes("[SEGURIDAD]"));
        if(led) led.className = tieneSeguridad ? "led-verde" : "led-rojo";

        // Botones de la pestaña seguridad
        const btnActivar = document.getElementById('btn-activar-seg');
        const btnDesactivar = document.getElementById('btn-desactivar-seg');
        if(btnActivar) btnActivar.disabled = tieneSeguridad;
        if(btnDesactivar) btnDesactivar.disabled = !tieneSeguridad;

        // Pintamos la lista
        container.innerHTML = misJobs.map(j => `
            <div style="background:var(--bg-card); border:1px solid var(--border); padding:12px; margin-bottom:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong>📅 ${j.title}</strong><br>
                    <span style="font-size:12px; color:var(--text-sub);">Estado: ${j.enabled ? 'Activo' : 'Pausado'}</span>
                </div>
                <button onclick="borrarCronReal('${j.jobId}')" style="background:none; border:none; cursor:pointer; font-size:20px; color:#f44336;">🗑️</button>
            </div>
        `).join('') || "<p style='text-align:center; color:var(--text-sub);'>No hay tareas activas.</p>";

    } catch (e) {
        console.error(e);
        container.innerHTML = "<p style='color:red;'>Error al conectar con Cron-Job.org</p>";
    }
}

async function guardarRutina() {
    const horaInc = document.getElementById('hora-inicio').value;
    const checks = Array.from(document.querySelectorAll('.dia-check:checked'));
    const dias = checks.map(c => parseInt(c.value));
    
    if(dias.length === 0 || !horaInc) return mostrarSnackbar("Rellena horas y días", "red");

    mostrarSnackbar("📡 Creando tarea real...", "#333");
    try {
        await llamarAPI('CRON_CREATE', { 
            titulo: `[DEMO] Rutina ${horaInc}`, 
            horaStr: horaInc, 
            wdays: dias, 
            mday: -1, month: -1, 
            tipoAccion: 'SUBIR' 
        });
        mostrarSnackbar("✅ Tarea creada en Cron-Job.org", "green");
        listarCronJobs();
    } catch (e) { mostrarSnackbar("Error en la API", "red"); }
}

async function guardarSeguridad() {
    const hora = document.getElementById('hora-seguridad').value;
    mostrarSnackbar("🔒 Activando Salvavidas...", "#333");
    try {
        await llamarAPI('CRON_CREATE', { 
            titulo: `[SEGURIDAD] Salvavidas (${hora})`, 
            horaStr: hora, 
            wdays: [1,2,3,4,5,6,7], 
            mday: -1, month: -1, 
            tipoAccion: 'BAJAR' 
        });
        mostrarSnackbar("✅ Salvavidas configurado", "green");
        listarCronJobs();
    } catch (e) { mostrarSnackbar("Error al activar", "red"); }
}

async function borrarCronReal(jobId) {
    if(!confirm("¿Eliminar esta tarea real de Cron-Job.org?")) return;
    mostrarSnackbar("🗑️ Eliminando...", "#333");
    try {
        await llamarAPI('CRON_DELETE', { jobId });
        mostrarSnackbar("Eliminado correctamente", "green");
        listarCronJobs();
    } catch (e) { mostrarSnackbar("Error al borrar", "red"); }
}

async function borrarSeguridad() {
    mostrarSnackbar("🛡️ Desactivando salvavidas...", "#333");
    try {
        const data = await llamarAPI('CRON_LIST');
        const segJob = data.jobs.find(j => j.folderId === FOLDER_ID && j.title.includes("[SEGURIDAD]"));
        if (segJob) {
            await llamarAPI('CRON_DELETE', { jobId: segJob.jobId });
            mostrarSnackbar("Salvavidas desactivado", "#f44336");
        }
        listarCronJobs();
    } catch (e) { mostrarSnackbar("Error al desactivar", "red"); }
}

// --- UTILIDADES ---
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

function mostrarSnackbar(msg, color) {
    const s = document.getElementById("snackbar");
    if(!s) return;
    s.innerText = msg; s.style.background = color; s.className = "show";
    setTimeout(() => s.className = "", 3000);
}

function toggleDarkMode() {
    const body = document.documentElement;
    if (body.getAttribute('data-theme') === 'light') {
        body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'dark');
    } else {
        body.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }
}

// --- INICIO ---
document.addEventListener('DOMContentLoaded', () => {
    comprobarEstado();
    listarCronJobs();
    // Actualizar estado real cada 30 segundos
    setInterval(listarCronJobs, 30000);
});
