#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CENIGAA · Observatorio de Cobertura — obs-cobertura-huila
=========================================================

Convierte los GeoJSON de departamentos y municipios de Colombia
(DANE, Marco Geoestadístico Nacional MGN2025) en dos GeoJSON limpios y
ligeros, filtrados al Departamento del Huila (código DANE 41), listos
para consumir desde un mapa Leaflet.

Salidas:
    public/data/huila_departamento.geojson   (polígono único, límite dptal.)
    public/data/huila_municipios.geojson     (37 municipios)

Uso:
    python scripts/preparar_geodata_huila.py
    python scripts/preparar_geodata_huila.py \\
        --departamentos ~/Downloads/MGN_ADM_DPTO_POLITICO.geojson \\
        --municipios   ~/Downloads/MGN_ADM_MPIO_GRAFICO.geojson

Requisitos:
    pip install geopandas
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

def _import_geopandas():
    """Importa geopandas en tiempo de ejecución para que --help funcione sin él."""
    try:
        import geopandas as gpd
        return gpd
    except ImportError:
        sys.exit(
            "ERROR: geopandas no está instalado.\n"
            "       Instálalo con:  pip install geopandas\n"
            "       (en macOS suele bastar:  python3 -m pip install geopandas)"
        )


gpd = None  # se inicializa en main() vía _import_geopandas()

# --------------------------------------------------------------------------- #
# Configuración del dominio
# --------------------------------------------------------------------------- #

COD_HUILA = "41"                  # código DANE del Departamento del Huila
N_MUNICIPIOS_HUILA = 37           # municipios esperados (validación)
CRS_OBJETIVO = "EPSG:4326"        # WGS84, exigido por Leaflet
TOLERANCIA_SIMPLIFICACION = 0.001 # grados (~100 m) — forma reconocible a zoom 8
CRS_AREA = "EPSG:3116"            # MAGNA-SIRGAS / Colombia Bogotá zone — metros, para área

# Rutas por defecto (GeoJSON del DANE MGN2025 descargados en ~/Downloads)
DEFAULT_DPTO = Path.home() / "Downloads" / "MGN_ADM_DPTO_POLITICO.geojson"
DEFAULT_MPIO = Path.home() / "Downloads" / "MGN_ADM_MPIO_GRAFICO.geojson"

# Raíz del proyecto = carpeta padre de /scripts
RAIZ_PROYECTO = Path(__file__).resolve().parent.parent
DIR_SALIDA = RAIZ_PROYECTO / "public" / "data"

# Nombres de columna candidatos (varían entre versiones del MGN/DANE/IGAC).
# Se prueban en orden y de forma case-insensitive. MGN2025 usa minúsculas:
#   dpto: dpto_ccdgo, dpto_cnmbr
#   mpio: dpto_ccdgo, mpio_cdpmp (cód. 5 díg.), mpio_cnmbr
CANDIDATOS_COD_DPTO = ["DPTO_CCDGO", "DPTO_CODIGO", "COD_DEPTO", "DPTO", "DPT"]
CANDIDATOS_NOM_DPTO = ["DPTO_CNMBR", "DPTO_NOMBR", "NOM_DPTO", "NOMBRE_DPT", "NOMBRE"]
CANDIDATOS_COD_MPIO = ["MPIO_CDPMP", "MPIO_CCNCT", "COD_MPIO", "MPIO_CODIGO", "DPTOMPIO"]
CANDIDATOS_NOM_MPIO = ["MPIO_CNMBR", "MPIO_NOMBR", "NOM_MPIO", "NOMBRE_MPI", "NOMBRE"]


# --------------------------------------------------------------------------- #
# Utilidades
# --------------------------------------------------------------------------- #

