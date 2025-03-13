const socket = io();
let map, roomId, position;

document.getElementById('join-room').addEventListener('click', () => {
    roomId = document.getElementById('room-code-input').value.trim().toUpperCase();
    if (!roomId) {
        showError('Please enter a room code');
        return;
    }

    socket.emit('join_room', {
        room_id: roomId,
        is_master: false
    });
});

document.querySelectorAll('.grid-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        position = parseInt(this.dataset.position);
        document.querySelectorAll('.grid-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        document.getElementById('node-position').textContent = this.textContent;
        initializeMap();
    });
});

function initializeMap() {
    document.querySelectorAll('.initial-form').forEach(form => form.classList.add('hidden'));
    
    // Changed to Leaflet initialization
    map = L.map('map', {
        center: [0, 0],
        zoom: 2,
        dragging: false,
        zoomControl: false
    });

    // OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Update UI (unchanged)
    document.getElementById('room-code').textContent = roomId;
    document.getElementById('connection-status').textContent = 'Connected';

    socket.on('view_update', data => {
        if (!position || data.room_id !== roomId) return;
    
        // Replicate exact Mercator math from original implementation
        const offsetMultiplier = position - 2;
        const offsetMeters = offsetMultiplier * data.viewportWidthMeters;
        
        // Convert master's center to point
        const centerPoint = map.project([data.lat, data.lng], data.zoom);
        
        // Calculate meters-per-pixel at this latitude and zoom
        const metersPerPixel = 156543.03392 * Math.cos(data.lat * Math.PI / 180) / Math.pow(2, data.zoom);
        
        // Apply offset in pixels
        const offsetPixels = offsetMeters / metersPerPixel;
        const adjustedPoint = L.point(centerPoint.x + offsetPixels, centerPoint.y);
        
        // Convert back to LatLng
        const adjustedLatLng = map.unproject(adjustedPoint, data.zoom);
        
        // Update view without animation for precise sync
        map.setView(adjustedLatLng, data.zoom, { animate: false });
    });
}

// Rest of the file remains EXACTLY THE SAME from here down...
/* ༼ つ ◕_◕ ༽つ DON'T TOUCH BELOW THIS LINE ༼ つ ◕_◕ ༽つ */
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => errorDiv.style.display = 'none', 5000);
}

socket.on('room_joined', () => {
    document.getElementById('position-selection').classList.remove('hidden');
});

socket.on('disconnect', () => {
    document.getElementById('connection-status').textContent = 'Disconnected';
});

socket.on('connect_error', (error) => {
    showError(`Connection failed: ${error.message}`);
});

socket.on('error', (error) => {
    showError(`Server error: ${error.message}`);
});

socket.on('status_update', (data) => {
    if (data.status === 'connected') {
        document.getElementById('position-selection').classList.remove('hidden');
    }
});

socket.on('master_disconnected', () => {
    showError('Master node disconnected');
    document.getElementById('connection-status').textContent = 'Disconnected';
});