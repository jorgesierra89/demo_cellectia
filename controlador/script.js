let modoActivo = "desconocido";

// --- NAVEGACIÓN ---
function abrirPestaña(pestañaId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(pestañaId).classList.add('active');
    
    if(event && event.currentTarget) event.currentTarget.classList.add('active');
    if(pestañaId === 'auto' || pestañaId === 'seguridad') listarCronJobs();
}

// ==========================================
// LLAMADAS AL SERVIDOR SEGURO (VERCEL API)
// ==========================================

async function llamarAPI(action, payload = {}) {
    const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload })
    });
    if (!res.ok) throw new Error(`Error en API: ${action}`);
    return await res.json();
}

async function comprobarEstado() {
    try {
        const data = await llamarAPI('CHECK_STATUS');
        
        if (data.stage === 'BUILDING' || data.stage === 'STARTING') {
            document.getElementById('texto-estado').innerText = "🟠 REINICIANDO IA...";
            actualizarUI("naranja");
        } else {
            const flavor = data.hardware?.current?.flavor || 'Desconocido';
            if (flavor === 'cpu-upgrade') {
                document.getElementById('texto-estado').innerText = "🟢 MODO AVANZADO";
                actualizarUI("verde");
            } else {
                document.getElementById('texto-estado').innerText = "🔵 MODO BÁSICO";
                actualizarUI("azul");
            }
        }
    } catch (error) {
        console.error("Error al consultar estado:", error);
    }
}

async function subirMaquina() {
    try {
        mostrarSnackbar("🚀 Subiendo a Modo Avanzado...", "green");
        document.getElementById('texto-estado').innerText = "🟠 REINICIANDO IA...";
        actualizarUI("naranja");
        await llamarAPI('SCALE_MACHINE', { tier: 'cpu-upgrade' });
        setTimeout(comprobarEstado, 5000);
    } catch (error) {
        mostrarSnackbar("Error al enviar la orden ❌", "red");
    }
}

