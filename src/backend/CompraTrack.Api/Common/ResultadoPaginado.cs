namespace CompraTrack.Api.Common;

public sealed record ResultadoPaginado<T>(IReadOnlyList<T> Items, int Total, int Pagina, int TamanioPagina)
{
    public int TotalPaginas => TamanioPagina == 0 ? 0 : (int)Math.Ceiling(Total / (double)TamanioPagina);
}
