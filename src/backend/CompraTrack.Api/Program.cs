using System.Security.Claims;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using CompraTrack.Api.Features.Auth;
using CompraTrack.Api.Features.Catalogo;
using CompraTrack.Api.Features.Ordenes;
using CompraTrack.Api.Features.Proveedores;
using CompraTrack.Api.Features.Recepciones;
using CompraTrack.Api.Features.Reportes;
using CompraTrack.Api.Features.Usuarios;
using CompraTrack.Api.Infrastructure;
using CompraTrack.Api.Infrastructure.Auth;
using CompraTrack.Api.Infrastructure.Correo;
using CompraTrack.Api.Infrastructure.Data;
using CompraTrack.Api.Infrastructure.Errors;
using Dapper;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.HttpOverrides;
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
builder.Services.AddScoped<DocumentoOrdenService>();
builder.Services.AddScoped<UsuarioRepository>();
builder.Services.AddScoped<UsuarioService>();
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<VerificadorUsuarioActivo>();

// ---------- PDF y correo ----------
QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
builder.Services.Configure<EmpresaOptions>(builder.Configuration.GetSection(EmpresaOptions.Seccion));
builder.Services.AddOptions<CorreoOptions>()
    .Bind(builder.Configuration.GetSection(CorreoOptions.Seccion))
    .Validate(o => !o.EsSmtp || !string.IsNullOrWhiteSpace(o.Smtp.Servidor), "Correo:Smtp:Servidor es obligatorio en modo Smtp.")
    .ValidateOnStart();

var modoSmtp = builder.Configuration.GetSection(CorreoOptions.Seccion).Get<CorreoOptions>()?.EsSmtp ?? false;
if (modoSmtp) builder.Services.AddSingleton<IEnvioCorreo, EnvioCorreoSmtp>();
else builder.Services.AddSingleton<IEnvioCorreo, EnvioCorreoCarpeta>();

// ---------- Autenticación JWT ----------
builder.Services.AddOptions<JwtOptions>()
    .Bind(builder.Configuration.GetSection(JwtOptions.Seccion))
    .Validate(o => o.Clave.Length >= 32, "Jwt:Clave debe tener al menos 32 caracteres.")
    // La clave de desarrollo es pública (está en el repositorio): fuera de Development hay que configurar una propia.
    .Validate(o => builder.Environment.IsDevelopment() || !o.Clave.StartsWith("SOLO-DESARROLLO", StringComparison.Ordinal),
              "Jwt:Clave de desarrollo detectada fuera de Development: configurá una clave propia (variable de entorno Jwt__Clave).")
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
        // Un token válido no alcanza: el usuario tiene que seguir activo (una baja corta la sesión al instante).
        o.Events = new JwtBearerEvents
        {
            OnTokenValidated = async ctx =>
            {
                var verificador = ctx.HttpContext.RequestServices.GetRequiredService<VerificadorUsuarioActivo>();
                if (ctx.Principal is null || !await verificador.EstaActivoAsync(ctx.Principal.ObtenerUsuarioId(), ctx.HttpContext.RequestAborted))
                    ctx.Fail("El usuario fue dado de baja.");
            }
        };
    });

builder.Services.AddSingleton<IAuthorizationPolicyProvider, PoliticaPermisoProvider>();
builder.Services.AddAuthorization(o =>
{
    // Todo endpoint requiere sesión salvo que diga [AllowAnonymous].
    o.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
});

// Límites por IP: 300 pedidos por minuto en general, 10 intentos de login por minuto y 10 envíos de mail por hora.
static string IpCliente(HttpContext http) => http.Connection.RemoteIpAddress?.ToString() ?? "desconocida";

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(http => RateLimitPartition.GetFixedWindowLimiter(
        IpCliente(http), _ => new FixedWindowRateLimiterOptions { PermitLimit = 300, Window = TimeSpan.FromMinutes(1) }));
    o.AddPolicy("login", http => RateLimitPartition.GetFixedWindowLimiter(
        IpCliente(http), _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
    o.AddPolicy("envio", http => RateLimitPartition.GetFixedWindowLimiter(
        IpCliente(http), _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromHours(1) }));
});

// Si la API se publica detrás de un proxy (Azure, IIS, Nginx), la IP real del cliente y el esquema (https)
// llegan en los headers X-Forwarded-*. Sin esto, todos los clientes compartirían los límites de arriba.
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.KnownIPNetworks.Clear();   // en hostings como Azure el proxy no tiene IPs fijas conocidas
    o.KnownProxies.Clear();
});

// ---------- API ----------
builder.Services.AddControllers(o => o.ModelMetadataDetailsProviders.Add(new MensajesValidacionEnEspanol()))
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddProblemDetails(o => o.CustomizeProblemDetails = ctx =>
{
    if (ctx.ProblemDetails.Status == StatusCodes.Status400BadRequest)
        ctx.ProblemDetails.Title = "Hay datos inválidos";
    else if (ctx.ProblemDetails.Status == StatusCodes.Status403Forbidden)
    {
        ctx.ProblemDetails.Title = "Sin permiso";
        ctx.ProblemDetails.Detail ??= "No tenés permiso para realizar esta operación.";
    }
    else if (ctx.ProblemDetails.Status == StatusCodes.Status401Unauthorized && ctx.ProblemDetails.Title == "Unauthorized")
        ctx.ProblemDetails.Title = "Sesión no válida";   // no pisa el "Credenciales inválidas" del login
});
builder.Services.AddExceptionHandler<ManejadorGlobalErrores>();
builder.Services.AddOpenApi(o => o.AddDocumentTransformer<EsquemaSeguridadBearer>());

var origenes = builder.Configuration.GetSection("Cors:OrigenesPermitidos").Get<string[]>() ?? [];
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(origenes).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseStatusCodePages();

// La documentación interactiva se publica en desarrollo, o en otros entornos si Api:Documentacion = true.
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Api:Documentacion"))
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
