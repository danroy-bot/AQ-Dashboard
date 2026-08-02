using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;

namespace AQ_Dashboard.Services
{
    public class LongTermAqRecord
    {
        public DateTime Timestamp { get; set; }
        public double? WindDirection { get; set; }
        public double? WindSpeed { get; set; }
        public double? AirTemperature { get; set; }
        public double? RelativeHumidity { get; set; }
        public double? Rainfall { get; set; }
        public double? BarometricPressure { get; set; }
        public double? SolarRadiation { get; set; }
        public double? NO { get; set; }
        public double? NO2 { get; set; }
        public double? NOx { get; set; }
        public double? SO2 { get; set; }
        public double? PM10 { get; set; }
        public double? PM25 { get; set; }
        public double? Visibility { get; set; }
    }

    public static class LongTermAqDataLoader
    {
        private static List<LongTermAqRecord>? _cache;
        private static string? _cachedPath;

        public static List<LongTermAqRecord> LoadRecords(string csvPath)
        {
            if (_cache != null && _cachedPath == csvPath)
                return _cache;

            var records = new List<LongTermAqRecord>();

            if (!File.Exists(csvPath))
                return records;

            var lines = File.ReadAllLines(csvPath);

            for (int i = 1; i < lines.Length; i++)
            {
                var line = lines[i];
                if (string.IsNullOrWhiteSpace(line)) continue;

                var v = line.Split(',');
                if (v.Length < 18) continue;

                if (!DateTime.TryParseExact($"{v[0]} {v[1]}", "dd/MM/yyyy HH:mm",
                    CultureInfo.InvariantCulture, DateTimeStyles.None, out var timestamp))
                    continue;

                records.Add(new LongTermAqRecord
                {
                    Timestamp = timestamp,
                    WindDirection = ParseNullable(v[2]),
                    WindSpeed = ParseNullable(v[3]),
                    AirTemperature = ParseNullable(v[6]),
                    RelativeHumidity = ParseNullable(v[7]),
                    Rainfall = ParseNullable(v[8]),
                    BarometricPressure = ParseNullable(v[9]),
                    SolarRadiation = ParseNullable(v[10]),
                    NO = ParseNullable(v[11]),
                    NO2 = ParseNullable(v[12]),
                    NOx = ParseNullable(v[13]),
                    SO2 = ParseNullable(v[14]),
                    PM10 = ParseNullable(v[15]),
                    PM25 = ParseNullable(v[16]),
                    Visibility = ParseNullable(v[17]),
                });
            }

            _cache = records;
            _cachedPath = csvPath;
            return records;
        }

        private static double? ParseNullable(string s)
        {
            if (string.IsNullOrWhiteSpace(s)) return null;
            return double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var d) ? d : null;
        }
    }
}
