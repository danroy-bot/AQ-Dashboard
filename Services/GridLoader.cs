using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;

namespace AQ_Dashboard.Services
{
    public class GridLoader
    {
        private static bool useAutomaticRange = true;
        private static double[] customThresholds = new double[] { 1, 2, 5, 10, 15 };

        public static Dictionary<string, double> pollutantMaxValues = new Dictionary<string, double>();

        private static DateTime simulationStartDate = DateTime.Now;

        private static Dictionary<string, string> prefixToPollutant = new Dictionary<string, string>()
        {
            { "1", "PM10" }, { "2", "PM2.5" }, { "3", "SO2" }, { "4", "PAHs" }, { "5", "F" }
        };

        public static void SetSimulationStartDate(DateTime startDate)
        {
            simulationStartDate = startDate;
        }

        public static DateTime GetGridFileTimestamp(int fileIndex)
        {
            return simulationStartDate.AddMinutes(fileIndex * 5);
        }

        // Returns a JS data string instead of pushing to WebView
        public static string LoadGridFile(string filePath, int fileIndex = 0)
        {
            var gridData = GridData.ParseDSAA(filePath);
            var bottomLeft = GridData.UTM56SToLatLng(gridData.XMin, gridData.YMin);
            var topRight = GridData.UTM56SToLatLng(gridData.XMax, gridData.YMax);
            var flatData = FlattenGridData(gridData);

            string fileName = Path.GetFileName(filePath);
            string pollutant = ExtractPollutantFromFilename(fileName);
            double zMaxToUse = GetZMaxValueToUse(pollutant, gridData.ZMax);

            var (rangeType, rangeValues) = GetRangeConfiguration(zMaxToUse);

            int actualTimestepIndex = fileIndex;
            bool isMaxContour = fileName.Contains("_Max");

            if (!isMaxContour && fileName.Contains("Timestep"))
            {
                string[] parts = fileName.Split('_');
                if (parts.Length > 0 && int.TryParse(parts[parts.Length - 1].Replace(".grd", ""), out int timestepNum))
                {
                    actualTimestepIndex = timestepNum - 1;
                }
            }

            DateTime fileTimestamp = GetGridFileTimestamp(actualTimestepIndex);
            string timeStampString = fileTimestamp.ToString("yyyy-MM-dd HH:mm:ss");

            return BuildJavaScriptData(gridData, bottomLeft, topRight, flatData,
                rangeType, rangeValues, zMaxToUse, timeStampString, isMaxContour);
        }

        public static void PreloadMaxContourValues(string baseDir)
        {
            if (!Directory.Exists(baseDir)) return;

            string[] maxFiles = Directory.GetFiles(baseDir, "*_Max*.grd");
            pollutantMaxValues.Clear();

            foreach (string filePath in maxFiles)
            {
                try
                {
                    string fileName = Path.GetFileName(filePath);
                    string pollutant = ExtractPollutantFromFilename(fileName);
                    if (string.IsNullOrEmpty(pollutant)) continue;

                    var gridData = GridData.ParseDSAA(filePath);
                    if (!pollutantMaxValues.ContainsKey(pollutant))
                        pollutantMaxValues[pollutant] = gridData.ZMax;
                }
                catch { }
            }
        }

        public static string ExtractPollutantFromFilename(string fileName)
        {
            try
            {
                string prefix = fileName.Split('_')[0];
                return prefixToPollutant.ContainsKey(prefix) ? prefixToPollutant[prefix] : null;
            }
            catch { }
            return null;
        }

        private static double GetZMaxValueToUse(string pollutant, double gridZMax)
        {
            if (!string.IsNullOrEmpty(pollutant) && pollutantMaxValues.ContainsKey(pollutant))
                return pollutantMaxValues[pollutant];
            return gridZMax;
        }

        private static List<double> FlattenGridData(GridData gridData)
        {
            var flatData = new List<double>();
            for (int row = 0; row < gridData.Rows; row++)
                for (int col = 0; col < gridData.Columns; col++)
                    flatData.Add(gridData.Data[row, col]);
            return flatData;
        }

        private static (string rangeType, string rangeValues) GetRangeConfiguration(double maxValue)
        {
            if (useAutomaticRange)
            {
                double[] thresholds = new double[] {
                    maxValue * 0.025, maxValue * 0.05,
                    maxValue * 0.10, maxValue * 0.35, maxValue * 0.75
                };
                string rangeValues = $"[{string.Join(",", thresholds.Select(t => t.ToString(CultureInfo.InvariantCulture)))}]";
                return ("auto", rangeValues);
            }
            else
            {
                string rangeValues = $"[{string.Join(",", customThresholds.Select(t => t.ToString(CultureInfo.InvariantCulture)))}]";
                return ("fixed", rangeValues);
            }
        }

        private static string BuildJavaScriptData(GridData gridData,
            (double lat, double lng) bottomLeft, (double lat, double lng) topRight,
            List<double> flatData, string rangeType, string rangeValues,
            double zMaxToUse, string timeStampString, bool isMaxContour)
        {
            return $@"{{
                rows: {gridData.Rows},
                cols: {gridData.Columns},
                latMin: {bottomLeft.lat.ToString(CultureInfo.InvariantCulture)},
                lngMin: {bottomLeft.lng.ToString(CultureInfo.InvariantCulture)},
                latMax: {topRight.lat.ToString(CultureInfo.InvariantCulture)},
                lngMax: {topRight.lng.ToString(CultureInfo.InvariantCulture)},
                zMin: {gridData.ZMin.ToString(CultureInfo.InvariantCulture)},
                zMax: {zMaxToUse.ToString(CultureInfo.InvariantCulture)},
                rangeType: '{rangeType}',
                thresholds: {rangeValues},
                timeStamp: '{timeStampString}',
                isMaxContour: {isMaxContour.ToString().ToLower()},
                data: [{string.Join(",", flatData.Select(v => v.ToString(CultureInfo.InvariantCulture)))}]
            }}";
        }

        public static Dictionary<string, double> GetCachedMaxValues()
        {
            return new Dictionary<string, double>(pollutantMaxValues);
        }

        public static void ClearCachedMaxValues()
        {
            pollutantMaxValues.Clear();
        }
    }
}
