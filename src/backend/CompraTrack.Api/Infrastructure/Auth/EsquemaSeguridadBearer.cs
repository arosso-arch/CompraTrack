using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace CompraTrack.Api.Infrastructure.Auth;

/// <summary>Declara el esquema "Bearer" en el documento OpenAPI para poder probar la API con token desde /docs.</summary>
public sealed class EsquemaSeguridadBearer : IOpenApiDocumentTransformer
{
    public Task TransformAsync(OpenApiDocument documento, OpenApiDocumentTransformerContext contexto, CancellationToken ct)
    {
        documento.Components ??= new OpenApiComponents();
        documento.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        documento.Components.SecuritySchemes["Bearer"] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "Token obtenido en POST /api/auth/login"
        };

        documento.Security ??= [];
        documento.Security.Add(new OpenApiSecurityRequirement
        {
            [new OpenApiSecuritySchemeReference("Bearer", documento)] = []
        });

        return Task.CompletedTask;
    }
}
