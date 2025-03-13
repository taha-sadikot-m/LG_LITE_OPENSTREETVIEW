const socket = io();
let map, roomId, lastSentData = null;

document.getElementById('create-room').addEventListener('click', async () => {
    try {
        const response = await fetch('/create-room', { method: 'POST' });
        if (!response.ok) throw new Error('Failed to create room');
        
        const data = await response.json();
        roomId = data.room_id;
        
        socket.emit('join_room', {
            room_id: roomId,
            is_master: true
        });

        // Update UI
        document.getElementById('room-code').textContent = roomId;
        document.getElementById('connection-status').textContent = 'Connected';
        document.querySelector('.initial-form').classList.add('hidden');

        // Initialize map
        initializeMap();
    } catch (error) {
        showError(error.message);
    }
});

// Add after map initialization
function initializeControls() {
    // Zoom controls
    document.getElementById('zoom-in').addEventListener('click', () => {
        map.zoomIn();
    });

    document.getElementById('zoom-out').addEventListener('click', () => {
        map.zoomOut();
    });

    // Pan controls
    const panStep = 50; // Adjust sensitivity
    
    document.getElementById('pan-up').addEventListener('click', () => {
        map.panBy([0, -panStep], {duration: 100});
    });

    document.getElementById('pan-down').addEventListener('click', () => {
        map.panBy([0, panStep], {duration: 100});
    });

    document.getElementById('pan-left').addEventListener('click', () => {
        map.panBy([-panStep, 0], {duration: 100});
    });

    document.getElementById('pan-right').addEventListener('click', () => {
        map.panBy([panStep, 0], {duration: 100});
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if(e.key === '+') map.zoomIn();
        if(e.key === '-') map.zoomOut();
        if(e.key === 'ArrowUp') map.panBy([0, -panStep]);
        if(e.key === 'ArrowDown') map.panBy([0, panStep]);
        if(e.key === 'ArrowLeft') map.panBy([-panStep, 0]);
        if(e.key === 'ArrowRight') map.panBy([panStep, 0]);
    });
}

// Call this after map initialization
initializeControls();

// Remove initializeTouchControls function

function initializeMap() {
    // Replace maplibre with Leaflet initialization
    map = L.map('map').setView([0, 0], 2);
    
    // Use Mapbox tiles (replace with your access token)
    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution: '© Mapbox',
        maxZoom: 18,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: 'your_mapbox_access_token' // Replace with your actual Mapbox access token
    }).addTo(map);

    // For OpenStreetMap (alternative):
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    const updateViewportMetrics = () => {
        // Get current map container width in pixels
        const widthPixels = map.getSize().x;
        
        // Calculate meters per pixel at current view
        const center = map.getCenter();
        const metersPerPixel = 156543.03392 * Math.cos(center.lat * Math.PI / 180) / Math.pow(2, map.getZoom());
        
        // Return viewport width in meters (matches maplibre calculation)
        return widthPixels * metersPerPixel;
    };

    const sendUpdate = () => {
        const viewportWidthMeters = updateViewportMetrics();
        const center = map.getCenter();
        
        const data = {
            room_id: roomId,
            lng: center.lng,
            lat: center.lat,
            zoom: map.getZoom(),
            viewportWidthMeters: viewportWidthMeters
        };

        if (JSON.stringify(data) !== JSON.stringify(lastSentData)) {
            socket.emit('view_update', data);
            lastSentData = data;
        }
    };

    map.on('move', () => requestAnimationFrame(sendUpdate));
    window.addEventListener('resize', sendUpdate);
}

function initializeTouchControls() {
    let touchStartX = 0;
    let touchStartY = 0;
    const touchThreshold = 30;
    const mapContainer = map.getContainer();

    mapContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });

    mapContainer.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;

        if(Math.abs(dx) > touchThreshold || Math.abs(dy) > touchThreshold) {
            const currentCenter = map.getCenter();
            const newCenter = [
                currentCenter.lat - (dy * 0.1),
                currentCenter.lng + (dx * 0.1)
            ];
            map.panTo(newCenter, {animate: true});
        }
    });
}

initializeTouchControls();

// Update controls to use Leaflet methods
function initializeControls() {
    // Zoom controls remain the same
    document.getElementById('zoom-in').addEventListener('click', () => map.zoomIn());
    document.getElementById('zoom-out').addEventListener('click', () => map.zoomOut());

    // Pan controls
    const panStep = 50;
    document.getElementById('pan-up').addEventListener('click', () => map.panBy([0, -panStep]));
    document.getElementById('pan-down').addEventListener('click', () => map.panBy([0, panStep]));
    document.getElementById('pan-left').addEventListener('click', () => map.panBy([-panStep, 0]));
    document.getElementById('pan-right').addEventListener('click', () => map.panBy([panStep, 0]));

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if(e.key === '+') map.zoomIn();
        if(e.key === '-') map.zoomOut();
        if(e.key === 'ArrowUp') map.panBy([0, -panStep]);
        if(e.key === 'ArrowDown') map.panBy([0, panStep]);
        if(e.key === 'ArrowLeft') map.panBy([-panStep, 0]);
        if(e.key === 'ArrowRight') map.panBy([panStep, 0]);
    });
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => errorDiv.style.display = 'none', 5000);
}

socket.on('disconnect', () => {
    document.getElementById('connection-status').textContent = 'Disconnected';
});