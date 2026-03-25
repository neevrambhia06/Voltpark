import { useEffect, useState, useRef } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {
  getMarkerIcon,
  userLocationIcon,
} from './MapMarkers'
import {
  getTileUrl,
  getTileAttribution,
  haversine,
} from '../utils/geoapify'
import MapPopup from './MapPopup'

// ── FlyTo helper — must be inside MapContainer ──
function FlyToLocation({ target }) {
  const map = useMap()
  useEffect(() => {
    if (!target) return
    map.flyTo(
      [target.lat, target.lng], 14,
      { duration: 1.4 }
    )
  }, [target, map])
  return null
}

// ── FitBounds helper ──
function FitBounds({ locations }) {
  const map = useMap()
  useEffect(() => {
    const bounds = locations
      .filter(l => l.latitude && l.longitude)
      .map(l => [l.latitude, l.longitude])
    
    if (bounds.length > 0) {
      const timer = setTimeout(() => {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [locations, map])
  return null
}

export default function GeoapifyMap({
  locations = [],
  userCoords = null,
  flyTarget = null,
  hoveredId = null,
  onMarkerClick = null,
  height = '100%',
}) {
  return (
    <MapContainer
      center={[19.076, 72.877]}
      zoom={12}
      style={{ height, width: '100%' }}
      zoomControl={true}
    >
      {/* Geoapify Dark Matter tiles */}
      <TileLayer
        url={getTileUrl()}
        attribution={getTileAttribution()}
        maxZoom={20}
      />

      {/* Fly to target */}
      <FlyToLocation target={flyTarget} />

      {/* Fit all markers in view */}
      <FitBounds locations={locations} />

      {/* User location marker */}
      {userCoords && (
        <Marker
          position={[userCoords.lat, userCoords.lng]}
          icon={userLocationIcon}
        />
      )}

      {/* Property markers */}
      {locations
        .filter(l => l.latitude && l.longitude)
        .map(location => {
          const isHovered = location.id === hoveredId
          const distanceKm = userCoords
            ? haversine(
                userCoords.lat, userCoords.lng,
                location.latitude, location.longitude
              ).toFixed(1)
            : null

          return (
            <Marker
              key={location.id}
              position={[
                location.latitude,
                location.longitude,
              ]}
              icon={getMarkerIcon(
                location.type, isHovered
              )}
              eventHandlers={{
                click: () => {
                  if (onMarkerClick) {
                    onMarkerClick(location.id)
                  }
                }
              }}
            >
              <Popup>
                <MapPopup
                  location={location}
                  userCoords={userCoords}
                  distanceKm={distanceKm}
                />
              </Popup>
            </Marker>
          )
        })
      }
    </MapContainer>
  )
}
