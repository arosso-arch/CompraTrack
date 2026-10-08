using System.ComponentModel.DataAnnotations;
using CompraTrack.Api.Infrastructure.Data;
using CompraTrack.Api.Infrastructure.Errors;
using Dapper;
using Microsoft.Data.SqlClient;

namespace CompraTrack.Api.Features.Catalogo;

public sealed class TipoProductoDto
{
    public int Id { get; init; }
    public string Nombre { get; init; } = "";
    public bool Activo { get; init; }
}

public sealed class GramajeDto
{
    public int Id { get; init; }
    public short Gramos { get; init; }
}

public sealed class FormatoDto
{
    public int Id { get; init; }
    public string Descripcion { get; init; } = "";
}

public sealed record CrearTipoRequest([Required, StringLength(60, MinimumLength = 2)] string Nombre);
public sealed record CrearGramajeRequest([Range(1, 2000)] short Gramos);
public sealed record CrearFormatoRequest([Required, StringLength(50, MinimumLength = 2)] string Descripcion);

public sealed class CatalogoRepository(IDbConnectionFactory db)
{
    public Task<IReadOnlyList<TipoProductoDto>> ListarTiposAsync(CancellationToken ct) =>
        ConsultarAsync<TipoProductoDto>("SELECT Id, Nombre, Activo FROM dbo.TipoProducto ORDER BY Nombre;", ct);

    public Task<IReadOnlyList<GramajeDto>> ListarGramajesAsync(CancellationToken ct) =>
        ConsultarAsync<GramajeDto>("SELECT Id, Gramos FROM dbo.Gramaje ORDER BY Gramos;", ct);

    public Task<IReadOnlyList<FormatoDto>> ListarFormatosAsync(CancellationToken ct) =>
        ConsultarAsync<FormatoDto>("SELECT Id, Descripcion FROM dbo.Formato ORDER BY Descripcion;", ct);

    public Task<int> CrearTipoAsync(string nombre, CancellationToken ct) =>
        InsertarAsync("INSERT INTO dbo.TipoProducto (Nombre) OUTPUT INSERTED.Id VALUES (@valor);",
                      nombre.Trim(), $"Ya existe el tipo de producto '{nombre.Trim()}'.", ct);

    public Task<int> CrearGramajeAsync(short gramos, CancellationToken ct) =>
        InsertarAsync("INSERT INTO dbo.Gramaje (Gramos) OUTPUT INSERTED.Id VALUES (@valor);",
                      gramos, $"Ya existe el gramaje {gramos} g/m².", ct);

    public Task<int> CrearFormatoAsync(string descripcion, CancellationToken ct) =>
        InsertarAsync("INSERT INTO dbo.Formato (Descripcion) OUTPUT INSERTED.Id VALUES (@valor);",
                      descripcion.Trim(), $"Ya existe el formato '{descripcion.Trim()}'.", ct);

    private async Task<IReadOnlyList<T>> ConsultarAsync<T>(string sql, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        var filas = await cn.QueryAsync<T>(new CommandDefinition(sql, cancellationToken: ct));
        return filas.AsList();
    }

    private async Task<int> InsertarAsync(string sql, object valor, string mensajeDuplicado, CancellationToken ct)
    {
        await using var cn = await db.AbrirAsync(ct);
        try
        {
            return await cn.ExecuteScalarAsync<int>(new CommandDefinition(sql, new { valor }, cancellationToken: ct));
        }
        catch (SqlException ex) when (ex.Number is 2627 or 2601)
        {
            throw new ReglaNegocioException(mensajeDuplicado);
        }
    }
}
