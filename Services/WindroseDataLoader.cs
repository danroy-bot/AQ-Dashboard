using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Globalization;

namespace AQ_Dashboard.Services
{
    public static class WindroseDataLoader
    {
        // Generates windrose JSON from pre-loaded speed and direction data
        public static string GenerateWindroseJson(List<double> speeds, List<double> directions)
        {
            // Create windrose data structure
            var dirBins = new[] { 0.0, 22.5, 45.0, 67.5, 90.0, 112.5, 135.0, 157.5, 180.0, 202.5, 225.0, 247.5, 270.0, 292.5, 315.0, 337.5 };
            var speedBins = new[] { (0.0, 2.0), (2.0, 4.0), (4.0, 6.0), (6.0, 8.0), (8.0, 10.0), (10.0, 999.0) };
            var speedLabels = new[] { "0-2", "2-4", "4-6", "6-8", "8-10", ">10" };

            // Count occurrences
            var data = new Dictionary<string, double[]>();
            foreach (var label in speedLabels)
            {
                data[label] = new double[16];
            }

            for (int i = 0; i < speeds.Count; i++)
            {
                var speed = speeds[i];
                var direction = directions[i];

                // Find speed bin
                int speedIdx = 0;
                for (int j = 0; j < speedBins.Length; j++)
                {
                    if (speed >= speedBins[j].Item1 && speed < speedBins[j].Item2)
                    {
                        speedIdx = j;
                        break;
                    }
                }

                // Find direction bin
                int dirIdx = (int)((direction % 360) / 22.5) % 16;

                data[speedLabels[speedIdx]][dirIdx]++;
            }

            // Convert to percentages
            double total = speeds.Count;
            foreach (var label in speedLabels)
            {
                for (int i = 0; i < 16; i++)
                {
                    data[label][i] = data[label][i] / total * 100.0;
                }
            }

            // Build JSON
            var json = "{\n";
            json += "  \"directions\": [" + string.Join(", ", dirBins) + "],\n";
            json += "  \"speedBins\": [" + string.Join(", ", speedLabels.Select(s => $"\"{s}\"")) + "],\n";
            json += "  \"data\": {\n";

            var dataLines = new List<string>();
            foreach (var kvp in data)
            {
                var values = string.Join(", ", kvp.Value.Select(v => v.ToString("F2")));
                dataLines.Add($"    \"{kvp.Key}\": [{values}]");
            }
            json += string.Join(",\n", dataLines) + "\n";

            json += "  },\n";
            json += "  \"location\": [-23.879940, 151.316414],\n";
            json += "  \"period\": \"Sample data\"\n";
            json += "}";

            return json;
        }
    }
}
