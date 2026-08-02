// ========================================
// WINDROSE DATA
//========================================
//var windroseData = {
//    "directions": [0.0, 22.5, 45.0, 67.5, 90.0, 112.5, 135.0, 157.5, 180.0, 202.5, 225.0, 247.5, 270.0, 292.5, 315.0, 337.5],
//    "speedBins": ["0-2", "2-4", "4-6", "6-8", "8-10", ">10"],
//    "data": {
//        "0-2": [4.25, 4.79, 4.86, 4.61, 5.29, 7.92, 7.6, 7.54, 10.21, 6.02, 2.88, 2.12, 1.45, 2.15, 2.57, 2.31],
//        "2-4": [2.64, 3.58, 3.41, 2.61, 2.25, 1.72, 0.96, 0.66, 0.91, 0.57, 0.24, 0.15, 0.04, 0.07, 0.25, 0.63],
//        "4-6": [0.21, 0.39, 0.52, 0.47, 0.44, 0.23, 0.08, 0.03, 0.04, 0.02, 0.0, 0.0, 0.0, 0.0, 0.0, 0.05],
//        "6-8": [0.0, 0.0, 0.03, 0.05, 0.02, 0.01, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
//        "8-10": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
//        ">10": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
//    },
//    "location": [-23.929006, 151.338478],
//    "period": "10-13 Nov 2025"
//};

// ========================================
// WINDROSE RENDERING FUNCTIONS
// ========================================
function createWindroseHTML() {    
    var size = 350;
    var center = size / 2;
    var maxRadius = center - 105;

    var html = '<svg width="' + size + '" height="' + size + '" style="background: transparent;">';

    var maxValue = 0;
    windroseData.speedBins.forEach(function (bin) {
        windroseData.data[bin].forEach(function (val) {
            maxValue = Math.max(maxValue, val);
        });
    });

    var circles = [0.25, 0.5, 0.75, 1.0];
    circles.forEach(function (r) {
        var radius = maxRadius * r;
        html += '<circle cx="' + center + '" cy="' + center + '" r="' + radius + '" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.6"/>';
    });

    for (var angle = 0; angle < 360; angle += 45) {
        var rad = (angle - 90) * Math.PI / 180;
        var x2 = center + maxRadius * Math.cos(rad);
        var y2 = center + maxRadius * Math.sin(rad);
        html += '<line x1="' + center + '" y1="' + center + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#ffffff" stroke-width="1" opacity="0.6"/>';
    }

    var colors = ['#9BA292', '#819070', '#677C50', '#526146', '#3E4E33', '#293522'];

    var numDirections = windroseData.directions.length;
    var angleStep = 360 / numDirections;

    windroseData.directions.forEach(function (dir, i) {
        var angle = dir;
        var startAngle = angle - angleStep / 2;
        var endAngle = angle + angleStep / 2;

        var cumulativeRadius = 0;

        windroseData.speedBins.forEach(function (bin, j) {
            var value = windroseData.data[bin][i];
            if (value > 0) {
                var radius = (value / maxValue) * maxRadius;
                var innerRadius = cumulativeRadius;
                var outerRadius = cumulativeRadius + radius;

                var path = createPetalPath(center, center, innerRadius, outerRadius, startAngle, endAngle);
                html += '<path d="' + path + '" fill="' + colors[j] + '" opacity="0.85" stroke="white" stroke-width="0.5"/>';

                cumulativeRadius = outerRadius;
            }
        });
    });

    circles.forEach(function (r) {
        var radius = maxRadius * r;
        var freq = (r * maxValue).toFixed(0);
        html += '<text x="' + (center + 3) + '" y="' + (center - radius + 3) + '" font-size="12" fill="#ffffff" stroke="#000000" stroke-width="0.01">' + freq + '%</text>';
    });

    var directions = [
        { text: 'N', angle: 0 },
        { text: 'NE', angle: 45 },
        { text: 'E', angle: 90 },
        { text: 'SE', angle: 135 },
        { text: 'S', angle: 180 },
        { text: 'SW', angle: 225 },
        { text: 'W', angle: 270 },
        { text: 'NW', angle: 315 }
    ];

    directions.forEach(function (d) {
        var rad = (d.angle - 90) * Math.PI / 180;
        var x = center + (maxRadius + 15) * Math.cos(rad);
        var y = center + (maxRadius + 15) * Math.sin(rad);
        html += '<text x="' + x + '" y="' + y + '" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="bold" fill="#ffffff" stroke="#000000" stroke-width="0.5">' + d.text + '</text>';
    });

    html += '<circle cx="' + center + '" cy="' + center + '" r="2" fill="#ffffff" stroke="#000000" stroke-width="0.5"/>';

    html += '</svg>';

    // Save the max axis value to global variable for hourly use
    window.windroseMaxAxisValue = maxValue;
    console.log('[windrose_max] Saved axis value to global:', maxValue);

    return html;
}

function createPetalPath(cx, cy, innerR, outerR, startAngle, endAngle) {
    var startRad1 = (startAngle - 90) * Math.PI / 180;
    var endRad1 = (endAngle - 90) * Math.PI / 180;

    var x1 = cx + innerR * Math.cos(startRad1);
    var y1 = cy + innerR * Math.sin(startRad1);
    var x2 = cx + outerR * Math.cos(startRad1);
    var y2 = cy + outerR * Math.sin(startRad1);
    var x3 = cx + outerR * Math.cos(endRad1);
    var y3 = cy + outerR * Math.sin(endRad1);
    var x4 = cx + innerR * Math.cos(endRad1);
    var y4 = cy + innerR * Math.sin(endRad1);

    var largeArcOuter = (endAngle - startAngle) > 180 ? 1 : 0;
    var largeArcInner = (endAngle - startAngle) > 180 ? 1 : 0;

    return 'M ' + x1 + ' ' + y1 +
        ' L ' + x2 + ' ' + y2 +
        ' A ' + outerR + ' ' + outerR + ' 0 ' + largeArcOuter + ' 1 ' + x3 + ' ' + y3 +
        ' L ' + x4 + ' ' + y4 +
        ' A ' + innerR + ' ' + innerR + ' 0 ' + largeArcInner + ' 0 ' + x1 + ' ' + y1 +
        ' Z';
}