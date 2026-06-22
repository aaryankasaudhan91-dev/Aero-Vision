"""Geospatial utility functions for spatial operations."""

import math
from typing import List, Dict, Optional


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two points in km."""
    R = 6371.0  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def haversine_filter(records: List[Dict], center_lat: float, center_lon: float,
                     radius_km: float) -> List[Dict]:
    """Filter records within a radius from a center point."""
    filtered = []
    for r in records:
        lat = r.get("latitude") or r.get("centroid_lat")
        lon = r.get("longitude") or r.get("centroid_lon")
        if lat is not None and lon is not None:
            dist = haversine_distance(center_lat, center_lon, lat, lon)
            if dist <= radius_km:
                r["distance_km"] = round(dist, 2)
                filtered.append(r)
    return filtered


def compute_wind_transport(u: float, v: float, hours: float = 24) -> Dict:
    """Compute wind transport distance and direction."""
    speed = math.sqrt(u ** 2 + v ** 2)
    direction = (math.degrees(math.atan2(-u, -v)) + 360) % 360
    distance_km = speed * hours * 3.6  # m/s to km
    return {
        "speed_ms": round(speed, 2),
        "direction_deg": round(direction, 1),
        "transport_distance_km": round(distance_km, 1),
    }


def grid_points(lat_min: float, lat_max: float, lon_min: float, lon_max: float,
                resolution: float = 0.1) -> List[Dict]:
    """Generate grid points covering India at given resolution."""
    points = []
    lat = lat_min
    while lat <= lat_max:
        lon = lon_min
        while lon <= lon_max:
            points.append({"latitude": round(lat, 4), "longitude": round(lon, 4)})
            lon += resolution
        lat += resolution
    return points


# India bounding box (approximate)
INDIA_BOUNDS = {
    "lat_min": 6.0, "lat_max": 38.0,
    "lon_min": 68.0, "lon_max": 98.0,
}

# Key Indian regions for analysis
INDIA_REGIONS = {
    "Indo-Gangetic Plain": {"lat_min": 24.0, "lat_max": 31.0, "lon_min": 75.0, "lon_max": 88.0},
    "Punjab": {"lat_min": 29.5, "lat_max": 32.5, "lon_min": 73.5, "lon_max": 77.0},
    "Haryana": {"lat_min": 27.5, "lat_max": 31.0, "lon_min": 74.5, "lon_max": 77.5},
    "Delhi NCR": {"lat_min": 28.0, "lat_max": 29.0, "lon_min": 76.5, "lon_max": 77.5},
    "Central India": {"lat_min": 19.0, "lat_max": 25.0, "lon_min": 76.0, "lon_max": 84.0},
    "Northeast India": {"lat_min": 22.0, "lat_max": 28.0, "lon_min": 89.0, "lon_max": 97.0},
    "Western India": {"lat_min": 18.0, "lat_max": 24.0, "lon_min": 68.0, "lon_max": 75.0},
    "Southern India": {"lat_min": 8.0, "lat_max": 16.0, "lon_min": 74.0, "lon_max": 80.0},
}

# Biomass burning seasons
BURNING_SEASONS = {
    "kharif": {"months": [10, 11], "description": "Post-Kharif agricultural residue burning"},
    "rabi": {"months": [4, 5], "description": "Post-Rabi agricultural residue burning"},
    "forest_fire": {"months": [3, 4, 5], "description": "Forest fire season (Central/NE India)"},
}
