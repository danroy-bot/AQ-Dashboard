using AQ_Dashboard.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

builder.Services.Configure<AppConfig>(
    builder.Configuration.GetSection("AppConfig"));
builder.Services.AddSingleton(sp =>
    sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<AppConfig>>().Value);

builder.Services.AddHttpClient<QldAirQualityService>(client =>
{
    client.Timeout = TimeSpan.FromMinutes(5);
});

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAntiforgery();

app.MapRazorComponents<AQ_Dashboard.Components.App>()
    .AddInteractiveServerRenderMode();

app.Run();
