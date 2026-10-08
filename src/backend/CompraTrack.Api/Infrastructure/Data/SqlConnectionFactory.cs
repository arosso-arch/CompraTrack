using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;

namespace CompraTrack.Api.Infrastructure.Data;

public interface IDbConnectionFactory
{
    Task<SqlConnection> AbrirAsync(CancellationToken ct = default);
}

public sealed class SqlConnectionFactory(IConfiguration configuration) : IDbConnectionFactory
{
    private readonly string _cadena = configuration.GetConnectionString("CompraTrack")
        ?? throw new InvalidOperationException("Falta la cadena de conexión 'ConnectionStrings:CompraTrack'.");

    /// <summary>
    /// Reintenta la conexión ante errores transitorios. Azure SQL en modo serverless se pausa sin uso y,
    /// mientras se reanuda (hasta ~1 minuto), rechaza conexiones con errores como 40613.
    /// </summary>
    private static readonly SqlRetryLogicBaseProvider Reintentos = SqlConfigurableRetryFactory.CreateExponentialRetryProvider(
        new SqlRetryLogicOption
        {
            NumberOfTries = 6,
            DeltaTime = TimeSpan.FromSeconds(2),
            MaxTimeInterval = TimeSpan.FromSeconds(20),
        });

    public async Task<SqlConnection> AbrirAsync(CancellationToken ct = default)
    {
        var conexion = new SqlConnection(_cadena) { RetryLogicProvider = Reintentos };
        await conexion.OpenAsync(ct);
        return conexion;
    }
}

/// <summary>Permite usar DateOnly en parámetros y resultados de Dapper (columnas DATE).</summary>
public sealed class DateOnlyTypeHandler : SqlMapper.TypeHandler<DateOnly>
{
    public override void SetValue(IDbDataParameter parameter, DateOnly value)
    {
        parameter.DbType = DbType.Date;
        parameter.Value = value.ToDateTime(TimeOnly.MinValue);
    }

    public override DateOnly Parse(object value) => value switch
    {
        DateOnly d => d,
        DateTime dt => DateOnly.FromDateTime(dt),
        _ => throw new InvalidCastException($"No se puede convertir {value.GetType()} a DateOnly.")
    };
}
