# API de CompraTrack. Se construye desde la raíz del repo (ver docker-compose.yml).

# ---------- Compilación ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS compilacion
WORKDIR /src

# Primero solo los .csproj: si no cambian, Docker reutiliza la capa con los paquetes ya descargados.
COPY src/backend/CompraTrack.Api/CompraTrack.Api.csproj src/backend/CompraTrack.Api/
RUN dotnet restore src/backend/CompraTrack.Api/CompraTrack.Api.csproj

COPY src/backend/CompraTrack.Api/ src/backend/CompraTrack.Api/
RUN dotnet publish src/backend/CompraTrack.Api/CompraTrack.Api.csproj -c Release -o /app --no-restore

# ---------- Ejecución ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=compilacion /app .

# La API corre con un usuario sin privilegios ("app"), que no puede escribir en /app:
# la carpeta de los mails de prueba (modo Carpeta) se crea de antemano y se le asigna.
RUN mkdir -p /app/correos-enviados && chown app:app /app/correos-enviados

# La imagen oficial escucha en el puerto 8080.
USER app
EXPOSE 8080
ENTRYPOINT ["dotnet", "CompraTrack.Api.dll"]
