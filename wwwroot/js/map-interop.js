window.mapInterop = {
    map: null,
    markers: [],

    init: function (elementId, lat, lng, zoom) {
        if (this.map) { this.map.remove(); }
        this.map = L.map(elementId).setView([lat, lng], zoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(this.map);
        setTimeout(function () { window.mapInterop.map.invalidateSize(); }, 200);
    },

    flyTo: function (lat, lng, zoom) {
        if (this.map) { this.map.flyTo([lat, lng], zoom); }
    },

    addMarker: function (lat, lng, label) {
        if (this.map) {
            var marker = L.marker([lat, lng]).addTo(this.map).bindPopup(label).openPopup();
            this.markers.push(marker);
        }
    },

    clearMarkers: function () {
        this.markers.forEach(function (m) { window.mapInterop.map.removeLayer(m); });
        this.markers = [];
    }
};