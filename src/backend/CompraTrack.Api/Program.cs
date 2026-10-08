using System.Security.Claims;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using CompraTrack.Api.Features.Auth;
using CompraTrack.Api.Features.Catalogo;
using CompraTrack.Api.Features.Ordenes;
using CompraTrack.Api.Features.Proveedores;
using CompraTrack.Api.Features.Recepciones;
using CompraTrack.Api.Features.Reportes;
using CompraTrack.Api.Infrastructure.Auth;
using CompraTrack.Api.Infrastructure.Data;
using CompraTrack.Api.Infrastructure.Errors;
using Dapper;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// ---------- Datos ----------
SqlMapper.AddTypeHandler(new DateOnlyTypeHandler());
builder.Services.AddSingleton<IDbConnectionFactory, SqlConnectionFactory>();
builder.Services.AddSingleton(TimeProvider.System);

builder.Services.AddScoped<AuthRepository>();
builder.Services.AddScoped<ProveedorRepository>();
builder.Services.AddScoped<CatalogoRepository>();
builder.Services.AddScoped<OrdenRepository>();
builder.Services.AddScoped<OrdenService>();
builder.Services.AddScoped<RecepcionRepository>();
builder.Services.AddScoped<RecepcionService>();
builder.Services.AddScoped<ReporteRepository>();

// ---------- Autenticación JWT ----------
builder.Services.AddOptions<JwtOptions>()
    .Bind(builder.Configuration.GetSection(JwtOptions.Seccion))
    .Validate(o => o.Clave.Length >= 32, "Jwt:Clave debe tener al menos 32 caracteres.")
    .ValidateOnStart();

var jwt = builder.Configuration.GetSection(JwtOptions.Seccion).Get<JwtOptions>() ?? new JwtOptions();
builder.Services.AddSingleton<TokenService>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;   // conservar "sub", "permiso", etc. tal cual vienen en el token
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = jwt.Emisor,
            ValidAudience = jwt.Audiencia,
            IssuerSigningKey = jwt.ObtenerClaveFirma(),
            NameClaimType = JwtRegisteredClaimNames.UniqueName,
            RoleClaimType = ClaimTypes.Role,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddSingleton<IAuthorizationPolicyProvider, PoliticaPermisoProvider>();
builder.Services.AddAuthorization(o =>
{
    // Todo endpoint requiere sesión salvo que diga [AllowAnonymous].
    o.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
});

// Máximo 10 intentos de login por minuto por IP.
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("login", http => RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "desconocida",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
});

// ---------- API ----------
builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ManejadorGlobalErrores>();
builder.Services.AddOpenApi(o => o.AddDocumentTransformer<EsquemaSeguridadBearer>());

var origenes = builder.Configuration.GetSection("Cors:OrigenesPermitidos").Get<string[]>() ?? [];
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(origenes).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymous();
    app.MapScalarApiReference("/docs", o => o
        .WithTitle("CompraTrack API")
        .AddPreferredSecuritySchemes("Bearer"))
       .AllowAnonymous();

    // Abrir la raíz en el navegador lleva a la documentación en lugar de un 401 en blanco.
    app.MapGet("/", () => Results.Redirect("/docs")).ExcludeFromDescription().AllowAnonymous();
}

// En desarrollo se usa HTTP local; en producción el hosting termina TLS y redirige.
if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { estado = "ok" })).AllowAnonymous();

app.Run();

// Expuesto para los tests de integración (WebApplicationFactory).
public partial class Program;
