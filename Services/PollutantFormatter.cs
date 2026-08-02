using System.Collections.Generic;
using Microsoft.AspNetCore.Components;

namespace AQ_Dashboard.Services
{
    public static class PollutantFormatter
    {
        private static readonly Dictionary<string, string> Labels = new()
        {
            { "PM10", "PM<sub>10</sub>" },
            { "PM2.5", "PM<sub>2.5</sub>" },
            { "NOx", "NO<sub>x</sub>" },
            { "NO2", "NO<sub>2</sub>" },
            { "NO", "NO" },
            { "SO2", "SO<sub>2</sub>" },
            { "PAHs", "PAHs" },
            { "F", "F" },
        };

        public static MarkupString Format(string key)
        {
            return new MarkupString(Labels.TryGetValue(key, out var html) ? html : key);
        }
    }
}