async function bajarMaquina() {
    try {
        mostrarSnackbar("🌱 Bajando a Modo Básico...", "blue");
        document.getElementById('texto-estado').innerText = "🟠 REINICIANDO IA...";
        actualizarUI("naranja");
        await llamarAPI('SCALE_MACHINE', { tier: 'cpu-basic' });
        setTimeout(comprobarEstado, 5000);
    } catch (error) {
        mostrarSnackbar("Error al enviar la orden ❌", "red");
    }
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

// --- UTILIDAD ID GRUPO ---
function generarID() { return Math.random().toString(36).substr(2, 6).toUpperCase(); }

// --- PROGRAMACIÓN (VÍA VERCEL API) ---
async function crearJob(titulo, horaStr, wdays, mday, month, tipoAccion) {
    try {
        await llamarAPI('CRON_CREATE', { titulo, horaStr, wdays, mday, month, tipoAccion });
    } catch (e) {
        console.error("Error Cron-job:", e);
    }
}

async function guardarRutina() {
    const horaInc = document.getElementById('hora-inicio').value;
    const horaFin = document.getElementById('hora-fin').value;
    const checks = Array.from(document.querySelectorAll('.dia-check:checked'));
    const dias = checks.map(c => parseInt(c.value));
    const nombresDias = checks.map(c => c.parentElement.innerText.trim()).join(', ');

    if(dias.length === 0 || !horaInc || !horaFin) return mostrarSnackbar("Rellena horas y días", "red");

    const idGrupo = generarID();
    mostrarSnackbar("Configurando rutina...", "#333");
    
    await crearJob(`[GRP-${idGrupo}] 🚀 Avanzado (${horaInc}) | ${nombresDias}`, horaInc, dias, -1, -1, 'SUBIR');
    await new Promise(r => setTimeout(r, 800));
    await crearJob(`[GRP-${idGrupo}] 🐢 Básico (${horaFin}) | ${nombresDias}`, horaFin, dias, -1, -1, 'BAJAR');
    
    mostrarSnackbar("✅ Rutina Guardada", "green");
    listarCronJobs();
}

async function guardarEventoUnico() {
    const fecha = document.getElementById('fecha-unica').value;
    const horaOn = document.getElementById('hora-unica-on').value;
    const horaOff = document.getElementById('hora-unica-off').value;
    if(!fecha || !horaOn || !horaOff) return mostrarSnackbar("Rellena todos los campos", "red");
    
    const [año, mes, dia] = fecha.split('-').map(n => parseInt(n));
    const idGrupo = generarID();

    mostrarSnackbar("Programando fecha única...", "#9c27b0");

    await crearJob(`[GRP-${idGrupo}] 🚀 Avanzado (${horaOn}) | Día ${dia}/${mes}`, horaOn, [-1], dia, mes, 'SUBIR');
    await new Promise(r => setTimeout(r, 800));
    await crearJob(`[GRP-${idGrupo}] 🐢 Básico (${horaOff}) | Día ${dia}/${mes}`, horaOff, [-1], dia, mes, 'BAJAR');
    
    mostrarSnackbar("📅 Fecha Guardada", "green");
    listarCronJobs();
}

async function guardarSeguridad() {
    const hora = document.getElementById('hora-seguridad').value;
    if(!hora) return;
    mostrarSnackbar("Configurando salvavidas...", "#333");
    await borrarSeguridad(false); 
    await crearJob(`[SEGURIDAD] Salvavidas Básico (${hora})`, hora, [1,2,3,4,5,6,7], -1, -1, 'BAJAR');
    mostrarSnackbar("🔒 Salvavidas activado", "green");
    listarCronJobs();
}

async function listarCronJobs() {
    const container = document.getElementById('cron-list-container');
    const led = document.getElementById('led-seguridad');
    if(!container) return;
    
    try {
        const data = await llamarAPI('CRON_LIST');
        const misJobs = data.jobs.filter(j => j.folderId === 59873);
        
        let grupos = {};
        let tieneSeguridad = false;

        misJobs.forEach(j => {
            if (j.title.includes("[SEGURIDAD]")) {
                tieneSeguridad = true;
            } else {
                const match = j.title.match(/\[GRP-(.*?)\]/);
                if (match) {
                    const id = match[1];
                    if (!grupos[id]) grupos[id] = { idsCron: [], titulos: [] };
                    grupos[id].idsCron.push(j.jobId);
                    grupos[id].titulos.push(j.title.replace(`[GRP-${id}] `, '')); 
                }
            }
        });

        if(led) led.className = tieneSeguridad ? "led-verde" : "led-rojo";

        const btnActivar = document.getElementById('btn-activar-seg');
        const btnDesactivar = document.getElementById('btn-desactivar-seg');
        if(btnActivar) btnActivar.disabled = tieneSeguridad;
        if(btnDesactivar) btnDesactivar.disabled = !tieneSeguridad;

        const htmlGrupos = Object.keys(grupos).map(id => {
            const grp = grupos[id];
            const infoBase = grp.titulos[0].split('|')[1]?.trim() || "Programación";
            const textosHoras = grp.titulos.map(t => t.split('|')[0].trim()).join('<br>');
            
            return `
            <div style="background:#f8f9fa; border:1px solid #ddd; padding:12px; margin-bottom:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong style="color:#333;">📅 ${infoBase}</strong><br>
                    <span style="font-size:13px; color:#555;">${textosHoras}</span>
                </div>
                <button onclick="borrarGrupo('${grp.idsCron.join(',')}')" style="background:none; border:none; cursor:pointer; font-size:20px; color:#f44336;" title="Eliminar Rutina">🗑️</button>
            </div>
            `;
        }).join('');

        container.innerHTML = htmlGrupos || "<p style='color:#777; font-size:14px; text-align:center;'>No hay programaciones activas.</p>";
        
    } catch (e) { container.innerHTML = "Error al cargar lista."; }
}

async function borrarGrupo(idsString) {
    if(!confirm("¿Borrar esta rutina completa?")) return;
    const ids = idsString.split(',');
    mostrarSnackbar("Borrando rutina...", "#333");
    for (let id of ids) {
        await llamarAPI('CRON_DELETE', { jobId: id });
    }
    listarCronJobs();
}

async function borrarSeguridad(mostrarAviso = true) {
    if(mostrarAviso) mostrarSnackbar("Desactivando...", "#333");
    const data = await llamarAPI('CRON_LIST');
    const seguridadJobs = data.jobs.filter(j => j.folderId === 59873 && j.title.includes("[SEGURIDAD]"));
    
    for (let j of seguridadJobs) {
        await llamarAPI('CRON_DELETE', { jobId: j.jobId });
    }
    if (mostrarAviso) mostrarSnackbar("Salvavidas Desactivado", "#f44336");
    listarCronJobs();
}

function mostrarSnackbar(msg, color) {
    const s = document.getElementById("snackbar");
    if(!s) return;
    s.innerText = msg; s.style.background = color; s.className = "show";
    setTimeout(() => s.className = "", 3000);
}

// --- MODO OSCURO ---
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

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    const btn = document.getElementById('btn-dark-mode');
    
    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        if(btn) btn.innerText = "🌙";
    } else {
        document.documentElement.removeAttribute('data-theme');
        if(btn) btn.innerText = "☀️";
        localStorage.setItem('theme', 'dark');
    }
});

// Iniciar
comprobarEstado();
setInterval(comprobarEstado, 15000);