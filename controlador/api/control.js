// api/control.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { action, payload } = req.body;
    
    // Vercel nos dará estas 3 llaves mágicas desde su panel secreto
    const HF_TOKEN = process.env.HF_TOKEN;
    const CRON_API_KEY = process.env.CRON_API_KEY;
    const GH_TOKEN = process.env.GH_TOKEN;

    // Constantes fijas de tu proyecto
    const FOLDER_ID = 7587997;
    const GITHUB_REPO = "jorgesierra89/proyecto.cellectia";
    const URL_SUBIR = `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/subir.yml/dispatches`;
    const URL_BAJAR = `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/bajar.yml/dispatches`;

    try {
        // 1. ESTADO DE LA MÁQUINA (Hugging Face)
        if (action === 'CHECK_STATUS') {
            const response = await fetch('https://huggingface.co/api/spaces/demo-cellectia/demo-cellectia/runtime', {
                headers: { 'Authorization': `Bearer ${HF_TOKEN}` }
            });
            const data = await response.json();
            return res.status(200).json(data);
        }

        // 2. SUBIR/BAJAR MÁQUINA (Hugging Face)
        if (action === 'SCALE_MACHINE') {
            const { tier } = payload; 
            const response = await fetch('https://huggingface.co/api/spaces/demo-cellectia/demo-cellectia/hardware', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ flavor: tier })
            });
            const data = await response.json();
            return res.status(200).json(data);
        }

        // 3. LISTAR CRON JOBS
        if (action === 'CRON_LIST') {
            const resCron = await fetch('https://api.cron-job.org/jobs', {
                headers: { 'Authorization': `Bearer ${CRON_API_KEY}` }
            });
            const data = await resCron.json();
            return res.status(200).json(data);
        }

        // 4. CREAR CRON JOB
        if (action === 'CRON_CREATE') {
            const { titulo, horaStr, wdays, mday, month, tipoAccion } = payload;
            const [hh, mm] = horaStr.split(':');
            const targetUrl = tipoAccion === 'SUBIR' ? URL_SUBIR : URL_BAJAR;

            const jobData = {
                job: {
                    title: titulo,
                    url: targetUrl,
                    enabled: true,
                    saveResponses: true,
                    folderId: FOLDER_ID,
                    schedule: {
                        timezone: "Europe/Madrid",
                        hours: [parseInt(hh)],
                        minutes: [parseInt(mm)],
                        wdays: wdays,
                        mdays: [mday],
                        months: [month]
                    },
                    requestMethod: 1,
                    auth: { authMethod: 0 },
                    extendedData: {
                        headers: {
                            "Accept": "application/vnd.github.v3+json",
                            "Authorization": `Bearer ${GH_TOKEN}`,
                            "X-GitHub-Api-Version": "2022-11-28",
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ ref: "main" })
                    }
                }
            };

            const resCron = await fetch('https://api.cron-job.org/jobs', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${CRON_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(jobData)
            });
            const data = await resCron.json();
            return res.status(200).json(data);
        }

        // 5. BORRAR CRON JOB
        if (action === 'CRON_DELETE') {
            const { jobId } = payload;
            const resCron = await fetch(`https://api.cron-job.org/jobs/${jobId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${CRON_API_KEY}` }
            });
            return res.status(200).json({ success: true });
        }
        
    } catch (error) {
        return res.status(500).json({ error: 'Error en el servidor', details: error.message });
    }
}
