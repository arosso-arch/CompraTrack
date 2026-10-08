/*
    CompraTrack - Crear la base (solo SQL Server local / LocalDB)
    -----------------------------------------------------------------
    Elimina la base CompraTrack si existe y la crea vacía.
    En Azure SQL Database la base se crea desde el portal o la CLI, no con este script.

    Ejecutar:
        sqlcmd -S "(localdb)\MSSQLLocalDB" -i database\00_crear_base.sql
*/

SET NOCOUNT ON;
USE master;
GO

IF DB_ID('CompraTrack') IS NOT NULL
BEGIN
    ALTER DATABASE CompraTrack SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE CompraTrack;
END
GO

CREATE DATABASE CompraTrack COLLATE Modern_Spanish_CI_AS;
GO

PRINT 'Base CompraTrack creada (vacía).';
GO
