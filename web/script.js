const MAX_TEXTAREA_HEIGHT = 150; 
let chatHistory = [];

function toggleBiblioteca() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

function toggleTheme() {
    const body = document.body;
    const button = document.getElementById('toggleTheme');
    
    body.classList.toggle('dark-mode');
    
    if (body.classList.contains('dark-mode')) {
        button.innerHTML = `<i class="fa-solid fa-sun"></i> Modo claro`;
    } else {
        button.innerHTML = `<i class="fa-solid fa-moon"></i> Modo oscuro`;
    }
    
    document.getElementById('userText').focus();
}

function nuevaSesion() {
    chatHistory = []; 
    document.getElementById("chat").innerHTML = ""; 
    mostrarMensajeBienvenida(); 
}

function copiarTexto(btn, textoRaw) {
    const textoDecodificado = decodeURIComponent(textoRaw);
    navigator.clipboard.writeText(textoDecodificado).then(() => {
        const icon = btn.querySelector('i');
        icon.className = 'fa-solid fa-check'; 
        btn.style.color = '#3fb950'; 
        
        setTimeout(() => {
            icon.className = 'fa-regular fa-copy'; 
            btn.style.color = '';
        }, 2000);
    });
}

// NUEVO: Función inteligente de Máquina de Escribir (Promesa)
function efectoEscribir(elemento, html, velocidad) {
    return new Promise(resolve => {
        let i = 0;
        let isTag = false;
        let textoParcial = "";
        const chat = document.getElementById("chat");

        function escribir() {
            if (i < html.length) {
                let char = html.charAt(i);
                
                // Si encontramos un '<', empieza una etiqueta HTML (negritas, listas, etc)
                if (char === '<') isTag = true;

                textoParcial += char;
                elemento.innerHTML = textoParcial;
                i++;

                if (isTag) {
                    // Si estamos dentro de una etiqueta, escribimos de golpe sin pausa
                    if (char === '>') isTag = false;
                    escribir(); 
                } else {
                    // Si es texto normal, aplicamos la pausa y bajamos el scroll
                    chat.scrollTop = chat.scrollHeight;
                    setTimeout(escribir, velocidad);
                }
            } else {
                resolve(); // Terminó de escribir
            }
        }
        escribir();
    });
}

async function cargarBiblioteca() {
    try {
        const res = await fetch("/documentos_lista");
        const data = await res.json();
        const contenedor = document.getElementById("lista-docs");
        contenedor.innerHTML = "";

        if (Object.keys(data).length === 0) {
            contenedor.innerHTML = "<p style='padding:15px; font-size:0.9rem; opacity:0.6;'>No hay documentos disponibles.</p>";
            return;
        }

        for (const [categoria, archivos] of Object.entries(data)) {
            const divCat = document.createElement("div");
            divCat.className = "categoria-docs";
            divCat.innerHTML = `<h4>${categoria.replace("_", " ").toUpperCase()}</h4>`;
            
            const ul = document.createElement("ul");
            archivos.forEach(arc => {
                const li = document.createElement("li");
                li.innerHTML = `<a href="/documentos/${categoria}/${arc}" target="_blank"><i class="fa-regular fa-file-pdf"></i> ${arc}</a>`;
                ul.appendChild(li);
            });
            divCat.appendChild(ul);
            contenedor.appendChild(divCat);
        }
    } catch (e) {
        console.error("Error cargando biblioteca", e);
    }
}

async function enviarMensaje() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('active');

    const input = document.getElementById("userText");
    const chat = document.getElementById("chat");
    const boton = document.getElementById("boton-enviar");
    const mensaje = input.value.trim();

    if (!mensaje) return;

    boton.disabled = true;
    
    chat.insertAdjacentHTML('beforeend', `<div class='msg-user'><b>Tú:</b> ${mensaje}</div>`);
    chatHistory.push({ role: "user", content: mensaje });
    
    input.value = "";
    input.style.height = "auto";
    chat.scrollTop = chat.scrollHeight;

    const typingIndicator = document.createElement("div");
    typingIndicator.className = "msg-bot"; 
    typingIndicator.innerHTML = `<b>Cellectia:</b> <span class="dots">.</span><span class="dots">.</span><span class="dots">.</span>`;
    chat.appendChild(typingIndicator);
    chat.scrollTop = chat.scrollHeight;

    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: chatHistory })
        });
        const data = await response.json();
        
        let respuestaLimpia = data.response.replace(/\[ARCHIVO: (.*?)\]/g, "");
        let htmlRenderizado = marked.parse(respuestaLimpia);
        let textoSeguro = encodeURIComponent(respuestaLimpia);
        
        // 1. Preparamos la caja vacía de Cellectia
        typingIndicator.innerHTML = `
            <b>Cellectia:</b>
            <div class="contenido-texto" style="margin-top: 8px;"></div>
        `;
        
        // 2. Buscamos el div donde vamos a escribir
        const contenedorTexto = typingIndicator.querySelector(".contenido-texto");
        
        // 3. Ejecutamos el efecto de escribir (el número 15 es la velocidad en milisegundos)
        // Usamos await para que el código espere a que termine de escribir
        await efectoEscribir(contenedorTexto, htmlRenderizado, 15);
        
        // 4. Cuando termina de escribir, añadimos el botón de copiar
        typingIndicator.innerHTML += `
            <button class="btn-copiar" onclick="copiarTexto(this, '${textoSeguro}')" title="Copiar mensaje">
                <i class="fa-regular fa-copy"></i>
            </button>
        `;
        
        chatHistory.push({ role: "assistant", content: data.response });
        
    } catch (error) {
        typingIndicator.innerHTML = `<b>Cellectia:</b> <span style='color: #ff5555;'>Error de conexión.</span>`;
    } finally {
        boton.disabled = false;
        input.focus();
    }
}

function mostrarMensajeBienvenida() {
    const chat = document.getElementById("chat");
    const saludo = "¡Hola! Soy Cellectia 4.0, tu asistente de laboratorio. Estoy lista para supervisar nuestra sesión. ¿Qué objetivos tenemos para el día de hoy?";
    
    chat.insertAdjacentHTML('beforeend', `
        <div class='msg-bot'>
            <b>Cellectia:</b> 
            <div class="contenido-texto" style="margin-top: 8px;"></div>
        </div>
    `);
    
    // También aplicamos el efecto al mensaje de bienvenida
    const contenedorTexto = chat.lastElementChild.querySelector(".contenido-texto");
    efectoEscribir(contenedorTexto, saludo, 20);
    
    chatHistory.push({ role: "assistant", content: saludo });
}

document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("userText");
    
    input.addEventListener("keydown", function(event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            enviarMensaje();
        }
    });

    input.addEventListener("input", () => {
        input.style.height = "auto";
        input.style.height = (input.scrollHeight > MAX_TEXTAREA_HEIGHT ? MAX_TEXTAREA_HEIGHT : input.scrollHeight) + "px";
    });

    cargarBiblioteca();
    mostrarMensajeBienvenida();
    
    const btnTheme = document.getElementById('toggleTheme');
    btnTheme.innerHTML = `<i class="fa-solid fa-sun"></i> Modo claro`;
    
    input.focus();
});