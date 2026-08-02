window.chartInterop = {
    chart: null,

    createTimeSeriesChart: function (elementId, labels, values, parameterName, units, color) {
        var ctx = document.getElementById(elementId);
        if (!ctx) return;

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: parameterName + ' (' + units + ')',
                    data: values,
                    borderColor: color || '#3F93B1',
                    backgroundColor: 'rgba(63, 147, 177, 0.1)',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: { font: { size: 12, weight: 'bold' } }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleFont: { size: 12 },
                        bodyFont: { size: 12 }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            maxTicksLimit: 12,
                            font: { size: 10 },
                            maxRotation: 45
                        },
                        grid: { display: false }
                    },
                    y: {
                        title: {
                            display: true,
                            text: parameterName + ' (' + units + ')',
                            font: { size: 12, weight: 'bold' }
                        },
                        ticks: { font: { size: 10 } },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    }
                }
            }
        });
    },

    destroyChart: function () {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
    ,

    // keyed by canvas id, so multiple charts can coexist without stepping on `this.chart`
    namedCharts: {},

    createNamedChart: function (elementId, type, labels, values, label, units, color, refValue, refLabel) {
        var ctx = document.getElementById(elementId);
        if (!ctx) return;

        if (this.namedCharts[elementId]) {
            this.namedCharts[elementId].destroy();
        }

        var seriesLabel = label + (units ? ' (' + units + ')' : '');

        var datasets = [{
            label: seriesLabel,
            data: values,
            borderColor: color || '#758A64',
            backgroundColor: type === 'bar' ? (color || '#758A64') : 'rgba(200, 200, 200, 0.25)',
            borderWidth: 1.5,
            pointRadius: type === 'line' ? 0 : undefined,
            pointHoverRadius: type === 'line' ? 4 : undefined,
            fill: type === 'line',
            tension: 0.3
        }];

        if (typeof refValue === 'number') {
            datasets.push({
                label: refLabel || 'Reference',
                data: labels.map(function () { return refValue; }),
                borderColor: '#800000',
                backgroundColor: 'transparent',
                borderWidth: 1.5,
                borderDash: [6, 4],
                pointRadius: 0,
                pointHitRadius: 0,
                fill: false,
                tension: 0
            });
        }

        this.namedCharts[elementId] = new Chart(ctx, {
            type: type,
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: { display: false },
                    tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleFont: { size: 12 }, bodyFont: { size: 12 } }
                },
                scales: {
                    x: {
                        ticks: { maxTicksLimit: 12, font: { size: 10 }, maxRotation: 45 },
                        grid: { display: false }
                    },
                    y: {
                        title: { display: true, text: seriesLabel, font: { size: 12, weight: 'bold' } },
                        ticks: { font: { size: 10 } },
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        beginAtZero: true
                    }
                }
            }
        });
    },

    destroyNamedChart: function (elementId) {
        if (this.namedCharts[elementId]) {
            this.namedCharts[elementId].destroy();
            delete this.namedCharts[elementId];
        }
    },

    windroseChart: null,

    createWindroseChart: function (elementId, speeds, directions) {
        var container = document.getElementById(elementId);
        if (!container) return;

        var size = 280;
        var center = size / 2;
        var maxRadius = center - 50;

        // Bin data into 16 directions and 6 speed categories
        var dirBins = 16;
        var speedRanges = [
            { min: 0, max: 2, label: '0-2', color: '#9BA292' },
            { min: 2, max: 4, label: '2-4', color: '#819070' },
            { min: 4, max: 6, label: '4-6', color: '#677C50' },
            { min: 6, max: 8, label: '6-8', color: '#526146' },
            { min: 8, max: 10, label: '8-10', color: '#3E4E33' },
            { min: 10, max: 999, label: '>10', color: '#293522' }
        ];

        // Initialize bins
        var bins = [];
        for (var d = 0; d < dirBins; d++) {
            bins[d] = [];
            for (var s = 0; s < speedRanges.length; s++) {
                bins[d][s] = 0;
            }
        }

        // Fill bins
        var total = 0;
        for (var i = 0; i < speeds.length; i++) {
            if (speeds[i] === null || directions[i] === null) continue;
            var spd = speeds[i];
            var dir = directions[i];

            var dIdx = Math.round(dir / (360 / dirBins)) % dirBins;
            var sIdx = 0;
            for (var s = 0; s < speedRanges.length; s++) {
                if (spd >= speedRanges[s].min && spd < speedRanges[s].max) {
                    sIdx = s;
                    break;
                }
            }
            bins[dIdx][sIdx]++;
            total++;
        }

        if (total === 0) {
            container.innerHTML = '<div style="text-align:center;color:#adb5bd;padding:20px;font-size:13px;">No wind data available</div>';
            return;
        }

        // Convert to percentages
        for (var d = 0; d < dirBins; d++) {
            for (var s = 0; s < speedRanges.length; s++) {
                bins[d][s] = (bins[d][s] / total) * 100;
            }
        }

        // Find max total per direction
        var maxVal = 0;
        for (var d = 0; d < dirBins; d++) {
            var sum = 0;
            for (var s = 0; s < speedRanges.length; s++) sum += bins[d][s];
            maxVal = Math.max(maxVal, sum);
        }

        // Draw SVG
        var svg = '<svg width="' + size + '" height="' + size + '" style="background:transparent;">';

        // Grid circles
        var circles = [0.25, 0.5, 0.75, 1.0];
        circles.forEach(function (r) {
            var radius = maxRadius * r;
            svg += '<circle cx="' + center + '" cy="' + center + '" r="' + radius + '" fill="none" stroke="#ddd" stroke-width="0.5"/>';
            var pct = (r * maxVal).toFixed(0);
            svg += '<text x="' + (center + 3) + '" y="' + (center - radius + 12) + '" font-size="9" fill="#999">' + pct + '%</text>';
        });

        // Grid lines
        for (var angle = 0; angle < 360; angle += 45) {
            var rad = (angle - 90) * Math.PI / 180;
            var x2 = center + maxRadius * Math.cos(rad);
            var y2 = center + maxRadius * Math.sin(rad);
            svg += '<line x1="' + center + '" y1="' + center + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#ddd" stroke-width="0.5"/>';
        }

        // Draw petals
        var angleStep = 360 / dirBins;
        for (var d = 0; d < dirBins; d++) {
            var angle = d * angleStep;
            var startAngle = angle - angleStep / 2;
            var endAngle = angle + angleStep / 2;
            var cumRadius = 0;

            for (var s = 0; s < speedRanges.length; s++) {
                var val = bins[d][s];
                if (val > 0) {
                    var radius = (val / maxVal) * maxRadius;
                    var inner = cumRadius;
                    var outer = cumRadius + radius;

                    var sr1 = (startAngle - 90) * Math.PI / 180;
                    var er1 = (endAngle - 90) * Math.PI / 180;
                    var x1 = center + inner * Math.cos(sr1);
                    var y1 = center + inner * Math.sin(sr1);
                    var x2 = center + outer * Math.cos(sr1);
                    var y2 = center + outer * Math.sin(sr1);
                    var x3 = center + outer * Math.cos(er1);
                    var y3 = center + outer * Math.sin(er1);
                    var x4 = center + inner * Math.cos(er1);
                    var y4 = center + inner * Math.sin(er1);
                    var la = (endAngle - startAngle) > 180 ? 1 : 0;

                    var path = 'M ' + x1 + ' ' + y1 + ' L ' + x2 + ' ' + y2 +
                        ' A ' + outer + ' ' + outer + ' 0 ' + la + ' 1 ' + x3 + ' ' + y3 +
                        ' L ' + x4 + ' ' + y4 +
                        ' A ' + inner + ' ' + inner + ' 0 ' + la + ' 0 ' + x1 + ' ' + y1 + ' Z';

                    svg += '<path d="' + path + '" fill="' + speedRanges[s].color + '" opacity="0.85" stroke="white" stroke-width="0.3"/>';
                    cumRadius = outer;
                }
            }
        }

        // Direction labels
        var dirs = [
            { text: 'N', angle: 0 }, { text: 'NE', angle: 45 },
            { text: 'E', angle: 90 }, { text: 'SE', angle: 135 },
            { text: 'S', angle: 180 }, { text: 'SW', angle: 225 },
            { text: 'W', angle: 270 }, { text: 'NW', angle: 315 }
        ];
        dirs.forEach(function (d) {
            var rad = (d.angle - 90) * Math.PI / 180;
            var x = center + (maxRadius + 18) * Math.cos(rad);
            var y = center + (maxRadius + 18) * Math.sin(rad);
            svg += '<text x="' + x + '" y="' + y + '" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="bold" fill="#495057">' + d.text + '</text>';
        });

        svg += '<circle cx="' + center + '" cy="' + center + '" r="2" fill="#495057"/>';
        svg += '</svg>';

        // Legend
        var legend = '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:4px;">';
        speedRanges.forEach(function (r) {
            legend += '<div style="display:flex;align-items:center;gap:3px;font-size:10px;color:#666;">' +
                '<div style="width:10px;height:10px;background:' + r.color + ';border-radius:2px;"></div>' +
                r.label + ' m/s</div>';
        });
        legend += '</div>';

        // wrap svg+legend together so the container's own flex row can't split them apart
        container.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;">' + svg + legend + '</div>';
    },

    // same geometry as createWindroseChart, stacked by concentration band instead of wind speed
    createPollutionRose: function (elementId, directions, binMatrix, binLabels, units) {
        var container = document.getElementById(elementId);
        if (!container) return;

        var size = 280;
        var center = size / 2;
        var maxRadius = center - 50;

        var dirBins = directions.length;
        var numBins = binLabels.length;
        var spectrumColors = ['#313695', '#74ADD1', '#ABDDA4', '#FEE08B', '#FDAE61', '#D73027'];

        var maxVal = 0;
        for (var d = 0; d < dirBins; d++) {
            var sum = 0;
            for (var b = 0; b < numBins; b++) sum += binMatrix[d][b];
            maxVal = Math.max(maxVal, sum);
        }

        if (maxVal <= 0) {
            container.innerHTML = '<div style="text-align:center;color:#adb5bd;padding:20px;font-size:13px;">No data available</div>';
            return;
        }

        var svg = '<svg width="' + size + '" height="' + size + '" style="background:transparent;">';

        var circles = [0.25, 0.5, 0.75, 1.0];
        circles.forEach(function (r) {
            var radius = maxRadius * r;
            svg += '<circle cx="' + center + '" cy="' + center + '" r="' + radius + '" fill="none" stroke="#ddd" stroke-width="0.5"/>';
            var pct = (r * maxVal).toFixed(0);
            svg += '<text x="' + (center + 3) + '" y="' + (center - radius + 12) + '" font-size="9" fill="#999">' + pct + '%</text>';
        });

        for (var angle = 0; angle < 360; angle += 45) {
            var rad = (angle - 90) * Math.PI / 180;
            var x2 = center + maxRadius * Math.cos(rad);
            var y2 = center + maxRadius * Math.sin(rad);
            svg += '<line x1="' + center + '" y1="' + center + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#ddd" stroke-width="0.5"/>';
        }

        var angleStep = 360 / dirBins;
        for (var d = 0; d < dirBins; d++) {
            var angle = directions[d];
            var startAngle = angle - angleStep / 2;
            var endAngle = angle + angleStep / 2;
            var cumRadius = 0;

            for (var b = 0; b < numBins; b++) {
                var val = binMatrix[d][b];
                if (val > 0) {
                    var radius = (val / maxVal) * maxRadius;
                    var inner = cumRadius;
                    var outer = cumRadius + radius;

                    var sr1 = (startAngle - 90) * Math.PI / 180;
                    var er1 = (endAngle - 90) * Math.PI / 180;
                    var x1 = center + inner * Math.cos(sr1);
                    var y1 = center + inner * Math.sin(sr1);
                    var x2 = center + outer * Math.cos(sr1);
                    var y2 = center + outer * Math.sin(sr1);
                    var x3 = center + outer * Math.cos(er1);
                    var y3 = center + outer * Math.sin(er1);
                    var x4 = center + inner * Math.cos(er1);
                    var y4 = center + inner * Math.sin(er1);
                    var la = (endAngle - startAngle) > 180 ? 1 : 0;

                    var path = 'M ' + x1 + ' ' + y1 + ' L ' + x2 + ' ' + y2 +
                        ' A ' + outer + ' ' + outer + ' 0 ' + la + ' 1 ' + x3 + ' ' + y3 +
                        ' L ' + x4 + ' ' + y4 +
                        ' A ' + inner + ' ' + inner + ' 0 ' + la + ' 0 ' + x1 + ' ' + y1 + ' Z';

                    svg += '<path d="' + path + '" fill="' + spectrumColors[b % spectrumColors.length] + '" opacity="0.85" stroke="white" stroke-width="0.3"/>';
                    cumRadius = outer;
                }
            }
        }

        var dirs = [
            { text: 'N', angle: 0 }, { text: 'NE', angle: 45 },
            { text: 'E', angle: 90 }, { text: 'SE', angle: 135 },
            { text: 'S', angle: 180 }, { text: 'SW', angle: 225 },
            { text: 'W', angle: 270 }, { text: 'NW', angle: 315 }
        ];
        dirs.forEach(function (dd) {
            var rad = (dd.angle - 90) * Math.PI / 180;
            var x = center + (maxRadius + 18) * Math.cos(rad);
            var y = center + (maxRadius + 18) * Math.sin(rad);
            svg += '<text x="' + x + '" y="' + y + '" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="bold" fill="#495057">' + dd.text + '</text>';
        });

        svg += '<circle cx="' + center + '" cy="' + center + '" r="2" fill="#495057"/>';
        svg += '</svg>';

        var legend = '<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:4px;">';
        for (var b2 = 0; b2 < numBins; b2++) {
            legend += '<div style="display:flex;align-items:center;gap:3px;font-size:9px;color:#666;">' +
                '<div style="width:10px;height:10px;background:' + spectrumColors[b2 % spectrumColors.length] + ';border-radius:2px;"></div>' +
                binLabels[b2] + (units ? ' ' + units : '') + '</div>';
        }
        legend += '</div>';

        container.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;">' + svg + legend + '</div>';
    }
};