def resolver_columna(gdf, candidatos, descripcion):
    """Devuelve el primer nombre de columna que exista (case-insensitive)."""
    mapa = {c.lower(): c for c in gdf.columns}
    for cand in candidatos:
        if cand.lower() in mapa:
            return mapa[cand.lower()]
    raise KeyError(
        f"No se encontró ninguna columna para «{descripcion}».\n"
        f"  Candidatos probados: {candidatos}\n"
        f"  Columnas disponibles: {list(gdf.columns)}"
    )


def asegurar_wgs84(gdf, etiqueta):
    """Verifica el CRS y reproyecta a EPSG:4326 si hace falta."""
    if gdf.crs is None:
        print(f"  AVISO [{etiqueta}]: el shapefile no declara CRS. "
              f"Se asume {CRS_OBJETIVO}.")
        return gdf.set_crs(CRS_OBJETIVO)

    if gdf.crs.to_epsg() != 4326:
        print(f"  [{etiqueta}] CRS de entrada {gdf.crs.to_string()} "
              f"→ reproyectando a {CRS_OBJETIVO}")
        return gdf.to_crs(CRS_OBJETIVO)

    print(f"  [{etiqueta}] CRS ya es {CRS_OBJETIVO} ✓")
    return gdf


def calcular_area_km2(gdf_wgs84):
    """Área en km² calculada en un CRS métrico (no en grados)."""
    return (gdf_wgs84.to_crs(CRS_AREA).geometry.area / 1_000_000).round(2)


def tamano_kb(ruta: Path) -> float:
    return round(ruta.stat().st_size / 1024, 1)


def cargar_shp(ruta: Path, etiqueta: str):
    if not ruta.exists():
        sys.exit(
            f"ERROR: no se encontró el shapefile de {etiqueta}:\n"
            f"       {ruta}\n"
            f"       Pásalo con --{etiqueta} /ruta/al/archivo.shp"
        )
    print(f"  Leyendo {etiqueta}: {ruta}")
    return gpd.read_file(ruta)


# --------------------------------------------------------------------------- #
# Procesamiento
# --------------------------------------------------------------------------- #

def procesar_departamento(ruta: Path) -> Path:
    print("\n[1/2] Departamento del Huila")
    gdf = cargar_shp(ruta, "departamentos")
    gdf = asegurar_wgs84(gdf, "departamentos")

    col_cod = resolver_columna(gdf, CANDIDATOS_COD_DPTO, "código departamento")
    col_nom = resolver_columna(gdf, CANDIDATOS_NOM_DPTO, "nombre departamento")
    # El código de depto puede venir como '41' o como entero 41.
    huila = gdf[gdf[col_cod].astype(str).str.zfill(2).str[:2] == COD_HUILA].copy()
    if huila.empty:
        sys.exit(f"ERROR: no se encontró el departamento {COD_HUILA} "
                 f"en la columna «{col_cod}».")

    nombre_dpto = str(huila.iloc[0][col_nom]).title()

    # Disolver en un polígono único por si el origen trae multi-features.
    huila = huila.dissolve()
    huila["geometry"] = huila.geometry.simplify(
        TOLERANCIA_SIMPLIFICACION, preserve_topology=True
    )

    salida = huila[["geometry"]].copy()
    salida["nombre"] = nombre_dpto
    salida["cod_dane"] = COD_HUILA

    ruta_out = DIR_SALIDA / "huila_departamento.geojson"
    salida.to_file(ruta_out, driver="GeoJSON")

    bounds = salida.total_bounds  # [minx, miny, maxx, maxy]
    print(f"  Bounding box (lon/lat): "
          f"[{bounds[0]:.4f}, {bounds[1]:.4f}, {bounds[2]:.4f}, {bounds[3]:.4f}]")
    print(f"  CRS de salida: {salida.crs.to_string()}")
    print(f"  Archivo: {ruta_out}  ({tamano_kb(ruta_out)} KB)")
    return ruta_out


