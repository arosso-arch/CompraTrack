using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace CompraTrack.Api.Infrastructure.Errors;

/// <summary>
/// Convierte las excepciones en respuestas ProblemDetails (RFC 9457).
/// Los errores inesperados se registran y se responden sin exponer detalles internos.
/// </summary>
public sealed class ManejadorGlobalErrores(
    IProblemDetailsService problemDetails,
    ILogger<ManejadorGlobalErrores> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext http, Exception ex, CancellationToken ct)
    {
        var (status, titulo) = ex switch
        {
            NoEncontradoException  => (StatusCodes.Status404NotFound, "Recurso no encontrado"),
            ReglaNegocioException  => (StatusCodes.Status409Conflict, "Operación no permitida"),
            _                      => (StatusCodes.Status500InternalServerError, "Error inesperado")
        };

        if (status == StatusCodes.Status500InternalServerError)
            logger.LogError(ex, "Error no controlado en {Metodo} {Ruta}", http.Request.Method, http.Request.Path);

        http.Response.StatusCode = status;

        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = http,
            Exception = ex,
            ProblemDetails = new ProblemDetails
            {
                Status = status,
                Title = titulo,
                Detail = status == StatusCodes.Status500InternalServerError
                    ? "Ocurrió un error al procesar la solicitud."
                    : ex.Message
            }
        });
    }
}
