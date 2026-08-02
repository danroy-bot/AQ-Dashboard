// isopleth.js - Map and contour rendering for Blazor using d3-contour
window.isoplethMap = {
    map: null,
    contourLayer: null,
    legendControl: null,
    windroseControl: null,
    timestampControl: null,
    contourDisplayMode: 'fill',
    currentGridData: null,

    // Contour color scheme
    // fillColors: [
    //     'rgba(26, 192, 235, 0.7)',   // 2.5 - 5%
    //     'rgba(26, 161, 235, 0.7)',   // 5 - 10%
    //     'rgba(26, 98, 235, 0.7)',     // 10 - 35%
    //     'rgba(26, 45, 235, 0.7)',     // 35 - 75%
    //     'rgba(88, 26, 235, 0.7)'        // >= 75%
    // ],
    // outlineColors: ['#ADD8E6', '#64B4DC', '#3282BE', '#145096', '#0A1E50'],

    fillColors: [
        'rgba(255, 245, 245, 0.7)',  // near white - 2.5 - 5%
        'rgba(255, 200, 200, 0.7)',  // light red - 5 - 10%
        'rgba(255, 120, 120, 0.7)',  // red - 10 - 35%
        'rgba(220, 50, 50, 0.7)',    // strong red - 35 - 75%
        'rgba(139, 0, 0, 0.7)'       // dark red - >= 75%
    ],
    outlineColors: ['#FFF5F5', '#FFC9C9', '#FF7A7A', '#DC3232', '#8B0000'],

    init: function (elementId) {
        if (this.map) { this.map.remove(); }

        this.map = L.map(elementId).setView([-23.879940, 151.316414], 12);

        var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 19
        });

        var satelliteLayer = L.tileLayer('https://gisservices.information.qld.gov.au/arcgis/rest/services/Imagery/QldBase_AllUsers/ImageServer/tile/{z}/{y}/{x}', {
            attribution: '© State of Queensland',
            maxZoom: 19
        });

        // OSM stays as the base layer; satellite renders on top and toggles via the layer control
        osmLayer.addTo(this.map);
        satelliteLayer.addTo(this.map);

        var overlayMaps = {
            "Satellite (QLD)": satelliteLayer
        };

        L.control.layers(null, overlayMaps, { position: 'bottomleft' }).addTo(this.map);
        this.addContourControl();

        // Right-click to show lat/lng
        this.map.on('contextmenu', function (e) {
            var lat = e.latlng.lat.toFixed(6);
            var lng = e.latlng.lng.toFixed(6);
            var content = '<div style="font-family: Arial, sans-serif; font-size: 13px;">' +
                '<div style="font-weight: bold; margin-bottom: 6px;">Coordinates</div>' +
                '<div style="margin-bottom: 4px;">Lat: <strong>' + lat + '</strong></div>' +
                '<div style="margin-bottom: 8px;">Lng: <strong>' + lng + '</strong></div>' +
                '<button onclick="navigator.clipboard.writeText(\'' + lat + ', ' + lng + '\').then(function(){ this.textContent=\'Copied!\'; }.bind(this))" ' +
                'style="background: #3F93B1; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">Copy to Clipboard</button>' +
                '</div>';

            L.popup()
                .setLatLng(e.latlng)
                .setContent(content)
                .openOn(e.target);
        });

        setTimeout(function () { window.isoplethMap.map.invalidateSize(); }, 200);
    },

    addGridOverlay: function (data) {
        if (typeof data === 'string') {
            data = eval('(' + data + ')');
        }
        this.currentGridData = data;
        this.renderContours(data);
        this.updateTimestampDisplay(data.timeStamp, data.isMaxContour);
        this.addLegend();
    },

    renderContours: function (data) {
        // Remove existing contour layer
        if (this.contourLayer) {
            this.map.removeLayer(this.contourLayer);
            this.contourLayer = null;
        }

        var thresholds = data.thresholds;
        var rows = data.rows;
        var cols = data.cols;
        var values = data.data;

        // d3.contours expects data in column-major order (i + j*n)
        // Our data is row-major (row * cols + col), and we need to flip Y
        // d3 grid: value at position (i, j) = values[i + j * cols]
        // where i is column (x), j is row (y), y=0 is top
        // Our data: values[row * cols + col], row=0 is bottom of grid
        // So we need to flip: d3_values[col + (rows-1-row)*cols] = values[row*cols + col]
        var d3Values = new Array(rows * cols);
        for (var row = 0; row < rows; row++) {
            for (var col = 0; col < cols; col++) {
                d3Values[col + (rows - 1 - row) * cols] = values[row * cols + col];
            }
        }

        // Upscale grid for smoother contours
        var upscale = 8; // increase for smoother (2, 4, 6, 8)
        var newCols = cols * upscale;
        var newRows = rows * upscale;
        var upscaled = new Array(newRows * newCols);

        for (var j = 0; j < newRows; j++) {
            for (var i = 0; i < newCols; i++) {
                var gx = i / upscale;
                var gy = j / upscale;

                var col0 = Math.min(Math.floor(gx), cols - 2);
                var row0 = Math.min(Math.floor(gy), rows - 2);

                var fx = gx - col0;
                var fy = gy - row0;

                var v00 = d3Values[col0 + row0 * cols];
                var v10 = d3Values[(col0 + 1) + row0 * cols];
                var v01 = d3Values[col0 + (row0 + 1) * cols];
                var v11 = d3Values[(col0 + 1) + (row0 + 1) * cols];

                upscaled[i + j * newCols] = v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) +
                    v01 * (1 - fx) * fy + v11 * fx * fy;
            }
        }

        d3Values = upscaled;
        cols = newCols;
        rows = newRows;

        // Generate contours using d3
        var contourGenerator = d3.contours()
            .size([cols, rows])
            .thresholds(thresholds)
            .smooth(true);

        var contours = contourGenerator(d3Values);

        // Convert d3 grid coordinates to lat/lng
        var latMin = data.latMin;
        var latMax = data.latMax;
        var lngMin = data.lngMin;
        var lngMax = data.lngMax;
        var latRange = latMax - latMin;
        var lngRange = lngMax - lngMin;

        function gridToLatLng(coords) {
            var result = [];
            for (var i = 0; i < coords.length; i++) {
                var ring = [];
                for (var j = 0; j < coords[i].length; j++) {
                    var x = coords[i][j][0];
                    var y = coords[i][j][1];
                    var lng = lngMin + (x / cols) * lngRange;
                    var lat = latMax - (y / rows) * latRange;
                    ring.push([lat, lng]);
                }
                result.push(ring);
            }
            return result;
        }

        // Build Leaflet layers
        var layers = [];
        var self = this;
        var mode = this.contourDisplayMode;

        for (var c = 0; c < contours.length; c++) {
            var contour = contours[c];
            var colorIdx = c;
            var fillColor = this.fillColors[Math.min(colorIdx, this.fillColors.length - 1)];
            var outlineColor = this.outlineColors[Math.min(colorIdx, this.outlineColors.length - 1)];

            for (var p = 0; p < contour.coordinates.length; p++) {
                var polygon = contour.coordinates[p];
                var latLngRings = gridToLatLng(polygon);

                if (mode === 'fill') {
                    var poly = L.polygon(latLngRings, {
                        fillColor: fillColor,
                        fillOpacity: 0.7,
                        color: '#000000',
                        weight: 1.5,
                        opacity: 0.8
                    });
                    layers.push(poly);
                } else if (mode === 'outline') {
                    var poly = L.polygon(latLngRings, {
                        fillColor: 'transparent',
                        fillOpacity: 0,
                        color: outlineColor,
                        weight: 2,
                        opacity: 1
                    });
                    layers.push(poly);
                }
            }
        }
        // Draw domain extent box
        var domainBounds = [
            [data.latMin, data.lngMin],
            [data.latMin, data.lngMax],
            [data.latMax, data.lngMax],
            [data.latMax, data.lngMin]
        ];
        var domainBox = L.polygon(domainBounds, {
            fillColor: 'transparent',
            fillOpacity: 0,
            color: '#ffffff',
            weight: 2,
            opacity: 0.9,
            dashArray: '8, 6'
        });
        layers.push(domainBox);

        // Add domain label that follows the nearest visible corner
        var domainLabelMarker = null;
        var self = this;

        function updateDomainLabel() {
            if (domainLabelMarker) {
                self.map.removeLayer(domainLabelMarker);
                domainLabelMarker = null;
            }

            var mapBounds = self.map.getBounds();
            var corners = [
                { lat: data.latMax, lng: data.lngMax, anchorX: -5, anchorY: 20 },   // top-right
                { lat: data.latMax, lng: data.lngMin, anchorX: 85, anchorY: 20 },    // top-left
                { lat: data.latMin, lng: data.lngMax, anchorX: -5, anchorY: -5 },    // bottom-right
                { lat: data.latMin, lng: data.lngMin, anchorX: 85, anchorY: -5 }     // bottom-left
            ];

            // Find the first visible corner
            var chosen = null;
            for (var i = 0; i < corners.length; i++) {
                if (mapBounds.contains(L.latLng(corners[i].lat, corners[i].lng))) {
                    chosen = corners[i];
                    break;
                }
            }

            // If no corner visible, place on nearest visible edge midpoint
            if (!chosen) {
                var edgeMids = [
                    { lat: data.latMax, lng: (data.lngMin + data.lngMax) / 2, anchorX: 45, anchorY: 20 },  // top edge
                    { lat: data.latMin, lng: (data.lngMin + data.lngMax) / 2, anchorX: 45, anchorY: -5 },   // bottom edge
                    { lat: (data.latMin + data.latMax) / 2, lng: data.lngMax, anchorX: -5, anchorY: 10 },   // right edge
                    { lat: (data.latMin + data.latMax) / 2, lng: data.lngMin, anchorX: 85, anchorY: 10 }    // left edge
                ];
                for (var i = 0; i < edgeMids.length; i++) {
                    if (mapBounds.contains(L.latLng(edgeMids[i].lat, edgeMids[i].lng))) {
                        chosen = edgeMids[i];
                        break;
                    }
                }
            }

            if (chosen) {
                domainLabelMarker = L.marker([chosen.lat, chosen.lng], {
                    icon: L.divIcon({
                        className: '',
                        html: '<div style="background: rgba(0,0,0,0); color: white; padding: 0px 0px; font-size: 11px; font-weight: 500; border-radius: 0px; white-space: nowrap;">Model Domain</div>',
                        iconAnchor: [chosen.anchorX, chosen.anchorY]
                    })
                });
                domainLabelMarker.addTo(self.map);
            }
        }

        // Update on map move/zoom
        this.map.on('moveend', updateDomainLabel);
        this.map.on('zoomend', updateDomainLabel);
        updateDomainLabel();

        // Store reference so clearAll can remove the listener
        this._domainLabelUpdate = updateDomainLabel;
        this._domainLabelMarker = domainLabelMarker;

        this.contourLayer = L.layerGroup(layers).addTo(this.map);
    },

    addContourControl: function () {
        var self = this;
        var contourControlDiv = L.control({ position: 'topleft' });
        contourControlDiv.onAdd = function (map) {
            var div = L.DomUtil.create('div', 'contour-control');
            div.style.background = 'white';
            div.style.padding = '12px';
            div.style.borderRadius = '4px';
            div.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
            div.style.fontSize = '13px';
            div.style.fontFamily = 'Arial, sans-serif';
            div.style.minWidth = '140px';

            var title = document.createElement('div');
            title.style.fontWeight = 'bold';
            title.style.marginBottom = '8px';
            title.textContent = 'Contour Display:';
            div.appendChild(title);

            var options = [
                { value: 'fill', label: 'Fill' },
                { value: 'outline', label: 'Outline' }
            ];

            options.forEach(function (option) {
                var optionDiv = document.createElement('div');
                optionDiv.style.marginBottom = '6px';
                optionDiv.style.display = 'flex';
                optionDiv.style.alignItems = 'center';

                var radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = 'contourDisplay';
                radio.value = option.value;
                radio.id = 'contour-' + option.value;
                radio.style.marginRight = '8px';
                if (option.value === 'fill') radio.checked = true;

                radio.onchange = function () {
                    self.setContourDisplay(option.value);
                };

                var label = document.createElement('label');
                label.htmlFor = 'contour-' + option.value;
                label.textContent = option.label;

                optionDiv.appendChild(radio);
                optionDiv.appendChild(label);
                div.appendChild(optionDiv);
            });

            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);
            return div;
        };
        contourControlDiv.addTo(this.map);
    },

    setContourDisplay: function (mode) {
        this.contourDisplayMode = mode;
        if (this.currentGridData) {
            this.renderContours(this.currentGridData);
        }
    },

    updateTimestampDisplay: function (timeStampString, isMaxContour) {
        if (this.timestampControl) {
            this.map.removeControl(this.timestampControl);
            this.timestampControl = null;
        }

        this.timestampControl = L.control({ position: 'topleft' });
        this.timestampControl.onAdd = function (map) {
            var div = L.DomUtil.create('div', 'timestamp-box');
            div.style.background = 'white';
            div.style.padding = '10px 14px';
            div.style.fontSize = '14px';
            div.style.fontWeight = 'bold';
            div.style.borderRadius = '4px';
            div.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
            div.style.marginTop = '50px';
            var displayText = isMaxContour ? 'Max contour' : timeStampString;
            div.innerHTML = '<div>Simulation time</div><div style="font-size:16px;margin-top:4px;">' + displayText + '</div>';
            L.DomEvent.disableClickPropagation(div);
            return div;
        };
        this.timestampControl.addTo(this.map);
    },

    addLegend: function () {
        if (this.legendControl) { this.map.removeControl(this.legendControl); }

        this.legendControl = L.control({ position: 'bottomright' });
        this.legendControl.onAdd = function (map) {
            var div = L.DomUtil.create('div', 'legend');
            div.style.background = 'white';
            div.style.padding = '4px 8px';
            div.style.fontSize = '13px';
            div.style.borderRadius = '4px';
            div.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
            div.style.width = '250px';

            div.innerHTML = '<h4 style="margin:0 0 3px 0;font-size:15px;">Wind Rose Legend (m/s)</h4>';

            var windBins = [
                { color: '#9BA292', label: '0-2' },
                { color: '#819070', label: '2-4' },
                { color: '#677C50', label: '4-6' },
                { color: '#526146', label: '6-8' },
                { color: '#3E4E33', label: '8-10' },
                { color: '#293522', label: '>10' }
            ];

            windBins.forEach(function (bin) {
                div.innerHTML += '<div style="display:flex;align-items:center;margin:1px 0;font-weight:bold;"><div style="width:24px;height:18px;margin-right:8px;border:1px solid #666;background:' + bin.color + ';"></div>' + bin.label + '</div>';
            });

            div.innerHTML += '<hr style="border-top:1px solid #ccc;margin:5px 0;"><h4 style="margin:0 0 3px 0;font-size:15px;">Percent of Max Value</h4>';

            var ranges = [
                { color: 'rgba(139, 0, 0, 0.7)', label: '≥ 75%' },
                { color: 'rgba(220, 50, 50, 0.7)', label: '35 - 75%' },
                { color: 'rgba(255, 120, 120, 0.7)', label: '10 - 35%' },
                { color: 'rgba(255, 200, 200, 0.7)', label: '5 - 10%' },
                { color: 'rgba(255, 245, 245, 0.7)', label: '2.5 - 5%' },
                { color: 'rgba(255, 255, 255, 0.0)', label: '< 2.5%' }
            ];

            ranges.forEach(function (r) {
                div.innerHTML += '<div style="display:flex;align-items:center;margin:1px 0;font-weight:bold;"><div style="width:24px;height:18px;margin-right:8px;border:1px solid #999;background:' + r.color + ';"></div>' + r.label + '</div>';
            });

            return div;
        };
        this.legendControl.addTo(this.map);
    },

    drawWindrose: function (windroseJson, isHourly) {
        var windroseData = JSON.parse(windroseJson);
        window.windroseData = windroseData;
        window.isHourlyMode = isHourly ? true : false;

        if (this.windroseControl) {
            this.map.removeControl(this.windroseControl);
            this.windroseControl = null;
        }

        var WindroseControl = L.Control.extend({
            options: { position: 'topright' },
            onAdd: function (map) {
                var container = L.DomUtil.create('div', 'leaflet-bar');
                container.style.background = 'transparent';
                container.style.border = 'none';
                container.style.boxShadow = 'none';
                container.style.padding = '0';
                container.style.margin = '0';

                var htmlContent = '';
                if (isHourly && typeof createWindroseHTML_Hourly === 'function') {
                    htmlContent = createWindroseHTML_Hourly();
                } else if (typeof createWindroseHTML === 'function') {
                    htmlContent = createWindroseHTML();
                }

                container.innerHTML = htmlContent;
                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.disableScrollPropagation(container);
                return container;
            }
        });

        this.windroseControl = new WindroseControl();
        this.windroseControl.addTo(this.map);
    },

    clearAll: function () {
        if (this.contourLayer) { this.map.removeLayer(this.contourLayer); this.contourLayer = null; }
        if (this.legendControl) { this.map.removeControl(this.legendControl); this.legendControl = null; }
        if (this.windroseControl) { this.map.removeControl(this.windroseControl); this.windroseControl = null; }
        if (this.timestampControl) { this.map.removeControl(this.timestampControl); this.timestampControl = null; }
        if (this._domainLabelMarker) { this.map.removeLayer(this._domainLabelMarker); this._domainLabelMarker = null; }
        if (this._domainLabelUpdate) { this.map.off('moveend', this._domainLabelUpdate); this.map.off('zoomend', this._domainLabelUpdate); this._domainLabelUpdate = null; }
        this.currentGridData = null;
    },
    resetView: function () {
        if (this.map) {
            this.map.setView([-23.879940, 151.316414], 12);
        }
    }
};