def procesar_municipios(ruta: Path) -> Path:
    print("\n[2/2] Municipios del Huila")
    gdf = cargar_shp(ruta, "municipios")
    gdf = asegurar_wgs84(gdf, "municipios")

    col_cod = resolver_columna(gdf, CANDIDATOS_COD_MPIO, "código municipio")
    col_nom = resolver_columna(gdf, CANDIDATOS_NOM_MPIO, "nombre municipio")

    # El código de municipio (5 dígitos) empieza por el código de depto (2).
    cod_str = gdf[col_cod].astype(str).str.zfill(5)
    mpios = gdf[cod_str.str[:2] == COD_HUILA].copy()
    if mpios.empty:
        sys.exit(f"ERROR: no se encontraron municipios del depto {COD_HUILA} "
                 f"en la columna «{col_cod}».")

    mpios["cod_dane"] = cod_str[cod_str.str[:2] == COD_HUILA]
    mpios["nombre"] = mpios[col_nom].astype(str).str.title()

    # El archivo GRAFICO puede traer varias features por municipio (partes,
    # islas). Disolver por código DANE para garantizar un polígono por municipio.
    mpios = mpios.dissolve(by="cod_dane", aggfunc={"nombre": "first"}).reset_index()

    # Área en km² antes de simplificar (más precisa) y en CRS métrico.
    mpios["area_km2"] = calcular_area_km2(mpios)

    # Simplificar para aligerar el GeoJSON.
    mpios["geometry"] = mpios.geometry.simplify(
        TOLERANCIA_SIMPLIFICACION, preserve_topology=True
    )

    # Conservar solo lo esencial para Leaflet.
    salida = mpios[["nombre", "cod_dane", "area_km2", "geometry"]].copy()
    salida = salida.sort_values("nombre").reset_index(drop=True)

    ruta_out = DIR_SALIDA / "huila_municipios.geojson"
    salida.to_file(ruta_out, driver="GeoJSON")

    n = len(salida)
    estado = "✓" if n == N_MUNICIPIOS_HUILA else f"✗ (se esperaban {N_MUNICIPIOS_HUILA})"
    print(f"  Municipios exportados: {n}  {estado}")
    print(f"  CRS de salida: {salida.crs.to_string()}")
    print(f"  Archivo: {ruta_out}  ({tamano_kb(ruta_out)} KB)")
    return ruta_out, n


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #

def main():
    parser = argparse.ArgumentParser(
        description="Convierte GeoJSON del DANE MGN2025 a GeoJSON del Huila (EPSG:4326).",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--departamentos", type=Path, default=DEFAULT_DPTO,
        help="GeoJSON de departamentos de Colombia",
    )
    parser.add_argument(
        "--municipios", type=Path, default=DEFAULT_MPIO,
        help="GeoJSON de municipios de Colombia",
    )
    args = parser.parse_args()

    global gpd
    gpd = _import_geopandas()

    print("=" * 64)
    print("CENIGAA · Preparación de geodata del Huila (GeoJSON → GeoJSON)")
    print("=" * 64)

    DIR_SALIDA.mkdir(parents=True, exist_ok=True)

    ruta_dpto = procesar_departamento(args.departamentos)
    ruta_mpio, n_mpios = procesar_municipios(args.municipios)

    print("\n" + "=" * 64)
    print("RESUMEN DE VALIDACIÓN")
    print("=" * 64)
    print(f"  Sistema de coordenadas : {CRS_OBJETIVO} (WGS84)")
    print(f"  Municipios exportados  : {n_mpios} / {N_MUNICIPIOS_HUILA}")
    print(f"  Tolerancia simplif.    : {TOLERANCIA_SIMPLIFICACION}°")
    print("\nGeoJSON generados:")
    print(f"  • {ruta_dpto}")
    print(f"  • {ruta_mpio}")
    print("=" * 64)

    if n_mpios != N_MUNICIPIOS_HUILA:
        print("\nAVISO: el número de municipios no coincide con 37. "
              "Revisa la fuente de datos o la columna de código.")
        sys.exit(1)


if __name__ == "__main__":
    main()
