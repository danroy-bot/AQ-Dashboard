using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;

namespace AQ_Dashboard.Services
{
    public class GridData
    {
        public int Rows { get; set; }
        public int Columns { get; set; }
        public double XMin { get; set; }
        public double XMax { get; set; }
        public double YMin { get; set; }
        public double YMax { get; set; }
        public double ZMin { get; set; }
        public double ZMax { get; set; }
        public double[,] Data { get; set; } = new double[0, 0];

        public static GridData ParseDSAA(string filePath)
        {
            var grid = new GridData();
            var lines = File.ReadAllLines(filePath);

            // Parse header
            if (lines[0].Trim() != "DSAA")
                throw new Exception("Not a valid DSAA file");

            // Parse dimensions
            var dims = lines[1].Trim().Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            grid.Columns = int.Parse(dims[0]);
            grid.Rows = int.Parse(dims[1]);

            // Parse X range
            var xRange = lines[2].Trim().Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            grid.XMin = double.Parse(xRange[0], CultureInfo.InvariantCulture);
            grid.XMax = double.Parse(xRange[1], CultureInfo.InvariantCulture);

            // Parse Y range
            var yRange = lines[3].Trim().Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            grid.YMin = double.Parse(yRange[0], CultureInfo.InvariantCulture);
            grid.YMax = double.Parse(yRange[1], CultureInfo.InvariantCulture);

            // Parse Z range
            var zRange = lines[4].Trim().Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            grid.ZMin = double.Parse(zRange[0], CultureInfo.InvariantCulture);
            grid.ZMax = double.Parse(zRange[1], CultureInfo.InvariantCulture);

            // Parse data values
            grid.Data = new double[grid.Rows, grid.Columns];
            var allValues = new List<double>();

            // Read all data lines (starting from line 5)
            for (int i = 5; i < lines.Length; i++)
            {
                var line = lines[i].Trim();
                if (string.IsNullOrWhiteSpace(line)) continue;

                // Split by whitespace and parse each value
                var values = line.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var val in values)
                {
                    // Handle scientific notation (e.g., 0.0000E+00)
                    double value = double.Parse(val, NumberStyles.Float, CultureInfo.InvariantCulture);
                    allValues.Add(value);
                }
            }

            // Fill the 2D array (row by row)
            int idx = 0;
            for (int row = 0; row < grid.Rows; row++)
            {
                for (int col = 0; col < grid.Columns; col++)
                {
                    if (idx < allValues.Count)
                    {
                        grid.Data[row, col] = allValues[idx];
                        idx++;
                    }
                }
            }


            return grid;
        }

        // Convert UTM56S (km) to lat/lng
        public static (double lat, double lng) UTM56SToLatLng(double eastingKm, double northingKm)
        {
            // Convert km to meters
            double easting = eastingKm * 1000;
            double northing = northingKm * 1000;

            // UTM Zone 56S parameters
            double a = 6378137.0; // WGS84 semi-major axis
            double e = 0.081819191; // WGS84 eccentricity
            double k0 = 0.9996; // Scale factor
            double E0 = 500000; // False easting
            double N0 = 10000000; // False northing for southern hemisphere

            double x = easting - E0;
            double y = northing - N0;

            double M = y / k0;
            double mu = M / (a * (1 - Math.Pow(e, 2) / 4 - 3 * Math.Pow(e, 4) / 64 - 5 * Math.Pow(e, 6) / 256));

            double e1 = (1 - Math.Sqrt(1 - e * e)) / (1 + Math.Sqrt(1 - e * e));
            double phi1 = mu + (3 * e1 / 2 - 27 * Math.Pow(e1, 3) / 32) * Math.Sin(2 * mu)
                            + (21 * Math.Pow(e1, 2) / 16 - 55 * Math.Pow(e1, 4) / 32) * Math.Sin(4 * mu)
                            + (151 * Math.Pow(e1, 3) / 96) * Math.Sin(6 * mu);

            double C1 = e * e * Math.Pow(Math.Cos(phi1), 2) / (1 - e * e);
            double T1 = Math.Pow(Math.Tan(phi1), 2);
            double N1 = a / Math.Sqrt(1 - e * e * Math.Pow(Math.Sin(phi1), 2));
            double R1 = a * (1 - e * e) / Math.Pow(1 - e * e * Math.Pow(Math.Sin(phi1), 2), 1.5);
            double D = x / (N1 * k0);

            double lat = phi1 - (N1 * Math.Tan(phi1) / R1) * (Math.Pow(D, 2) / 2
                         - (5 + 3 * T1 + 10 * C1 - 4 * Math.Pow(C1, 2) - 9 * e * e) * Math.Pow(D, 4) / 24
                         + (61 + 90 * T1 + 298 * C1 + 45 * Math.Pow(T1, 2) - 252 * e * e - 3 * Math.Pow(C1, 2)) * Math.Pow(D, 6) / 720);

            double lng = (D - (1 + 2 * T1 + C1) * Math.Pow(D, 3) / 6
                         + (5 - 2 * C1 + 28 * T1 - 3 * Math.Pow(C1, 2) + 8 * e * e + 24 * Math.Pow(T1, 2)) * Math.Pow(D, 5) / 120) / Math.Cos(phi1);

            // Central meridian for Zone 56 is 153 degrees E
            lng = 153.0 + lng * 180.0 / Math.PI;
            lat = lat * 180.0 / Math.PI;

            // For southern hemisphere, latitude is negative
            return (lat, lng);
        }
    }
}
