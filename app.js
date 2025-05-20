    // ——— CONFIG GOOGLE API ———
    const CLIENT_ID = "163517035834-eno5m2vuqnjb0sg1bm9j19s2qr69tauf.apps.googleusercontent.com";
    const API_KEY   = 'AIzaSyDAH0__STSitqDTs4tR00XHTG5uHW0HB_U';
    const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
    const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
    // —————————————————————————

    let selectedDate = null;
    let selectedHour = null;

    // 1. Inicializa GAPI
    function handleClientLoad() {
    gapi.load('client:auth2', initClient);
    }
    async function initClient() {
    try {
        await gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES
        });
    } catch (err) {
        console.error('Error initializing Google API:', err);
    }
    }
    handleClientLoad();

    // 2. DOM
    const datePicker = document.getElementById('datePicker');
    const durationEl = document.getElementById('duration');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const slotsDiv = document.getElementById('slots');
    const form = document.getElementById('bookingForm');
    const message = document.getElementById('message');

    // Fecha mínima hoy
    datePicker.min = new Date().toISOString().split('T')[0];

    // Eventos
    datePicker.addEventListener('change', refreshSlots);
    durationEl.addEventListener('change', refreshSlots);

    // Refresca franjas según fecha y duración
    function refreshSlots() {
    selectedDate = datePicker.value;
    if (!selectedDate) return;

    // Reset UI
    step2.classList.remove('hidden');
    step3.classList.add('hidden');
    message.classList.add('hidden');
    slotsDiv.innerHTML = '';

    // Desactivar inputs mientras carga
    datePicker.disabled = true;
    durationEl.disabled = true;

    const dur = parseInt(durationEl.value, 10);
    const startHour = 7;
    const endHour = 19;
    let hour = startHour;

    while (hour + dur/60 <= endHour) {
        const timeLabel = `${String(hour).padStart(2, '0')}:00`;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.innerText = timeLabel;
        btn.className = 'p-3 bg-white border border-blue-600 rounded-lg text-blue-600 hover:bg-blue-50 shadow-sm transition-transform transform hover:scale-105';
        btn.onclick = () => selectTime(btn, timeLabel);
        slotsDiv.appendChild(btn);
        hour += dur/60;
    }

    // Reactivar inputs
    datePicker.disabled = false;
    durationEl.disabled = false;
    }

    // Marca el slot elegido y muestra el formulario
    function selectTime(button, time) {
    // Clear previous selection
    [...slotsDiv.children].forEach(btn => btn.classList.remove('border-4'));
    // Highlight
    button.classList.add('border-4', 'border-blue-800');

    selectedHour = time;
    step3.classList.remove('hidden');
    step3.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Maneja envío del formulario
    form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Datos
    const firstName    = form.firstName.value.trim();
    const lastName     = form.lastName.value.trim();
    const email        = form.email.value.trim();
    const meetingTitle = form.meetingTitle.value.trim();
    const comments     = form.comments.value.trim();

    // Validación simple
    if (!firstName || !lastName || !email || !meetingTitle) {
        displayMessage('Por favor completa todos los campos.', 'red');
        return;
    }

    // Desactivar submit mientras procesa
    const submitBtn = form.querySelector('button[type=submit]');
    submitBtn.disabled = true;
    submitBtn.innerText = 'Procesando...';

    // Autenticación si es necesario
    const auth = gapi.auth2.getAuthInstance();
    if (!auth.isSignedIn.get()) {
        try {
        await auth.signIn();
        } catch (err) {
        console.error('Autorización denegada:', err);
        displayMessage('Necesitamos permisos para crear el evento.', 'red');
        resetSubmit(submitBtn);
        return;
        }
    }

    // Fechas inicio y fin
    const startDate = new Date(`${selectedDate}T${selectedHour}:00`);
    const endDate = new Date(startDate.getTime() + parseInt(durationEl.value, 10) * 60000);

    const event = {
        summary: meetingTitle,
        description: `Reservado por ${firstName} ${lastName}. Comentarios: ${comments}`,
        start: { dateTime: startDate.toISOString() },
        end:   { dateTime: endDate.toISOString() },
        attendees: [{ email }],
    };

    // Inserción en Calendar
    try {
        await gapi.client.calendar.events.insert({ calendarId: 'primary', resource: event });
        displayMessage('¡Reserva confirmada y añadida a Google Calendar!', 'green');
        form.reset();
        step2.classList.add('hidden');
        step3.classList.add('hidden');
    } catch (err) {
        console.error('Error al crear evento:', err);
        displayMessage('Error creando el evento. Revisa la consola.', 'red');
    }

    resetSubmit(submitBtn);
    });

    // Muestra mensaje con color
    function displayMessage(text, color) {
    message.innerText = text;
    message.className = `message text-${color}-600`;
    message.classList.remove('hidden');
    message.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Restaurar botón
    function resetSubmit(btn) {
    btn.disabled = false;
    btn.innerText = 'Confirmar Reserva';
    }
