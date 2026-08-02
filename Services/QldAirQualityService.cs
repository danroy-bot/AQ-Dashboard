using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net.Http;
using System.Text.Json;
using System.Linq;
using System.Threading.Tasks;

namespace AQ_Dashboard.Services
{
    public class QldAirQualityService
    {
        private readonly HttpClient _httpClient;
        private const string BaseUrl = "https://airquality.des.qld.gov.au/v1";
        private readonly Dictionary<string, List<ParameterInfo>> _parameterCache = new();

        public QldAirQualityService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        // Get all available stations
        public async Task<List<StationInfo>> GetStationsAsync()
        {
            var url = $"{BaseUrl}/stations?pagesize=100&pagenumber=1";
            var response = await _httpClient.GetStringAsync(url);
            var stations = JsonSerializer.Deserialize<List<StationInfo>>(response,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            return stations ?? new List<StationInfo>();
        }

        public async Task<List<ParameterInfo>> GetParametersAsync(string stationId)
        {
            // Return cached parameters if available
            if (_parameterCache.TryGetValue(stationId, out var cached))
            {
                return cached;
            }

            var url = $"{BaseUrl}/stations/{stationId}/parameters?pagesize=100&pagenumber=1";
            var response = await _httpClient.GetStringAsync(url);
            var parameters = JsonSerializer.Deserialize<List<ParameterInfo>>(response,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                ?? new List<ParameterInfo>();

            // Cache for future calls
            _parameterCache[stationId] = parameters;

            return parameters;
        }

        // Get measurements for a station
        public async Task<List<MeasurementData>> GetMeasurementsAsync(string stationId, int pageSize = 100, int pageNumber = 1)
        {
            var url = $"{BaseUrl}/stations/{stationId}/parameters/measurements?pagesize={pageSize}&pagenumber={pageNumber}";
            var response = await _httpClient.GetStringAsync(url);
            var measurements = JsonSerializer.Deserialize<List<MeasurementData>>(response,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            return measurements ?? new List<MeasurementData>();
        }

        // Fetch and merge data for a station
        public async Task<List<AirQualityReading>> FetchStationDataAsync(string stationId, int pages = 10)
        {
            var parameters = await GetParametersAsync(stationId);
            var paramLookup = parameters.ToDictionary(
                p => p.Parameter_Id,
                p => new { p.Abbreviation, p.Units }
            );

            var allMeasurements = new List<MeasurementData>();
            var cutoffDate = DateTime.UtcNow.AddDays(-3);

            for (int page = 1; page <= pages; page++)
            {
                var measurements = await GetMeasurementsAsync(stationId, 1000, page);
                if (measurements.Count == 0) break;

                allMeasurements.AddRange(measurements);

                // Check if we've gone past 7 days
                var oldestInPage = measurements
                    .Where(m => !string.IsNullOrEmpty(m.Date_Measured))
                    .Select(m => {
                        DateTime.TryParse(m.Date_Measured, out var dt);
                        return dt;
                    })
                    .Where(d => d != default)
                    .OrderBy(d => d)
                    .FirstOrDefault();

                if (oldestInPage != default && oldestInPage < cutoffDate)
                    break;
            }

            // Filter to last 7 days
            var readings = allMeasurements
                .Select(m =>
                {
                    var paramInfo = paramLookup.ContainsKey(m.Parameter_Id)
                        ? paramLookup[m.Parameter_Id]
                        : null;

                    return new AirQualityReading
                    {
                        StationId = m.Station_Id,
                        Timestamp = m.Date_Measured,
                        ParameterId = m.Parameter_Id,
                        Abbreviation = paramInfo?.Abbreviation ?? "Unknown",
                        Units = paramInfo?.Units ?? "",
                        Value = m.Mvalue
                    };
                })
                .Where(r =>
                {
                    if (DateTime.TryParse(r.Timestamp, out var dt))
                        return dt >= cutoffDate;
                    return false;
                })
                .ToList();

            return readings;
        }
    }

    // API response classes
    public class StationInfo
    {
        public string Station_Id { get; set; } = "";
        public string Station_Name { get; set; } = "";
        public string Region { get; set; } = "";
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
    }

    public class ParameterInfo
    {
        public int Parameter_Id { get; set; }
        public string Abbreviation { get; set; } = "";
        public string Units { get; set; } = "";
        public string Name { get; set; } = "";
    }

    public class MeasurementData
    {
        public string Station_Id { get; set; } = "";
        public int Parameter_Id { get; set; }
        public string Date_Measured { get; set; } = "";
        public double? Mvalue { get; set; }
    }

    public class AirQualityReading
    {
        public string StationId { get; set; } = "";
        public string Timestamp { get; set; } = "";
        public int ParameterId { get; set; }
        public string Abbreviation { get; set; } = "";
        public string Units { get; set; } = "";
        public double? Value { get; set; }
    }
}
